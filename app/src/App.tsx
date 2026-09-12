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
 type Theme,
} from '@txnlab/use-wallet-ui-react'
import { getKmdConfigFromViteEnvironment, getNetwork } from './utils/algorand'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Allocations from './pages/Allocations'
import Yield from './pages/Yield'
import Claims from './pages/Claims'
import Companies from './pages/Companies'
import Teams from './pages/Teams'
import Employees from './pages/Employees'

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
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <AllocationsPage />
 </ProtectedRoute>
 }
 />

 <Route
 path="/yield"
 element={
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
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

 <Route
 path="/teams"
 element={
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <TeamsPage />
 </ProtectedRoute>
 }
 />

 <Route
 path="/employees"
 element={
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <EmployeesPage />
 </ProtectedRoute>
 }
 />

 <Route
 path="/companies"
 element={
 <ProtectedRoute allowedRoles={['super_admin']}>
 <CompaniesPage />
 </ProtectedRoute>
 }
 />

 <Route path="/x402-demo" element={<Navigate to="/claims" replace />} />
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </BrowserRouter>
 </WalletUIProvider>
 </WalletProvider>
 )
}

function PageShell({ children }: { children: React.ReactNode }) {
 return (
 <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
 <Sidebar />
 <div className="hidden md:block md:w-64 lg:w-72 md:shrink-0" aria-hidden="true" />
 <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 md:py-8 overflow-y-auto">
 <div className="max-w-7xl mx-auto">
 {children}
 </div>
 </main>
 </div>
 )
}

function DashboardPage() {
 return (
 <ProtectedRoute>
 <PageShell>
 <Dashboard />
 </PageShell>
 </ProtectedRoute>
 )
}

function AllocationsPage() {
 return (
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <PageShell>
 <Allocations />
 </PageShell>
 </ProtectedRoute>
 )
}

function YieldPage() {
 return (
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <PageShell>
 <Yield />
 </PageShell>
 </ProtectedRoute>
 )
}

function ClaimsPage() {
 return (
 <ProtectedRoute>
 <PageShell>
 <Claims />
 </PageShell>
 </ProtectedRoute>
 )
}

function TeamsPage() {
 return (
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <PageShell>
 <Teams />
 </PageShell>
 </ProtectedRoute>
 )
}

function EmployeesPage() {
 return (
 <ProtectedRoute allowedRoles={['company_owner', 'manager']}>
 <PageShell>
 <Employees />
 </PageShell>
 </ProtectedRoute>
 )
}

function CompaniesPage() {
 return (
 <ProtectedRoute allowedRoles={['super_admin']}>
 <PageShell>
 <Companies />
 </PageShell>
 </ProtectedRoute>
 )
}
