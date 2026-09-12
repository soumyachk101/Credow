import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useWallet } from '@txnlab/use-wallet-react'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import { fetchAccountBalance, getUsdcBalance, isOptedInUsdc } from '@/utils/algorandBalance'
import { USDC_ASSET_ID } from '@/utils/algorandPayment'
import {
  LayoutDashboard,
  Coins,
  Zap,
  TrendingUp,
  Users,
  UserCheck,
  Building2,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Menu,
  X,
  RefreshCw,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserRole } from '@/lib/types'

// ── Custom Professional SVGs (Zero Emojis) ───────────────────────────────────

function CreditFlowLogoMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 6L7 9V15L12 18L17 15V9L12 6Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

function AlgorandIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M13.43 2.14L9.83 12.38H6.55L12.31 0.48H15.93L13.43 7.58H16.27L14.77 11.83H11.93L8.03 23.52H4.41L13.43 2.14Z" />
    </svg>
  )
}

function UsdcIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12.75 6.5V8M12.75 16V17.5M10.25 14.5C10.25 15.6 11.15 16 12.5 16C13.85 16 14.75 15.35 14.75 14.2C14.75 12.55 11.25 12.1 11.25 10.8C11.25 9.8 11.95 9.2 12.75 9.2C13.85 9.2 14.45 9.75 14.5 10.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function EmployeePersonaIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M14 16.5V15C14 13.3431 12.6569 12 11 12H5C3.34315 12 2 13.3431 2 15V16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M14.5 7.5L16 9L18.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function OwnerPersonaIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M3 6.5C3 5.39543 3.89543 4.5 5 4.5H15C16.1046 4.5 17 5.39543 17 6.5V14.5C17 15.6046 16.1046 16.5 15 16.5H5C3.89543 16.5 3 15.6046 3 14.5V6.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7.5 4.5V3.5C7.5 2.67157 8.17157 2 9 2H11C11.8284 2 12.5 2.67157 12.5 3.5V4.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8.5H17"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="10" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

interface NavItem {
  to: string
  label: string
  icon: any
  badge?: string
}

