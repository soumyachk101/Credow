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
  Globe,
  Wallet,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserRole } from '@/lib/types'

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

  // Fetch live on-chain Algorand balance whenever activeAddress changes
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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const copyAddress = () => {
    if (!activeAddress) return
    navigator.clipboard.writeText(activeAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Define navigation items dynamically based on active role (x402-demo removed!)
  const getNavLinks = (): NavItem[] => {
    if (role === 'super_admin') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/companies', label: 'Companies', icon: Building2 },
        { to: '/teams', label: 'Teams', icon: Users },
        { to: '/claims', label: 'Claims & x402', icon: Zap },
      ]
    }
    if (role === 'company_owner' || role === 'manager') {
      return [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/allocations', label: 'Allocations', icon: Coins },
        { to: '/claims', label: 'Claims & x402', icon: Zap },
        { to: '/yield', label: 'Yield Vault', icon: TrendingUp },
        { to: '/teams', label: 'Teams', icon: Users },
        { to: '/employees', label: 'Employees', icon: UserCheck },
      ]
    }
    // employee
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:border-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Globe className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">CreditFlow</span>
              <span className="px-1.5 py-0.2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded-md font-mono">
                AVM
              </span>
            </div>
            <p className="text-[10px] text-white/40 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Algorand TestNet
            </p>
          </div>
        </Link>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 text-white/40 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
        {/* Persona Switcher */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Role Persona</span>
            <span className="text-[10px] text-emerald-400/80 font-mono capitalize">{role.replace('_', ' ')}</span>
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
              <span>👷</span> Employee
            </button>
            <button
              onClick={() => switchRole('company_owner')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                !isEmployee
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>👑</span> Owner
            </button>
          </div>
        </div>

        {/* Wallet Hub */}
        <div className="liquid-glass rounded-2xl p-3.5 space-y-3 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
              <Wallet className="w-3.5 h-3.5 text-yellow-400" />
              <span>Algorand Wallet</span>
            </div>
            {activeAddress && (
              <button
                onClick={loadBalance}
                disabled={loadingBalance}
                className="text-white/40 hover:text-white transition-colors"
                title="Refresh on-chain balance"
              >
                <RefreshCw className={`w-3 h-3 ${loadingBalance ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {activeAddress ? (
            <div className="space-y-2">
              {/* Address with Copy & Explorer */}
              <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
                <span className="text-[11px] font-mono text-white/80">
                  {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={copyAddress}
                    className="text-white/40 hover:text-white transition-colors"
                    title="Copy address"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={`https://testnet.explorer.algorand.org/address/${activeAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-emerald-300 transition-colors"
                    title="View on Algorand Explorer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Balance Grid */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-white/40 block">Gas (ALGO)</span>
                  <span className="font-mono text-white font-medium text-xs">
                    {balance ? balance.algo.toFixed(3) : '—'}
                  </span>
                </div>
                <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
                  <span className="text-[10px] text-white/40 block">USDC (ASA)</span>
                  <span className="font-mono text-emerald-400 font-medium text-xs">
                    {balance ? `$${balance.usdc.toFixed(2)}` : '—'}
                  </span>
                </div>
              </div>

              {/* Opt-In Status Indicator */}
              <div className="flex items-center justify-between px-1 text-[11px]">
                <span className="text-white/40">USDC Opt-in:</span>
                {balance ? (
                  <span className={balance.isOptedIn ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                    {balance.isOptedIn ? '✓ Opted In' : '⚠️ Not Opted In'}
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
                  className="block text-center text-[10px] text-blue-400 hover:text-blue-300 bg-blue-500/10 py-1 rounded-md transition-colors"
                >
                  Claim Free TestNet ALGO Gas ↗
                </a>
              )}

              {/* Wallet UI Button for disconnect / account switch */}
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-2 block mb-1">
            Menu
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
                    ? 'bg-gradient-to-r from-white/15 to-white/5 text-white border border-white/10 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-white/40 truncate">{user?.email || 'user@example.com'}</p>
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
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-semibold text-sm text-white">CreditFlow</span>
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
