import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/lib/types'
import { WalletButton } from '@txnlab/use-wallet-ui-react'
import {
 Globe,
 LayoutDashboard,
 Users,
 Wallet,
 Zap,
 ChevronRight,
 LogOut,
 Menu,
} from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ROLE_LINKS: Record<UserRole, { to: string; label: string; icon: typeof LayoutDashboard }[]> = {
  super_admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/companies', label: 'Companies', icon: Globe },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/claims', label: 'Claims & x402', icon: Zap },
    { to: '/x402-demo', label: 'x402 Demo', icon: Globe },
  ],
  company_owner: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/allocations', label: 'Allocations', icon: Users },
    { to: '/yield', label: 'Yield', icon: Wallet },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/claims', label: 'Claims & x402', icon: Zap },
    { to: '/x402-demo', label: 'x402 Demo', icon: Globe },
  ],
  manager: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/allocations', label: 'Allocations', icon: Users },
    { to: '/yield', label: 'Yield', icon: Wallet },
    { to: '/claims', label: 'Claims & x402', icon: Zap },
    { to: '/x402-demo', label: 'x402 Demo', icon: Globe },
  ],
  employee: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/claims', label: 'Claim Credits', icon: Zap },
    { to: '/x402-demo', label: 'x402 Demo', icon: Globe },
  ],
}

export default function Navbar() {
  const { user, logout, switchRole } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const role = user?.role || 'employee'
  const navLinks = ROLE_LINKS[role] || ROLE_LINKS.employee

  return (
    <nav className="sticky top-0 z-50 px-4 py-4">
      <div className="liquid-glass rounded-full max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-medium text-sm hidden sm:block">CreditFlow</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </NavLink>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick Persona Switcher */}
          <button
            onClick={() => {
              if (role === 'employee') {
                switchRole('company_owner')
              } else {
                switchRole('employee', { id: 'emp-demo', name: 'Alice Employee', email: 'alice@test.com' })
              }
            }}
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              role === 'employee'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-white/10 text-white/90 border-white/20 hover:bg-white/15'
            }`}
            title="Click to toggle between Company Owner and Employee persona"
          >
            <span>{role === 'employee' ? '👷 Employee View' : '👑 Owner View'}</span>
            <span className="text-[10px] text-white/50 underline">Switch</span>
          </button>

          {/* Connect / Manage Algorand Wallet */}
          <div className="flex items-center">
            <WalletButton size="sm" />
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-xs font-medium text-white">{user?.name}</p>
              <p className="text-[10px] text-white/50 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </div>

 <AnimatePresence>
 {mobileOpen && (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="md:hidden mt-3 liquid-glass rounded-2xl p-3 space-y-1"
 >
 {navLinks.map((link) => {
 const Icon = link.icon
 return (
 <NavLink
 key={link.to}
 to={link.to}
 onClick={() => setMobileOpen(false)}
 className={({ isActive }) =>
 `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
 isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white hover:bg-white/5'
 }`
 }
 >
 <Icon className="w-4 h-4" />
 {link.label}
 </NavLink>
 )
 })}
 <div className="pt-2 pb-1 border-t border-white/10 flex justify-center">
 <WalletButton size="sm" />
 </div>
 <button
 onClick={() => { logout(); setMobileOpen(false) }}
 className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors w-full"
 >
 <LogOut className="w-4 h-4" />
 Logout
 </button>
 </motion.div>
 )}
 </AnimatePresence>
 </nav>
 )
}
