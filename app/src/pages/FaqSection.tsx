import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle } from 'lucide-react'

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs = [
    {
      q: 'Why was Credow built on Algorand instead of EVM or Layer-2s?',
      a: 'Corporate micro-claims and per-seat allowances cannot function with $5–$15 gas spikes or unpredictable confirmation times. Algorand provides sub-penny fees (<$0.001), instant 2.8-second deterministic block finality without chain reorgs, and native Circle USDC stability as an Algorand Standard Asset (ASA #10458941).',
    },
    {
      q: 'How does the x402 protocol eliminate manual expense reports?',
      a: 'RFC 9110 HTTP 402 (Payment Required) standardizes machine-readable payments. When an employee spends a credit, the API responds with a structured 402 challenge detailing the USDC amount and nonce. The employee signs the ASA transfer via their connected Lute or Pera wallet. Algokit Subscriber confirms the transaction on-chain in 2.8s, automatically updating both the company balance and employee allowance without invoices, receipts, or manual human audits.',
    },
    {
      q: 'How does the 70/30 Yield Vault benefit both companies and employees?',
      a: 'In traditional organizations, employees are incentivized to exhaust their budgets on low-value items before year-end to avoid budget cuts ("use-it-or-lose-it"). Credow’s smart contract vault (CreditFlowYieldVault) accrues yield on idle balances round-by-round (~2s per round). 70% goes back to the company treasury and 30% goes directly to the employee as a cash bonus reward for saving company capital.',
    },
    {
      q: 'Is the smart contract verified and compliant with Algorand standards?',
      a: 'Yes. The contract is written in PuyaTs (Algorand TypeScript), strictly typed, and compliant with ARC-56 (Algorand Application Binary Interface standard). Company positions are isolated using Algorand Box Storage (BoxMap with pos_ prefix), preventing cross-tenant leakage. It includes safety caps (apy_cap_bps: 15%) and minimum balance dust protection.',
    },
    {
      q: 'Which wallets and environments are supported?',
      a: 'Credow natively integrates use-wallet-react supporting Lute, Pera Wallet, and WalletConnect. It runs live on Algorand TestNet and supports local Algorand sandboxes via KMD.',
    },
  ]

  return (
    <section id="faq" className="bg-black py-24 md:py-32 px-6 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Clear Answers for <em className="italic text-emerald-400">Judges & Teams</em>
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            return (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="liquid-glass rounded-2xl overflow-hidden border border-white/10"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-base md:text-lg font-medium text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/50 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-6 pt-1 text-sm md:text-base text-white/60 leading-relaxed border-t border-white/5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
