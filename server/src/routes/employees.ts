import { Router } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// GET /api/employees — List employees
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 let query = supabaseAdmin.from('employees').select('*, team:teams(*)').eq('company_id', company.id).order('created_at', { ascending: false })
 if (req.query.team_id) query = query.eq('team_id', req.query.team_id)
 if (req.query.status) query = query.eq('status', req.query.status)

 const { data, error } = await query
 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/employees — Add employee
router.post('/', async (req: any, res) => {
 try {
 const { name, email, role, team_id, wallet_address } = req.body
 if (!name || !email || !role) return res.status(400).json({ error: 'Name, email, and role are required' })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('employees')
 .insert({ company_id: company.id, name, email, role, team_id: team_id || null, wallet_address: wallet_address || null, status: 'active' })
 .select()
 .single()

 if (error) {
 if (error.code === '23505') return res.status(409).json({ error: 'Employee with this email already exists' })
 return res.status(500).json({ error: error.message })
 }
 res.status(201).json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// PATCH /api/employees/:id — Update employee
router.patch('/:id', async (req: any, res) => {
 try {
 const { id } = req.params
 const updates: any = { ...req.body }
 if (updates.status === 'terminated') updates.terminated_at = new Date().toISOString()

 const { data, error } = await supabaseAdmin
 .from('employees')
 .update(updates)
 .eq('id', id)
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// DELETE /api/employees/:id — Terminate employee
router.delete('/:id', async (req: any, res) => {
 try {
 const { data, error } = await supabaseAdmin
 .from('employees')
 .update({ status: 'terminated', terminated_at: new Date().toISOString() })
 .eq('id', req.params.id)
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/employees/bulk — Bulk import from CSV
router.post('/bulk', async (req: any, res) => {
 try {
 const { team_id, employees } = req.body
 if (!employees || !Array.isArray(employees)) return res.status(400).json({ error: 'Employees array is required' })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const results = { success: 0, failed: 0, errors: [] }

 for (const emp of employees.slice(0, 100)) {
 const { error } = await supabaseAdmin.from('employees').insert({
 company_id: company.id,
 team_id: team_id || null,
 name: emp.name,
 email: emp.email,
 role: emp.role || 'Member',
 wallet_address: emp.wallet_address || null,
 status: 'active',
 })
 if (error) {
 results.failed++
 results.errors.push({ email: emp.email, error: error.message })
 } else {
 results.success++
 }
 }

 res.json({ results })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
