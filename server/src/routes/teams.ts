import { Router } from 'express'
import { supabaseAdmin } from '../index'

const router = Router()

// GET /api/teams — List teams for user's company
router.get('/', async (req: any, res) => {
 try {
 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('teams')
 .select('*')
 .eq('company_id', company.id)
 .order('created_at', { ascending: false })

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/teams — Create a team
router.post('/', async (req: any, res) => {
 try {
 const { name, manager_id, budget_pool } = req.body
 if (!name) return res.status(400).json({ error: 'Team name is required' })

 const { data: company } = await supabaseAdmin.from('companies').select('id').eq('owner_id', req.user.id).single()
 if (!company) return res.status(404).json({ error: 'No company found' })

 const { data, error } = await supabaseAdmin
 .from('teams')
 .insert({ company_id: company.id, name, manager_id: manager_id || req.user.id, budget_pool: budget_pool || 0 })
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.status(201).json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// PATCH /api/teams/:id — Update team
router.patch('/:id', async (req: any, res) => {
 try {
 const { id } = req.params
 const updates = req.body
 const { data, error } = await supabaseAdmin.from('teams').update(updates).eq('id', id).select().single()
 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// DELETE /api/teams/:id — Delete team
router.delete('/:id', async (req: any, res) => {
 try {
 const { error } = await supabaseAdmin.from('teams').delete().eq('id', req.params.id)
 if (error) return res.status(500).json({ error: error.message })
 res.json({ success: true })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