export default function Sidebar() {
  const { user, logout, switchRole } = useAuthStore()
  const { activeAddress } = useWallet()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [balance, setBalance] = useState<{ algo: number; usdc: number; isOptedIn: boolean } | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const role: UserRole = user?.role || 'employee'
  const isEmployee = role === 'employee'

  const loadBalance = async () => {
    if (!activeAddress) {
      setBalance(null)
      return
    }
    setLoadingBalance(true)
    try {
      const acct = await fetchAccountBalance(activeAddress)
      setBalance({
        algo: acct.algoAvailable / 1_000_000,
        usdc: getUsdcBalance(acct),
        isOptedIn: isOptedInUsdc(acct),
      })
    } catch {
      // silent
    } finally {
      setLoadingBalance(false)
    }
  }

  useEffect(() => {
    loadBalance()
    const interval = setInterval(loadBalance, 25000)
    return () => clearInterval(interval)
  }, [activeAddress])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const copyAddress = () => {
    if (!activeAddress) return
    navigator.clipboard.writeText(activeAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getNavLinks = (): NavItem[] => {
    if (role === 'super_admin') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/companies', label: 'Companies', icon: Building2 },
        { to: '/teams', label: 'Teams', icon: Users },
        { to: '/claims', label: 'Claims & Settlement', icon: Zap },
      ]
    }
    if (role === 'company_owner' || role === 'manager') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/allocations', label: 'Credit Allocations', icon: Coins },
        { to: '/claims', label: 'Claims & Settlement', icon: Zap },
        { to: '/yield', label: 'Yield Vault', icon: TrendingUp },
        { to: '/teams', label: 'Teams Management', icon: Users },
        { to: '/employees', label: 'Personnel', icon: UserCheck },
      ]
    }
    return [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/claims', label: 'Claim Credits', icon: Zap },
    ]
  }

  const navLinks = getNavLinks()

  const sidebarContent = (
    <div className="flex flex-col h-full text-white">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:border-emerald-400/60 transition-all shadow-[0_0_20px_rgba(16,185,129,0.12)]">
            <CreditFlowLogoMark className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white font-mono">Credow</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] rounded font-mono font-medium tracking-wide">
                AVM
              </span>
            </div>
            <p className="text-[10px] text-white/40 flex items-center gap-1.5 mt-0.5">
              <AlgorandIcon className="w-2.5 h-2.5 text-emerald-400" />
              <span>Algorand TestNet</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </p>
          </div>
        </Link>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-white/40 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
        {/* Role Switcher (Custom SVGs, No Emojis) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 font-mono">
              Role Persona
            </span>
            <span className="text-[10px] text-white/60 font-mono capitalize">
              {role.replace('_', ' ')}
            </span>
          </div>
          <div className="bg-white/[0.03] p-1 rounded-xl flex items-center gap-1 border border-white/5">
            <button
              onClick={() => switchRole('employee', { id: 'emp-demo', name: 'Alice Employee', email: 'alice@test.com' })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                isEmployee
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <EmployeePersonaIcon className={`w-3.5 h-3.5 ${isEmployee ? 'text-emerald-400' : 'text-white/40'}`} />
              <span>Employee</span>
            </button>
            <button
              onClick={() => switchRole('company_owner')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                !isEmployee
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <OwnerPersonaIcon className={`w-3.5 h-3.5 ${!isEmployee ? 'text-emerald-400' : 'text-white/40'}`} />
              <span>Executive</span>
            </button>
          </div>
        </div>

        {/* Wallet Hub */}
        <div className="liquid-glass rounded-2xl p-3.5 space-y-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Algorand Wallet</span>
            </div>
            {activeAddress && (
              <button
                onClick={loadBalance}
                disabled={loadingBalance}
                className="text-white/40 hover:text-white transition-colors p-0.5"
                title="Refresh on-chain balance"
              >
                <RefreshCw className={`w-3 h-3 ${loadingBalance ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {activeAddress ? (
            <div className="space-y-2">
              {/* Address with Copy & Explorer */}
              <div className="flex items-center justify-between bg-black/50 px-2.5 py-1.5 rounded-lg border border-white/5">
                <span className="text-[11px] font-mono text-white/80">
                  {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyAddress}
                    className="text-white/40 hover:text-white transition-colors p-1"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={`https://testnet.explorer.algorand.org/address/${activeAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-emerald-300 transition-colors p-1"
                    title="View on Algorand Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Balance Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5">
                    <AlgorandIcon className="w-2.5 h-2.5 text-white/50" />
                    <span>Gas (ALGO)</span>
                  </div>
                  <span className="font-mono text-white font-medium text-xs">
                    {balance ? balance.algo.toFixed(3) : '—'}
                  </span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <div className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5">
                    <UsdcIcon className="w-2.5 h-2.5 text-emerald-400" />
                    <span>USDC (ASA)</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-medium text-xs">
                    {balance ? `$${balance.usdc.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>

              {/* Opt-In Status Indicator (Clean SVGs) */}
              <div className="flex items-center justify-between px-1 text-[11px] pt-0.5">
                <span className="text-white/40">USDC Opt-in:</span>
                {balance ? (
                  <span className={`inline-flex items-center gap-1 font-medium ${balance.isOptedIn ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {balance.isOptedIn ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Opted In</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Not Opted In</span>
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-white/30 font-mono">Checking...</span>
                )}
              </div>

              {/* Low Gas Dispenser Helper */}
              {balance && balance.algo < 0.1 && (
                <a
                  href="https://lora.algokit.io/testnet/fund"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1 text-center text-[10px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 py-1.5 rounded-lg transition-colors"
                >
                  <span>Claim Free TestNet ALGO Gas</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}

              {/* Wallet UI Button */}
              <div className="pt-1 flex justify-center">
                <WalletButton size="sm" />
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 text-center py-1">
              <p className="text-[11px] text-white/50 leading-tight">
                Connect Lute or Pera wallet for real on-chain x402 settlement.
              </p>
              <div className="flex justify-center">
                <WalletButton size="sm" />
              </div>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 block mb-1 font-mono">
            Navigation
          </span>
          {navLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.to

            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* Footer / User Profile */}
      <div className="p-3.5 border-t border-white/5 mt-auto bg-white/[0.01]">
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold font-mono">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-white/40 truncate font-mono">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 md:flex-col md:fixed md:inset-y-0 z-40 bg-black/90 backdrop-blur-xl border-r border-white/10">
        {sidebarContent}
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-lg border-b border-white/10">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <CreditFlowLogoMark className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-white font-mono">Credow</span>
        </Link>
        <div className="flex items-center gap-2">
          <WalletButton size="sm" />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 text-white/70 hover:text-white rounded-lg bg-white/5 border border-white/10"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-in Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="md:hidden fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-gray-950 z-50 border-r border-white/10 shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
