import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { createClient } from '@supabase/supabase-js'
import companiesRouter from './routes/companies'
import teamsRouter from './routes/teams'
import employeesRouter from './routes/employees'
import allocationsRouter from './routes/allocations'
import yieldRouter from './routes/yield'
import transactionsRouter from './routes/transactions'
import paymentsRouter from './routes/payments'

const app = express()

// Middleware
app.use(cors({ origin: true, credentials: true }))
app.use(morgan('dev'))
app.use(express.json({ limit: '10mb' }))

// Supabase admin client
export const supabaseAdmin = createClient(
 process.env.SUPABASE_URL!,
 process.env.SUPABASE_SERVICE_ROLE_KEY!,
 { auth: { persistSession: false } }
)

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
 const authHeader = req.headers.authorization
 if (!authHeader?.startsWith('Bearer ')) {
 return res.status(401).json({ error: 'Missing or invalid authorization header' })
 }
 const token = authHeader.slice(7)
 supabaseAdmin.auth.getUser(token).then(({ data, error }) => {
 if (error || !data.user) {
 return res.status(401).json({ error: 'Invalid token' })
 }
 req.user = data.user
 next()
 }).catch(() => res.status(401).json({ error: 'Auth failed' }))
}

// API routes
app.use('/api/companies', authMiddleware, companiesRouter)
app.use('/api/teams', authMiddleware, teamsRouter)
app.use('/api/employees', authMiddleware, employeesRouter)
app.use('/api/allocations', authMiddleware, allocationsRouter)
app.use('/api/yield', authMiddleware, yieldRouter)
app.use('/api/transactions', authMiddleware, transactionsRouter)
app.use('/api/payments', authMiddleware, paymentsRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`CreditFlow API running on port ${PORT}`))
