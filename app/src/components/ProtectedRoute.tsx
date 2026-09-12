import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/lib/types'

interface Props {
 children: React.ReactNode
 allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
 const { user, loading, _hydrated } = useAuthStore()

 if (!_hydrated || loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-black">
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
 <p className="text-sm text-white/60">Loading...</p>
 </div>
 </div>
 )
}

 if (!user || !user.company_id) {
 return <Navigate to="/onboarding" replace />
}

 if (allowedRoles && !allowedRoles.includes(user.role)) {
 return <Navigate to="/dashboard" replace />
 }

 return <>{children}</>
}
