import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface Props {
 children: React.ReactNode
}

export default function ProtectedRoute({ children }: Props) {
 const { user, loading } = useAuthStore()

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center">
 <div className="flex flex-col items-center gap-3">
 <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
 <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
 </div>
 </div>
 )
 }

 if (!user || !user.company_id) {
 return <Navigate to="/onboarding" replace />
 }

 return <>{children}</>
}
