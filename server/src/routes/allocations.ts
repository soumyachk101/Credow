import { Router } from 'express'
import { supabaseAdmin } from '../index'
import { z } from 'zod'

const router = Router()

const createAllocationSchema = z.object({
 team_id: z.string().uuid().optional(),
 employee_id: z.string().uuid(),
 total_credits: z.number().positive(),
 period_start: z.string().datetime().optional(),
 period_end: z.string().datetime().optional(),
})

// GET /api/allocations — List allocations for current company
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 let query = supabaseAdmin
 .from('allocations')
 .select('*, employee:employees(*), team:teams(*)')
 .eq('company_id', company.id)
 .order('created_at', { ascending: false })

 if (req.query.employee_id) query = query.eq('employee_id', req.query.employee_id)
 if (req.query.team_id) query = query.eq('team_id', req.query.team_id)
 if (req.query.status) query = query.eq('status', req.query.status)

 const { data, error } = await query
 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/allocations — Create allocation + transaction
router.post('/', async (req: any, res) => {
 try {
 const parsed = createAllocationSchema.safeParse(req.body)
 if (!parsed.success) return res.status(400).json({ error: parsed.error.errors })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const now = new Date().toISOString()
 const periodStart = parsed.data.period_start || now
 const periodEnd = parsed.data.period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

 const { data: allocation, error: allocError } = await supabaseAdmin
 .from('allocations')
 .insert({
 company_id: company.id,
 ...parsed.data,
 period_start: periodStart,
 period_end: periodEnd,
 claimed_credits: 0,
 unclaimed_credits: parsed.data.total_credits,
 yield_eligible_balance: 0,
 status: 'active',
 })
 .select()
 .single()

 if (allocError) return res.status(500).json({ error: allocError.message })

 // Create immutable transaction record
 const { error: txError } = await supabaseAdmin.from('transactions').insert({
 allocation_id: allocation.id,
 company_id: company.id,
 team_id: parsed.data.team_id || null,
 employee_id: parsed.data.employee_id,
 type: 'allocate',
 amount: parsed.data.total_credits,
 from_entity: 'company',
 to_entity: `employee:${parsed.data.employee_id}`,
 metadata: { period_start: periodStart, period_end: periodEnd },
 })

 if (txError) {
 // Rollback allocation if transaction fails
 await supabaseAdmin.from('allocations').delete().eq('id', allocation.id)
 return res.status(500).json({ error: txError.message })
 }

 res.status(201).json({ data: allocation })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/allocations/:id/claim — Claim credits for service (atomic)
router.post('/:id/claim', async (req: any, res) => {
 try {
 const { id } = req.params
 const { service_id, service_name, amount, nonce } = req.body

 if (!service_id || !amount || amount <= 0) {
 return res.status(400).json({ error: 'service_id and positive amount are required' })
 }

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 // Get allocation with lock
 const { data: allocation, error: allocError } = await supabaseAdmin
 .from('allocations')
 .select('*')
 .eq('id', id)
 .eq('company_id', company.id)
 .single()

 if (allocError || !allocation) return res.status(404).json({ error: 'Allocation not found' })
 if (allocation.status !== 'active') return res.status(400).json({ error: 'Allocation is not active' })

 // Idempotency check
 const idempotencyKey = `${id}:${service_id}:${nonce || Date.now()}`
 const { data: existing } = await supabaseAdmin
 .from('payment_records')
 .select('id')
 .eq('allocation_id', id)
 .eq('service_id', service_id)
 .eq('x402_tx_hash', idempotencyKey)
 .maybeSingle()

 if (existing) return res.json({ data: { idempotent: true, payment_id: existing.id } })

 // Check sufficient balance
 if (allocation.unclaimed_credits < amount) {
 return res.status(400).json({ error: 'Insufficient unclaimed credits' })
 }

 const newUnclaimed = allocation.unclaimed_credits - amount
 const newClaimed = allocation.claimed_credits + amount

 // Update allocation
 const { data: updated, error: updateError } = await supabaseAdmin
 .from('allocations')
 .update({ unclaimed_credits: newUnclaimed, claimed_credits: newClaimed })
 .eq('id', id)
 .select()
 .single()

 if (updateError) return res.status(500).json({ error: updateError.message })

 // Create transaction record
 const { data: transaction, error: txError } = await supabaseAdmin
 .from('transactions')
 .insert({
 allocation_id: id,
 company_id: company.id,
 team_id: allocation.team_id,
 employee_id: allocation.employee_id,
 type: 'claim',
 amount,
 from_entity: `employee:${allocation.employee_id}`,
 to_entity: `service:${service_id}`,
 metadata: { service_name, nonce: idempotencyKey },
 })
 .select()
 .single()

 if (txError) {
 // Rollback allocation
 await supabaseAdmin.from('allocations').update({
 unclaimed_credits: allocation.unclaimed_credits,
 claimed_credits: allocation.claimed_credits,
 }).eq('id', id)
 return res.status(500).json({ error: txError.message })
 }

 // Create payment record
 const { data: payment, error: paymentError } = await supabaseAdmin
 .from('payment_records')
 .insert({
 allocation_id: id,
 company_id: company.id,
 employee_id: allocation.employee_id,
 service_id,
 service_name: service_name || service_id,
 amount,
 x402_tx_hash: idempotencyKey,
 status: 'pending',
 })
 .select()
 .single()

 if (paymentError) {
 await supabaseAdmin.from('transactions').delete().eq('id', transaction.id)
 await supabaseAdmin.from('allocations').update({
 unclaimed_credits: allocation.unclaimed_credits,
 claimed_credits: allocation.claimed_credits,
 }).eq('id', id)
 return res.status(500).json({ error: paymentError.message })
 }

 res.status(201).json({ data: { allocation: updated, transaction, payment } })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// PATCH /api/allocations/:id — Update allocation
router.patch('/:id', async (req: any, res) => {
 try {
 const { id } = req.params
 const { status } = req.body

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('allocations')
 .update({ status })
 .eq('id', id)
 .eq('company_id', company.id)
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// DELETE /api/allocations/:id — Terminate allocation
router.delete('/:id', async (req: any, res) => {
 try {
 const { data: allocation } = await supabaseAdmin
 .from('allocations')
 .select('*')
 .eq('id', req.params.id)
 .single()

 if (!allocation) return res.status(404).json({ error: 'Allocation not found' })

 // Return unclaimed credits via transaction
 if (allocation.unclaimed_credits > 0) {
 await supabaseAdmin.from('transactions').insert({
 allocation_id: allocation.id,
 company_id: allocation.company_id,
 team_id: allocation.team_id,
 employee_id: allocation.employee_id,
 type: 'reclaim',
 amount: allocation.unclaimed_credits,
 from_entity: `employee:${allocation.employee_id}`,
 to_entity: 'company',
 metadata: { reason: 'allocation_terminated' },
 })
 }

 const { error } = await supabaseAdmin
 .from('allocations')
 .update({ status: 'terminated' })
 .eq('id', req.params.id)

 if (error) return res.status(500).json({ error: error.message })
 res.json({ success: true })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
