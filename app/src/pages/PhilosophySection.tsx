import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Gift, PiggyBank, Sparkles, Vault } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PhilosophySection() {
  const [budgetPool, setBudgetPool] = useState<number>(25000)
  const apy = 0.05 // 5.0% APY default
  const annualTotalYield = budgetPool * apy
  const companyShare = annualTotalYield * 0.7
  const employeeShare = annualTotalYield * 0.3

  return (
    <section
      id="yield-vault"
      className="bg-black py-24 md:py-36 px-6 overflow-hidden relative"
      style={{
        background: 'radial-gradient(ellipse at bottom, rgba(16, 185, 129, 0.03) 0%, transparent 70%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="text-center md:text-left mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Vault className="w-3.5 h-3.5" />
            <span>PuyaTs ARC-56 Smart Contract</span>
          </div>

          <h2
            className="text-4xl md:text-6xl lg:text-7xl text-white tracking-tight mb-4"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            The Yield Vault:{' '}
            <em className="italic text-emerald-400">70 / 30</em>{' '}
            <em className="italic text-white/50">Incentive Alignment</em>
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-2xl leading-relaxed">
            In standard corporate expense systems, employees rush to "spend it or lose it". With Credow’s smart contract vault, unspent funds compound automatically, and both the company and the employee earn on idle payroll.
          </p>
        </motion.div>

        {/* ══════════════════════════════════════════════════════════
            INTERACTIVE SIMULATOR & RESTORED VIDEO 2
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Video 2 & Contract Architecture Specs */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 flex flex-col space-y-6"
          >
            {/* ── RESTORED VIDEO 2 CONTAINER ── */}
            <div className="rounded-3xl overflow-hidden aspect-[4/3] relative border border-white/10 shadow-2xl group">
              <video
                className="w-full h-full object-cover"
                muted
                autoPlay
                loop
                playsInline
                preload="auto"
              >
                <source
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
                  type="video/mp4"
                />
              </video>

              {/* Gradient & Floating Badge */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-4 right-4 liquid-glass rounded-xl p-3 border border-white/15 backdrop-blur-md">
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>CreditFlowYieldVault // BoxMap pos_</span>
                </div>
                <div className="text-xs text-white/80 mt-1 font-sans">
                  Deterministic round-by-round compounding on Algorand
                </div>
              </div>
            </div>

            {/* Spec 1: Box Storage */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  BoxMap&lt;Address, PositionData&gt;
                </span>
              </div>
              <h4 className="text-base text-white font-medium mb-1">Granular Company Vault Positions</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                Positions are individually isolated in Algorand Box Storage, tracking principal deposited, last claim round, and active state without cross-tenant exposure.
              </p>
            </div>

            {/* Spec 2: Eliminating Use-it-or-lose-it */}
            <div className="liquid-glass rounded-2xl p-6 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  csbp: 70% | esbp: 30%
                </span>
              </div>
              <h4 className="text-base text-white font-medium mb-1">Mutual Incentive Alignment</h4>
              <p className="text-white/60 text-xs leading-relaxed">
                Employees earn a 30% yield bonus directly in their wallet for saving company capital, reversing the traditional rushed budget burn.
              </p>
            </div>
          </motion.div>

          {/* Right Column: Interactive Yield Calculator */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 liquid-glass rounded-3xl p-8 md:p-10 border border-white/10 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-medium text-white">Vault Yield Simulator</h3>
                  <p className="text-xs text-white/50 mt-1">Simulate annual yield distribution on unspent corporate allowances</p>
                </div>
                <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  5.00% APY
                </span>
              </div>

              {/* Slider */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-white/60">Unspent Credit Allowance</span>
                  <span className="font-mono text-lg font-bold text-white">
                    ${budgetPool.toLocaleString()} USDC
                  </span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="250000"
                  step="5000"
                  value={budgetPool}
                  onChange={(e) => setBudgetPool(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-white/30 mt-1">
                  <span>$5,000</span>
                  <span>$100,000</span>
                  <span>$250,000</span>
                </div>
              </div>

              {/* Result Breakdown Cards */}
              <div className="space-y-4">
                {/* Total Annual Yield */}
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/70">
                      <PiggyBank className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-white/50">Total Projected Yield</div>
                      <div className="text-[11px] text-white/30">Compounded ~2s per block</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-white">
                      +${annualTotalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">5.0% APY</div>
                  </div>
                </div>

                {/* 70% Company Share */}
                <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Company Treasury (70%)</div>
                      <div className="text-xs text-emerald-400/70">Retained corporate savings</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-emerald-300">
                      ${companyShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-mono">Automated Treasury Split</div>
                  </div>
                </div>

                {/* 30% Employee Share */}
                <div className="bg-purple-500/[0.04] border border-purple-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Employee Bonus (30%)</div>
                      <div className="text-xs text-purple-300/70">Direct wallet payout for saving</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-purple-300">
                      ${employeeShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-purple-400/80 font-mono">Performance Bonus</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>ROUNDS_PER_YEAR = 6,312,000 (~2s block finality)</span>
              </div>
              <Link
                to="/yield"
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                Inspect Live Vault &rarr;
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
