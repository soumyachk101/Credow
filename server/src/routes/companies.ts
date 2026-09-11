import { Router } from 'express'
import { supabaseAdmin } from '../index'
import { z } from 'zod'

const router = Router()

const createCompanySchema = z.object({
 name: z.string().min(1, 'Company name is required').max(100),
 slug: z.string().min(1, 'Slug is required').max(50).regex(/^[a-z0-9-]+$/),
 wallet_address: z.string().optional(),
 x402_config: z.record(z.any()).optional(),
})

// GET /api/companies — Get current user's company
router.get('/', async (req: any, res) => {
 try {
 const { data, error } = await supabaseAdmin
 .from('companies')
 .select('*')
 .eq('owner_id', req.user.id)
 .single()

 if (error) return res.status(404).json({ error: 'No company found' })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// POST /api/companies — Create a company
router.post('/', async (req: any, res) => {
 try {
 const parsed = createCompanySchema.safeParse(req.body)
 if (!parsed.success) return res.status(400).json({ error: parsed.error.errors })

 const { data, error } = await supabaseAdmin
 .from('companies')
 .insert({
 ...parsed.data,
 owner_id: req.user.id,
 })
 .select()
 .single()

 if (error) {
 if (error.code === '23505') return res.status(409).json({ error: 'Company slug already exists' })
 return res.status(500).json({ error: error.message })
 }

 res.status(201).json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// PATCH /api/companies/:id — Update company
router.patch('/:id', async (req: any, res) => {
 try {
 const { id } = req.params
 const { wallet_address, x402_config } = req.body

 const { data, error } = await supabaseAdmin
 .from('companies')
 .update({ wallet_address, x402_config })
 .eq('id', id)
 .eq('owner_id', req.user.id)
 .select()
 .single()

 if (error) return res.status(500).json({ error: error.message })
 res.json({ data })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

export default router
