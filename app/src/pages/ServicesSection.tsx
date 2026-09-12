import { motion } from 'framer-motion'
import {
  Layers,
  Cpu,
  Database,
  Wallet,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Users2,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ServicesSection() {
  const architectures = [
    {
      num: '01',
      title: 'Smart Contract Layer',
      subtitle: 'PuyaTs / TEAL ARC-56',
      desc: 'CreditFlowYieldVault deployed on Algorand TestNet. Manages deposits, round-by-round APY, Box storage positions, and immutable 70/30 split logic.',
      icon: Cpu,
      meta: 'ASA ID: 10,458,941 (USDC)',
    },
    {
      num: '02',
      title: 'Subscriber Engine',
      subtitle: 'algokit-subscriber',
      desc: 'Real-time event monitor catching up via Indexer and following Algod. Dispatches on-chain confirmations and synchronizes local ledger in 2.8s.',
      icon: Layers,
      meta: 'Indexer + Algod Node Sync',
    },
    {
      num: '03',
      title: 'API & Row-Level Security',
      subtitle: 'Express + Supabase RLS',
      desc: 'Company-scoped REST endpoints protecting transactions, allocations, and employees. Cryptographic nonce checks prevent replay attacks on x402 payments.',
      icon: Database,
      meta: 'PostgreSQL + JWT RLS',
    },
    {
      num: '04',
      title: 'Client & Wallet Hub',
      subtitle: 'React 19 + use-wallet-react',
      desc: 'Integrated with Lute, Pera, and WalletConnect. Features persona switching, live USDC balance monitors, and zero-reconciliation claims.',
      icon: Wallet,
      meta: 'Lute / Pera / WalletConnect',
    },
  ]

  const roles = [
    {
      role: 'Company Owner / CFO',
      desc: 'Full visibility into organization treasury, total USDC deposits, accrued yield harvests, and company-wide department pools.',
      icon: Briefcase,
      action: 'Manage Treasury',
      link: '/dashboard',
    },
    {
      role: 'Team Manager',
      desc: 'Set monthly budget allowances for direct reports, approve SaaS allowances, and monitor burn rate in real time.',
      icon: Users2,
      action: 'Allocate Budgets',
      link: '/allocations',
    },
    {
      role: 'Employee / Contributor',
      desc: 'Claim credits via instant x402 wallet signatures for software, travel, or perks. Earn 30% yield bonuses on saved capital.',
      icon: UserCheck,
      action: 'Claim Credits',
      link: '/claims',
    },
  ]

  return (
    <section
      id="architecture"
      className="bg-black py-28 md:py-36 px-6 overflow-hidden relative"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.02) 0%, transparent 70%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="mb-16 md:mb-20 text-center md:text-left"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Layers className="w-3.5 h-3.5" />
            <span>Technical Foundation</span>
          </div>
          <h2
            className="text-4xl md:text-6xl lg:text-7xl text-white tracking-tight"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Enterprise Architecture on <em className="italic text-emerald-400">Algorand</em>
          </h2>
          <p className="mt-4 text-white/60 text-base md:text-lg max-w-2xl">
            A production-grade stack combining Algorand smart contracts, machine-readable HTTP 402 protocols, and authenticated corporate controls.
          </p>
        </motion.div>

        {/* 4 Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 mb-24">
          {architectures.map((arch, i) => {
            const Icon = arch.icon
            return (
              <motion.div
                key={arch.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="liquid-glass liquid-glass-hover rounded-3xl p-8 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-xs text-white/40">{arch.num}</span>
                  </div>

                  <span className="font-mono text-xs text-emerald-400 uppercase tracking-wider block mb-1">
                    {arch.subtitle}
                  </span>
                  <h3
                    className="text-2xl text-white mb-3 tracking-tight font-normal"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {arch.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">
                    {arch.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/40 font-mono">
                  <span>{arch.meta}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Roles Section */}
        <motion.div
          id="roles"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="text-center md:text-left mb-10">
            <h3
              className="text-3xl md:text-5xl text-white tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Built for <em className="italic text-white/60">Every Enterprise Stakeholder</em>
            </h3>
            <p className="mt-2 text-white/50 text-sm md:text-base">
              Granular roles give each team member exactly the capabilities and visibility they need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r, idx) => {
              const Icon = r.icon
              return (
                <div
                  key={r.role}
                  className="liquid-glass rounded-2xl p-6 flex flex-col justify-between border border-white/10 hover:border-emerald-500/30 transition-colors"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h4 className="text-lg font-medium text-white mb-2">{r.role}</h4>
                    <p className="text-white/60 text-xs md:text-sm leading-relaxed mb-6">
                      {r.desc}
                    </p>
                  </div>

                  <Link
                    to={r.link}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>{r.action}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
