import { motion } from 'framer-motion'
import { Zap, Vault, ShieldCheck, Coins, ArrowUpRight, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AboutSection() {
  const bentoCards = [
    {
      icon: Zap,
      badge: 'x402 Protocol',
      title: 'Machine-Readable Micropayments',
      description:
        'Zero reimbursement receipts or manual expense reports. When an employee claims a service credit, our API issues an HTTP 402: Payment Required challenge, signed with Pera or Lute wallet in one click.',
      stat: '2.8s',
      statLabel: 'Atomic Settlement',
      tag: 'Zero Paperwork',
      link: '/claims',
      linkText: 'Test x402 Claim',
    },
    {
      icon: Vault,
      badge: 'ARC-56 Smart Contract',
      title: 'CreditFlow Yield Vault',
      description:
        'Unclaimed allowances never sit idle. They automatically flow into an Algorand smart contract with Box storage positions, compounding yield continuously round-by-round (~2s per round).',
      stat: '5.0%',
      statLabel: 'Default Benchmark APY',
      tag: 'PuyaTs Verified',
      link: '/yield',
      linkText: 'Inspect Vault',
    },
    {
      icon: TrendingUp,
      badge: 'Economic Alignment',
      title: '70 / 30 Mutual Incentive Split',
      description:
        'Accrued yield is programmatically split on-chain: 70% flows back to the corporate treasury, and 30% is deposited directly into the employee’s wallet as a performance savings bonus.',
      stat: '70% / 30%',
      statLabel: 'Treasury / Employee Split',
      tag: 'Aligned Incentives',
      link: '/allocations',
      linkText: 'View Allocations',
    },
    {
      icon: Coins,
      badge: 'Algorand Foundation',
      title: 'Native Circle USDC Stability',
      description:
        'Denominated in native Circle USDC (ASA ID: 10458941). Zero slippage, enterprise predictability, sub-penny gas (<$0.001), and deterministic block finality without chain reorgs.',
      stat: '<$0.001',
      statLabel: 'Average Network Fee',
      tag: 'ASA #10458941',
      link: '/dashboard',
      linkText: 'Explore Platform',
    },
  ]

  return (
    <section
      id="features"
      className="bg-black pt-28 md:pt-36 pb-20 md:pb-28 px-6 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at top, rgba(16, 185, 129, 0.04) 0%, transparent 65%)',
      }}
    >
      {/* Background glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center md:text-left mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>The Credow Breakthrough</span>
          </div>

          <h2
            className="text-4xl md:text-6xl lg:text-7xl text-white leading-[1.15] tracking-tight max-w-4xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Over <em className="italic text-emerald-400">$1 Trillion</em> in corporate allowances sits completely dead.
          </h2>

          <p className="mt-5 text-white/60 text-base md:text-lg max-w-2xl leading-relaxed">
            Traditional corporate cards force companies to endure 20-hour reconciliation cycles while unspent budgets decay in spreadsheets. Credow transforms idle allowances into active, yield-bearing capital on Algorand.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {bentoCards.map((card, i) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="liquid-glass liquid-glass-hover rounded-3xl p-8 md:p-10 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/40 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                        {card.badge}
                      </span>
                    </div>
                  </div>

                  {/* Title & Desc */}
                  <h3
                    className="text-2xl md:text-3xl text-white mb-3 tracking-tight font-normal"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {card.title}
                  </h3>
                  <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8">
                    {card.description}
                  </p>
                </div>

                {/* Bottom Stat & Link */}
                <div className="pt-6 border-t border-white/10 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-2xl md:text-3xl font-semibold text-white tracking-tight font-mono">
                      {card.stat}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider mt-0.5">
                      {card.statLabel}
                    </div>
                  </div>

                  <Link
                    to={card.link}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>{card.linkText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
