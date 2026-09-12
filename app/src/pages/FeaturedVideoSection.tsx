import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Code2, Cpu, FileTerminal, ShieldAlert, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function FeaturedVideoSection() {
  const [activeTab, setActiveTab] = useState<'payload' | 'tx' | 'lifecycle'>('payload')

  const steps = [
    {
      num: '01',
      title: 'Allocation Stream',
      detail: 'Manager allocates monthly USDC credits to employees via Algorand TestNet.',
    },
    {
      num: '02',
      title: 'HTTP 402 Challenge',
      detail: 'Merchant or service triggers a machine-readable 402 Payment Required header with nonce & ASA ID.',
    },
    {
      num: '03',
      title: 'Wallet Signature',
      detail: 'Employee confirms with Lute or Pera wallet; atomic ASA transfer is broadcasted.',
    },
    {
      num: '04',
      title: 'Indexer Settlement',
      detail: 'Algokit Subscriber verifies confirmed transaction in 2.8s; unspent balances continue earning yield.',
    },
  ]

  const mockPayload = `// 1. Initial Request
POST /api/payments
{ "allocation_id": "alloc-94812", "service": "Cursor Pro", "amount": 20 }

// 2. Machine-Readable HTTP 402 Response
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "Payment Required",
  "data": {
    "payment_id": "pay_88f21bc9e4",
    "amount": "20.000000",
    "currency": "USDC",
    "asset_id": 10458941,
    "network": "algorand:testnet",
    "recipient": "CREDOWN7XQZ2LVMK99B...",
    "nonce": "7c9e1e2d4f8a",
    "expires_at": "2026-09-12T18:30:00Z"
  }
}`

  const mockTx = `// 3. Algorand Atomic Settlement (TestNet)
{
  "txid": "7WZQLO5P2HK66E7C4M3VNP...",
  "confirmed_round": 45192834,
  "tx_type": "axfer",
  "asset_transfer": {
    "asset_id": 10458941, // Circle USDC ASA
    "amount": 20000000,   // 20 USDC (6 decimals)
    "sender": "EMPLOYEE_LUTE_WALLET_ADDR",
    "receiver": "CREDOWN7XQZ2LVMK99B..."
  },
  "fee": 1000,            // 0.001 ALGO (<$0.0002)
  "consensus_time": "2.8s",
  "status": "FINALIZED"
}`

  return (
    <section id="how-it-works" className="bg-black pt-12 md:pt-16 pb-24 md:pb-36 px-6 overflow-hidden relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center md:text-left mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span>Under The Hood</span>
          </div>

          <h2
            className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.15] tracking-tight max-w-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Turning <em className="italic text-emerald-400">HTTP 402</em> into an instant checkout rail.
          </h2>
          <p className="mt-4 text-white/60 text-base md:text-lg max-w-2xl">
            RFC 9110 reserved HTTP 402 for "Payment Required" over 25 years ago. Credow turns it into a real-time corporate settlement protocol running on Algorand.
          </p>
        </motion.div>

        {/* Video & Terminal Interactive Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Lifecycle Steps */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-5 flex flex-col justify-between space-y-4"
          >
            {steps.map((step, idx) => (
              <div
                key={step.num}
                className="liquid-glass rounded-2xl p-5 md:p-6 relative group hover:border-emerald-500/40 transition-all duration-300"
              >
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs font-bold text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <h4 className="text-white font-medium text-base mb-1">{step.title}</h4>
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-2">
              <Link
                to="/claims"
                className="liquid-glass liquid-glass-hover rounded-2xl px-6 py-4 flex items-center justify-between text-white group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Try Live x402 Claim Demo</div>
                    <div className="text-xs text-white/40">Test with mock or connected wallet</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Code & Proof Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-7 liquid-glass rounded-3xl overflow-hidden flex flex-col border border-white/10"
          >
            {/* Terminal Header */}
            <div className="px-5 py-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 font-mono text-xs text-white/40">x402-engine // Algorand TestNet</span>
              </div>

              {/* Selector Tabs */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab('payload')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                    activeTab === 'payload'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  HTTP 402
                </button>
                <button
                  onClick={() => setActiveTab('tx')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                    activeTab === 'tx'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  Algorand Tx
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-6 flex-1 font-mono text-xs md:text-sm overflow-x-auto bg-black/70 text-white/80 leading-relaxed">
              <pre className="text-emerald-400/90 whitespace-pre">
                {activeTab === 'payload' ? mockPayload : mockTx}
              </pre>
            </div>

            {/* Terminal Footer */}
            <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs text-white/40">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Deterministic Verification via Algorand Indexer</span>
              </div>
              <span className="font-mono text-emerald-400">2.8s finality</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
