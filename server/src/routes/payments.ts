import { Router } from 'express'
import algosdk, { Indexer } from 'algosdk'
import { supabaseAdmin } from '../index'

const USDC_ASSET_ID = 31_566_704 // TestNet
const INDEXER = new Indexer(
 process.env.ALGORAND_INDEXER_TOKEN ?? '',
 process.env.ALGORAND_INDEXER_SERVER ?? 'https://testnet-idx.4160.nodely.dev',
 Number(process.env.ALGORAND_INDEXER_PORT ?? 443)
)

const router = Router()

// ---------------------------------------------------------------------------
// POST /api/payments — Create x402 payment (returns 402 if no proof)
// ---------------------------------------------------------------------------
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
 status: 'pending',
 })
 .select()
 .single()

 if (paymentError) return res.status(500).json({ error: paymentError.message })

 if (!payment_proof) {
 // Return 402 — x402 payment required
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
 asset_id: USDC_ASSET_ID,
 network: 'algorand:testnet',
 })
 })
 }

 // Payment proof provided — verify on-chain before confirming
 const verification = await verifyAlgorandPayment({
 txHash: payment_proof.tx_hash,
 expectedFrom: payment_proof.sender_address,
 expectedTo: allocation.company_id, // platform treasury
 expectedAmount: amount,
 expectedAssetId: USDC_ASSET_ID,
 })

 if (!verification.valid) {
 // Update payment record as failed
 await supabaseAdmin
 .from('payment_records')
 .update({ status: 'failed', error_message: verification.error })
 .eq('id', payment.id)

 return res.status(400).json({ error: `Payment verification failed: ${verification.error}` })
 }

 // Verified on-chain — confirm
 const { error: confirmError } = await supabaseAdmin
 .from('payment_records')
 .update({
 status: 'confirmed',
 x402_tx_hash: payment_proof.tx_hash,
 consumed_at: new Date().toISOString(),
 })
 .eq('id', payment.id)

 if (confirmError) return res.status(500).json({ error: confirmError.message })

 res.json({ data: { ...payment, status: 'confirmed', x402_tx_hash: payment_proof.tx_hash } })
 } catch (e: any) {
 res.status(500).json({ error: e.message })
 }
})

// ---------------------------------------------------------------------------
// POST /api/payments/verify — Verify an Algorand transaction on-chain
// ---------------------------------------------------------------------------
router.post('/verify', async (req: any, res) => {
 try {
 const { tx_hash, payment_id } = req.body

 if (!tx_hash) {
 return res.status(400).json({ error: 'tx_hash is required' })
 }

 // Look up the payment record
 const { data: payment } = await supabaseAdmin
 .from('payment_records')
 .select('*')
 .eq('id', payment_id)
 .maybeSingle()

 if (!payment) return res.status(404).json({ error: 'Payment record not found' })

 // Query Algorand testnet for this transaction
 const txn = await INDEXER.transaction(tx_hash).do()

 if (!txn.transaction) {
 return res.json({ valid: false, error: 'Transaction not found on chain', confirmed: false })
 }

 const confirmedRound = txn.transaction['confirmed-round']
 if (!confirmedRound) {
 return res.json({ valid: false, error: 'Transaction not yet confirmed', confirmed: false })
 }

 // Verify it's an ASA transfer (not a payment txn)
 const txnType = txn.transaction['tx-type']
 if (txnType !== 'axfer') {
 return res.json({ valid: false, error: `Expected ASA transfer (axfer), got ${txnType}`, confirmed: true })
 }

 // Verify asset ID
 const assetId = Number(txn.transaction['asset-transfer-transaction']?.['asset-id'] ?? 0)
 if (assetId !== USDC_ASSET_ID) {
 return res.json({ valid: false, error: `Wrong asset: expected USDC (${USDC_ASSET_ID}), got ${assetId}`, confirmed: true })
 }

 // Verify amount
 const transferAmount = Number(txn.transaction['asset-transfer-transaction']?.amount ?? 0)
 const expectedMicro = Math.floor(payment.amount * 1_000_000)
 if (transferAmount < expectedMicro) {
 return res.json({ valid: false, error: `Amount mismatch: expected ${expectedMicro} micro-USDC, got ${transferAmount}`, confirmed: true })
 }

 // Verify sender
 const sender = txn.transaction.sender
 if (payment.employee_id) {
 const { data: emp } = await supabaseAdmin.from('employees').select('wallet_address').eq('id', payment.employee_id).maybeSingle()
 if (emp?.wallet_address && sender !== emp.wallet_address) {
 return res.json({ valid: false, error: `Sender mismatch: ${sender}`, confirmed: true })
 }
 }

 // All checks passed — update payment record
 await supabaseAdmin
 .from('payment_records')
 .update({ status: 'confirmed', x402_tx_hash: tx_hash, consumed_at: new Date().toISOString() })
 .eq('id', payment.id)

 res.json({
 valid: true,
 confirmed: true,
 confirmedRound,
 txHash: tx_hash,
 amount: transferAmount / 1_000_000,
 assetId,
 sender,
 })
 } catch (err: any) {
 if (err.message?.includes('404') || err.message?.includes('not found')) {
 return res.json({ valid: false, error: 'Transaction not found on chain', confirmed: false })
 }
 res.status(500).json({ error: err.message })
 }
})

// ---------------------------------------------------------------------------
// POST /api/payments/:id/retry — Reset payment to pending for retry
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /api/payments — List payment records
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// On-chain verification helper
// ---------------------------------------------------------------------------
async function verifyAlgorandPayment(params: {
 txHash: string
 expectedFrom: string
 expectedTo: string
 expectedAmount: number // USD
 expectedAssetId: number
}): Promise<{ valid: boolean; error?: string }> {
 try {
 const txn = await INDEXER.transaction(params.txHash).do()

 if (!txn.transaction) return { valid: false, error: 'Transaction not found' }
 if (!txn.transaction['confirmed-round']) return { valid: false, error: 'Not confirmed yet' }
 if (txn.transaction['tx-type'] !== 'axfer') return { valid: false, error: 'Not an ASA transfer' }

 const transfer = txn.transaction['asset-transfer-transaction']
 if (Number(transfer['asset-id']) !== params.expectedAssetId) {
 return { valid: false, error: `Wrong asset: ${transfer['asset-id']}` }
 }

 const transferAmount = Number(transfer.amount ?? 0)
 const expectedMicro = Math.floor(params.expectedAmount * 1_000_000)
 if (transferAmount < expectedMicro) {
 return { valid: false, error: `Amount ${transferAmount} < expected ${expectedMicro}` }
 }

 if (txn.transaction.sender !== params.expectedFrom) {
 return { valid: false, error: `Sender mismatch` }
 }

 return { valid: true }
 } catch (err: any) {
 return { valid: false, error: err.message }
 }
}

export default router
