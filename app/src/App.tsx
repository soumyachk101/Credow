import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import {
 type SupportedWallet,
 WalletId,
 WalletManager,
 WalletProvider,
} from '@txnlab/use-wallet-react'
import {
 WalletUIProvider,
 WalletButton,
 type Theme,
} from '@txnlab/use-wallet-ui-react'
import { getKmdConfigFromViteEnvironment, getNetwork } from './utils/algorand'
import AppCalls from './components/AppCalls'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Allocations from './pages/Allocations'
import Yield from './pages/Yield'
import Claims from './pages/Claims'

const network = getNetwork()
const algodConfig = {
 server: import.meta.env.VITE_ALGOD_SERVER,
 port: import.meta.env.VITE_ALGOD_PORT,
 token: import.meta.env.VITE_ALGOD_TOKEN,
}
let wallets: SupportedWallet[]
if (network === 'localnet') {
 const kmdConfig = getKmdConfigFromViteEnvironment()
 wallets = [
 {
 id: WalletId.KMD,
 options: {
 baseServer: kmdConfig.server,
 token: String(kmdConfig.token),
 port: String(kmdConfig.port),
 },
 },
 ]
} else {
 wallets = [{ id: WalletId.PERA }, { id: WalletId.LUTE }]
}
const walletManager = new WalletManager({
 wallets,
 defaultNetwork: network,
 networks: {
 [network]: {
 algod: {
 baseServer: algodConfig.server,
 port: algodConfig.port,
 token: String(algodConfig.token),
 },
 },
 },
 options: {
 resetNetwork: true,
 },
})

export default function App() {
 const [theme, setTheme] = useState<Theme>('system')

 useEffect(() => {
 const root = document.documentElement

 if (theme === 'dark') {
 root.classList.add('dark')
 } else if (theme === 'light') {
 root.classList.remove('dark')
 } else {
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
 const handler = (e: MediaQueryListEvent) => {
 root.classList.toggle('dark', e.matches)
 }
 root.classList.toggle('dark', mediaQuery.matches)
 mediaQuery.addEventListener('change', handler)
 return () => mediaQuery.removeEventListener('change', handler)
 }
 }, [theme])

 return (
 <WalletProvider manager={walletManager}>
 <WalletUIProvider theme={theme}>
 <BrowserRouter>
 <Routes>
 <Route path="/" element={<Landing />} />
 <Route path="/onboarding" element={<Onboarding />} />
 <Route
 path="/dashboard"
 element={
 <ProtectedRoute>
 <DashboardPage />
 </ProtectedRoute>
 }
 />
 <Route
 path="/allocations"
 element={
 <ProtectedRoute>
 <AllocationsPage />
 </ProtectedRoute>
 }
 />
 <Route
 path="/yield"
 element={
 <ProtectedRoute>
 <YieldPage />
 </ProtectedRoute>
 }
 />
 <Route
 path="/claims"
 element={
 <ProtectedRoute>
 <ClaimsPage />
 </ProtectedRoute>
 }
 />
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </BrowserRouter>
 </WalletUIProvider>
 </WalletProvider>
 )
}

function DashboardPage() {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <Dashboard />
 </div>
 )
}

function AllocationsPage() {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <Allocations />
 </div>
 )
}

function YieldPage() {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <Yield />
 </div>
 )
}

function ClaimsPage() {
 return (
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <Navbar />
 <Claims />
 </div>
 )
}
