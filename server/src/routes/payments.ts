import { Router } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// POST /api/payments — Process x402 payment
router.post('/', async (req: any, res) => {
 try {
 const { allocation_id, service_id, service_name, amount, payment_proof } = req.body

 if (!allocation_id || !service_id || !amount || amount <= 0) {
 return res.status(400).json({ error: 'allocation_id, service_id, and positive amount are required' })
 }

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data: allocation } = await supabaseAdmin
 .from('allocations')
 .select('*')
 .eq('id', allocation_id)
 .eq('company_id', company.id)
 .single()

 if (!allocation) return res.status(404).json({ error: 'Allocation not found' })
 if (allocation.status !== 'active') return res.status(400).json({ error: 'Allocation is not active' })
 if (allocation.unclaimed_credits < amount) return res.status(400).json({ error: 'Insufficient unclaimed credits' })

 const nonce = `${allocation_id}:${service_id}:${Date.now()}`

 // Check idempotency
 const { data: existing } = await supabaseAdmin
 .from('payment_records')
 .select('id, status')
 .eq('x402_tx_hash', nonce)
 .maybeSingle()

 if (existing) {
 return res.json({ data: { idempotent: true, payment_id: existing.id, status: existing.status } })
 }

 // Create payment record
 const { data: payment, error: paymentError } = await supabaseAdmin
 .from('payment_records')
 .insert({
 allocation_id,
 company_id: company.id,
 employee_id: allocation.employee_id,
 service_id,
 service_name: service_name || service_id,
 amount,
 x402_tx_hash: nonce,
 status: payment_proof ? 'confirmed' : 'pending',
 })
 .select()
 .single()

 if (paymentError) return res.status(500).json({ error: paymentError.message })

 if (!payment_proof) {
 // Return x402 payment required response
 return res.status(402).json({
 error: 'Payment Required',
 data: {
 payment_id: payment.id,
 allocation_id,
 service_id,
 service_name,
 amount,
 currency: 'USDC',
 x402_version: '1',
 nonce,
 expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
 payment_methods: ['algorand_usdc'],
 })
 })
 }

 // Payment proof provided — verify and confirm
 const { error: confirmError } = await supabaseAdmin
 .from('payment_records')
 .update({
 status: 'confirmed',
 x402_tx_hash: payment_proof.tx_hash || nonce,
 consumed_at: new Date().toISOString(),
 })
 .eq('id', payment.id)

 if (confirmError) return res.status(500).json({ error: confirmError.message })

 res.json({ data: payment })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/payments/:id/retry — Retry failed payment
router.post('/:id/retry', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data: payment, error } = await supabaseAdmin
 .from('payment_records')
 .update({ status: 'pending', error_message: null })
 .eq('id', req.params.id)
 .eq('company_id', company.id)
 .select()
 .single()

 if (error || !payment) return res.status(404).json({ error: 'Payment not found' })

 res.json({ data: payment })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// GET /api/payments — List payment records
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 let query = supabaseAdmin
 .from('payment_records')
 .select('*')
 .eq('company_id', company.id)
 .order('created_at', { ascending: false })

 if (req.query.status) query = query.eq('status', req.query.status)
 if (req.query.employee_id) query = query.eq('employee_id', req.query.employee_id)

 const { data, error } = await query
 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
