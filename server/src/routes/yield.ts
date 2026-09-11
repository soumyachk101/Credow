import { Router } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// GET /api/yield — Get yield accounts for company
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('yield_accounts')
 .select('*, allocation:allocations(*)')
 .eq('company_id', company.id)
 .order('created_at', { ascending: false })

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// GET /api/yield/:id — Get specific yield account
router.get('/:id', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('yield_accounts')
 .select('*, allocation:allocations(*)')
 .eq('id', req.params.id)
 .eq('company_id', company.id)
 .single()

 if (error) return res.status(404).json({ error: 'Yield account not found' })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/yield/calculate — Calculate yield for an allocation
router.post('/calculate', async (req: any, res) => {
 try {
 const { allocation_id } = req.body
 if (!allocation_id) return res.status(400).json({ error: 'allocation_id is required' })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data: allocation } = await supabaseAdmin
 .from('allocations')
 .select('*')
 .eq('id', allocation_id)
 .eq('company_id', company.id)
 .single()

 if (!allocation) return res.status(404).json({ error: 'Allocation not found' })

 const { data: existing } = await supabaseAdmin
 .from('yield_accounts')
 .select('*')
 .eq('allocation_id', allocation_id)
 .single()

 const now = new Date()
 const yieldEligibleBalance = allocation.unclaimed_credits
 const apy = 0.05 // 5% APY default — would come from on-chain contract
 const companyShareRate = 0.7
 const employeeShareRate = 0.3

 const periodDays = (Date.now() - new Date(allocation.created_at).getTime()) / (1000 * 60 * 60 * 24)
 const grossYield = yieldEligibleBalance * apy * (periodDays / 365)
 const companyShare = grossYield * companyShareRate
 const employeeShare = grossYield * employeeShareRate

 if (existing) {
 const { data: updated, error } = await supabaseAdmin
 .from('yield_accounts')
 .update({
 yield_generated: existing.yield_generated + grossYield,
 company_share: existing.company_share + companyShare,
 employee_share: existing.employee_share + employeeShare,
 apy,
 last_calculated_at: now.toISOString(),
 })
 .eq('id', existing.id)
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 return res.json({ data: updated })
 }

 const { data: created, error } = await supabaseAdmin
 .from('yield_accounts')
 .insert({
 allocation_id,
 company_id: company.id,
 employee_id: allocation.employee_id,
 principal: yieldEligibleBalance,
 yield_generated: grossYield,
 company_share: companyShare,
 employee_share: employeeShare,
 strategy: 'algorand_vault',
 apy,
 last_calculated_at: now.toISOString(),
 })
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.status(201).json({ data: created })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/yield/distribute — Distribute yield for an allocation
router.post('/distribute', async (req: any, res) => {
 try {
 const { allocation_id } = req.body
 if (!allocation_id) return res.status(400).json({ error: 'allocation_id is required' })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data: yieldAccount } = await supabaseAdmin
 .from('yield_accounts')
 .select('*')
 .eq('allocation_id', allocation_id)
 .eq('company_id', company.id)
 .single()

 if (!yieldAccount) return res.status(404).json({ error: 'Yield account not found' })

 const { data: allocation } = await supabaseAdmin
 .from('allocations')
 .select('*')
 .eq('id', allocation_id)
 .single()

 if (!allocation) return res.status(404).json({ error: 'Allocation not found' })

 // Distribute employee share to allocation balance
 const newUnclaimed = allocation.unclaimed_credits + yieldAccount.employee_share
 const newYieldEligible = allocation.yield_eligible_balance + yieldAccount.employee_share

 const { error: allocError } = await supabaseAdmin
 .from('allocations')
 .update({
 unclaimed_credits: newUnclaimed,
 yield_eligible_balance: newYieldEligible,
 })
 .eq('id', allocation_id)

 if (allocError) return res.status(500).json({ error: allocError.message })

 // Create distribution transaction
 const { error: txError } = await supabaseAdmin.from('transactions').insert({
 allocation_id,
 company_id: company.id,
 team_id: allocation.team_id,
 employee_id: allocation.employee_id,
 type: 'yield_distribute',
 amount: yieldAccount.employee_share,
 from_entity: 'yield_vault',
 to_entity: `employee:${allocation.employee_id}`,
 metadata: { company_share: yieldAccount.company_share, employee_share: yieldAccount.employee_share },
 })

 if (txError) return res.status(500).json({ error: txError.message })

 // Reset yield account
 const { data: reset, error: resetError } = await supabaseAdmin
 .from('yield_accounts')
 .update({
 yield_generated: 0,
 company_share: 0,
 employee_share: 0,
 last_calculated_at: new Date().toISOString(),
 })
 .eq('id', yieldAccount.id)
 .select()
 .single()

 if (resetError) return res.status(500).json({ error: resetError.message })

 res.json({ data: reset })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
