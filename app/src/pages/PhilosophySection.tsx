import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Gift, Percent, PiggyBank, ShieldCheck, Sparkles, TrendingUp, Vault } from 'lucide-react'
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
      className="bg-black py-28 md:py-36 px-6 overflow-hidden relative"
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

        {/* Interactive Simulator & On-Chain Architecture Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Yield Calculator */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 liquid-glass rounded-3xl p-8 md:p-10 border border-white/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-medium text-white">Vault Yield Simulator</h3>
                <p className="text-xs text-white/50 mt-1">Simulate annual yield distribution on idle allowances</p>
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
                    <div className="text-xs text-white/30">Compounded ~2s per block</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-white">
                    +${annualTotalYield.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-emerald-400">5.0% APY</div>
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
                  <div className="text-[10px] text-emerald-400/80">Automated Treasury Split</div>
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
                    <div className="text-xs text-purple-300/70">Direct wallet bonus for saving</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-purple-300">
                    ${employeeShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-purple-400/80">Distributed to Claimants</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/40">Verified on Algorand TestNet</span>
              <Link
                to="/yield"
                className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
              >
                Open Yield Dashboard &rarr;
              </Link>
            </div>
          </motion.div>

          {/* Right Column: Contract Architecture Specifications */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 flex flex-col justify-between space-y-6"
          >
            {/* Spec 1: Box Storage */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  BoxMap&lt;Address, PositionData&gt;
                </span>
                <span className="text-xs text-white/40">Key Prefix: pos_</span>
              </div>
              <h4 className="text-xl text-white font-medium mb-2">Granular Company Vault Positions</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Positions are individually isolated in Algorand Box Storage. Each position tracks principal deposited, last deposit round, last claim round, and active state without cross-tenant vulnerability.
              </p>
            </div>

            {/* Spec 2: Deterministic Round-by-Round APY */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  ROUNDS_PER_YEAR = 6,312,000
                </span>
                <span className="text-xs text-white/40">~2s Block Time</span>
              </div>
              <h4 className="text-xl text-white font-medium mb-2">Continuous Algorand Yield Accrual</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Yield accrues on every newly finalized round. Admin caps (`apy_cap_bps: 1500` / 15%) and minimum position limits (`min_balance: 500,000` microUSDC = $0.50) prevent dust exploitation.
              </p>
            </div>

            {/* Spec 3: Mutual Incentive Logic */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-mono text-xs text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  csbp = 7000 | esbp = 3000
                </span>
                <span className="text-xs text-white/40">Immutable Rule</span>
              </div>
              <h4 className="text-xl text-white font-medium mb-2">Eliminating the "Use-It-Or-Lose-It" Trap</h4>
              <p className="text-white/60 text-sm leading-relaxed">
                Employees are traditionally penalized for underspending because their department budget gets slashed. Credow reverses this: employees earn a cash bonus from the yield vault for being fiscally responsible.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
