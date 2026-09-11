import { Link, NavLink } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function Navbar() {
 const { user, logout } = useAuthStore()

 const navLinks = [
 { to: '/dashboard', label: 'Dashboard' },
 { to: '/allocations', label: 'Allocations' },
 { to: '/yield', label: 'Yield' },
 { to: '/claims', label: 'Claims' },
 ]

 return (
 <nav className="bg-white dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700/60 backdrop-blur-sm sticky top-0 z-50">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex justify-between items-center h-16">
 <div className="flex items-center gap-8">
 <Link to="/" className="flex items-center gap-2">
 <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
 <span className="text-white font-bold text-sm">CF</span>
 </div>
 <span className="text-xl font-bold text-gray-900 dark:text-white">
 CreditFlow
 </span>
 </Link>

 <div className="hidden md:flex items-center gap-1">
 {navLinks.map((link) => (
 <NavLink
 key={link.to}
 to={link.to}
 className={({ isActive }) =>
 `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
 isActive
 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
 : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700/50'
 }`
 }
 >
 {link.label}
 </NavLink>
 ))}
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="hidden sm:flex items-center gap-3">
 <div className="text-right">
 <p className="text-sm font-medium text-gray-900 dark:text-white">
 {user?.name || 'User'}
 </p>
 <p className="text-xs text-gray-500 dark:text-slate-400">
 {user?.email}
 </p>
 </div>
 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
 <span className="text-white text-xs font-bold">
 {(user?.name || 'U').charAt(0).toUpperCase()}
 </span>
 </div>
 </div>
 <button
 onClick={logout}
 className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
 >
 Logout
 </button>
 </div>
 </div>
 </div>
 </nav>
 )
}
