import { Router } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// GET /api/transactions — List transactions with filters
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 let query = supabaseAdmin
 .from('transactions')
 .select('*')
 .eq('company_id', company.id)
 .order('created_at', { ascending: false })

 if (req.query.type) query = query.eq('type', req.query.type)
 if (req.query.allocation_id) query = query.eq('allocation_id', req.query.allocation_id)
 if (req.query.employee_id) query = query.eq('employee_id', req.query.employee_id)

 const { data, error } = await query
 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// GET /api/transactions/summary — Aggregate summary
router.get('/summary', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data: transactions } = await supabaseAdmin
 .from('transactions')
 .select('type, amount')
 .eq('company_id', company.id)

 if (!transactions) return res.json({ summary: {} })

 const summary: Record<string, number> = {}
 for (const tx of transactions) {
 summary[tx.type] = (summary[tx.type] || 0) + tx.amount
 }

 res.json({ summary, total_transactions: transactions.length })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
