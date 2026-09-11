import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { ChevronRight, Building2, Users, Upload, CheckCircle } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

interface OnboardingData {
 companyName: string
 companySlug: string
 teamName: string
 managerName: string
 employees: Array<{ name: string; email: string }>
 budgetPool: string
}

const STEPS: { step: Step; label: string; icon: typeof Building2 }[] = [
 { step: 1, label: 'Company', icon: Building2 },
 { step: 2, label: 'Team', icon: Users },
 { step: 3, label: 'Employees', icon: Upload },
 { step: 4, label: 'Budget', icon: ChevronRight },
 { step: 5, label: 'Done', icon: CheckCircle },
]

export default function Onboarding() {
 const navigate = useNavigate()
 const { user } = useAuthStore()
 const [currentStep, setCurrentStep] = useState<Step>(1)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [data, setData] = useState<OnboardingData>({
 companyName: '',
 companySlug: '',
 teamName: '',
 managerName: '',
 employees: [],
 budgetPool: '',
 })

 const updateData = (updates: Partial<OnboardingData>) => {
 setData(prev => ({ ...prev, ...updates }))
 }

 const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5) as Step)
 const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1) as Step)

 const handleCreateCompany = async () => {
 if (!data.companyName.trim() || !data.companySlug.trim()) {
 setError('Company name and slug are required')
 return
 }

 setLoading(true)
 setError('')

 try {
 const { data: company, error: companyError } = await supabase
 .from('companies')
 .insert([
 {
 name: data.companyName.trim(),
 slug: data.companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
 owner_id: user!.id,
 credit_pool: 0,
 yield_enabled: true,
 },
 ])
 .select()
 .single()

 if (companyError) throw companyError

 // Update user profile with company_id
 const { error: profileError } = await supabase
 .from('profiles')
 .update({ company_id: company.id })
 .eq('id', user!.id)

 if (profileError) throw profileError

 // Update auth store
 await useAuthStore.getState().fetchUserProfile(user!.id)

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to create company')
 } finally {
 setLoading(false)
 }
 }

 const handleCreateTeam = async () => {
 if (!data.teamName.trim()) {
 setError('Team name is required')
 return
 }

 setLoading(true)
 setError('')

 try {
 const { data: authUser } = useAuthStore.getState()
 const { error: teamError } = await supabase.from('teams').insert([
 {
 company_id: authUser!.company_id!,
 name: data.teamName.trim(),
 manager_id: user!.id,
 },
 ])

 if (teamError) throw teamError

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to create team')
 } finally {
 setLoading(false)
 }
 }

 const handleAddEmployee = (name: string, email: string) => {
 updateData({
 employees: [...data.employees, { name: name.trim(), email: email.trim().toLowerCase() }],
 })
 }

 const removeEmployee = (index: number) => {
 updateData({
 employees: data.employees.filter((_, i) => i !== index),
 })
 }

 const handleInviteEmployees = async () => {
 setLoading(true)
 setError('')

 try {
 const { data: authUser } = useAuthStore.getState()

 // Get the first team created
 const { data: teams } = await supabase
 .from('teams')
 .eq('company_id', authUser!.company_id!)
 .select('id')
 .limit(1)
 .single()

 const employeeRecords = data.employees.map(emp => ({
 company_id: authUser!.company_id!,
 team_id: teams?.id || null,
 name: emp.name,
 email: emp.email,
 role: 'employee',
 status: 'active' as const,
 }))

 const { error: empError } = await supabase
 .from('employees')
 .insert(employeeRecords)

 if (empError) throw empError

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to add employees')
 } finally {
 setLoading(false)
 }
 }

 const handleSetBudget = async () => {
 const budget = parseFloat(data.budgetPool)
 if (isNaN(budget) || budget <= 0) {
 setError('Please enter a valid budget amount')
 return
 }

 setLoading(true)
 setError('')

 try {
 const { data: authUser } = useAuthStore.getState()

 const { error: budgetError } = await supabase
 .from('companies')
 .update({ credit_pool: budget })
 .eq('id', authUser!.company_id!)

 if (budgetError) throw budgetError

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to set budget')
 } finally {
 setLoading(false)
 }
 }

 const renderStepContent = () => {
 switch (currentStep) {
 case 1:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
 Create Your Company
 </h2>
 <p className="text-gray-600 dark:text-slate-300">
 Let's start by setting up your company workspace.
 </p>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Company Name
 </label>
 <input
 type="text"
 value={data.companyName}
 onChange={e => updateData({ companyName: e.target.value })}
 placeholder="Acme Corporation"
 className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Company Slug
 </label>
 <input
 type="text"
 value={data.companySlug}
 onChange={e => updateData({ companySlug: e.target.value })}
 placeholder="acme-corp"
 className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
 Used for your workspace URL
 </p>
 </div>
 </div>
 </div>
 )

 case 2:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
 Add Your Team
 </h2>
 <p className="text-gray-600 dark:text-slate-300">
 Create your first team and assign a manager.
 </p>
 </div>

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Team Name
 </label>
 <input
 type="text"
 value={data.teamName}
 onChange={e => updateData({ teamName: e.target.value })}
 placeholder="Engineering"
 className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Manager
 </label>
 <input
 type="text"
 value={data.managerName}
 onChange={e => updateData({ managerName: e.target.value })}
 placeholder="John Manager"
 className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 </div>
 </div>
 </div>
 )

 case 3:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
 Invite Employees
 </h2>
 <p className="text-gray-600 dark:text-slate-300">
 Add team members who will use API credits.
 </p>
 </div>

 <AddEmployeeForm onAdd={handleAddEmployee} />

 {data.employees.length > 0 && (
 <div className="space-y-2">
 <h3 className="text-sm font-medium text-gray-700 dark:text-slate-200">
 Added Employees ({data.employees.length})
 </h3>
 {data.employees.map((emp, index) => (
 <div
 key={index}
 className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700"
 >
 <div>
 <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{emp.email}</p>
 </div>
 <button
 onClick={() => removeEmployee(index)}
 className="text-xs text-red-600 hover:text-red-700"
 >
 Remove
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 )

 case 4:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
 Set Your Budget
 </h2>
 <p className="text-gray-600 dark:text-slate-300">
 Define the total credit pool for your company.
 </p>
 </div>

 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
 Total Credit Pool ($)
 </label>
 <input
 type="number"
 value={data.budgetPool}
 onChange={e => updateData({ budgetPool: e.target.value })}
 placeholder="10000"
 min="0"
 step="0.01"
 className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
 This amount will be available for credit allocation across your teams.
 </p>
 </div>
 </div>
 )

 case 5:
 return (
 <div className="text-center space-y-6">
 <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
 <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
 </div>
 <div>
 <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
 You're All Set!
 </h2>
 <p className="text-gray-600 dark:text-slate-300 max-w-md mx-auto">
 Your company <span className="font-semibold text-gray-900 dark:text-white">{data.companyName}</span> has been created with{' '}
 <span className="font-semibold text-gray-900 dark:text-white">{data.employees.length}</span> employees and a budget of{' '}
 <span className="font-semibold text-gray-900 dark:text-white">${parseFloat(data.budgetPool || '0').toLocaleString()}</span>.
 </p>
 </div>
 </div>
 )
 }
 }

 const canProceed = () => {
 switch (currentStep) {
 case 1:
 return data.companyName.trim().length > 0 && data.companySlug.trim().length > 0
 case 2:
 return data.teamName.trim().length > 0
 case 3:
 return data.employees.length > 0
 case 4:
 return parseFloat(data.budgetPool) > 0
 default:
 return true
 }
 }

 const handleNext = async () => {
 if (currentStep === 1) {
 await handleCreateCompany()
 } else if (currentStep === 2) {
 await handleCreateTeam()
 } else if (currentStep === 3) {
 await handleInviteEmployees()
 } else if (currentStep === 4) {
 await handleSetBudget()
 } else {
 navigate('/dashboard')
 }
 }

 if (currentStep === 5) {
 return (
 <div className="max-w-2xl mx-auto px-4">
 {renderStepContent()}
 <div className="mt-8">
 <button
 onClick={() => navigate('/dashboard')}
 className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 Go to Dashboard
 </button>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
 <div className="max-w-2xl mx-auto px-4 py-12">
 {/* Progress Steps */}
 <div className="flex items-center justify-between mb-12">
 {STEPS.map((s, index) => (
 <div key={s.step} className="flex items-center">
 <div className="flex flex-col items-center">
 <div
 className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
 currentStep >= s.step
 ? 'bg-blue-600 text-white'
 : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
 }`}
 >
 <s.icon className="w-4 h-4" />
 </div>
 <span className="text-xs mt-1 text-gray-500 dark:text-slate-400">
 {s.label}
 </span>
 </div>
 {index < STEPS.length - 1 && (
 <div
 className={`flex-1 h-0.5 mx-2 transition-colors ${
 currentStep > s.step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
 }`}
 />
 )}
 </div>
 ))}
 </div>

 {/* Step Content */}
 <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-gray-200 dark:border-slate-700 shadow-sm">
 {renderStepContent()}

 {error && (
 <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
 </div>
 )}

 <div className="flex justify-between mt-8">
 <button
 onClick={prevStep}
 disabled={currentStep === 1}
 className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Back
 </button>
 <button
 onClick={handleNext}
 disabled={!canProceed() || loading}
 className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 {loading ? (
 'Please wait...'
 ) : (
 <>
 {currentStep === 4 ? 'Complete Setup' : 'Continue'}
 <ChevronRight className="w-4 h-4" />
 </>
 )}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

function AddEmployeeForm({ onAdd }: { onAdd: (name: string, email: string) => void }) {
 const [name, setName] = useState('')
 const [email, setEmail] = useState('')

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault()
 if (!name.trim() || !email.trim()) return
 onAdd(name, email)
 setName('')
 setEmail('')
 }

 return (
 <form onSubmit={handleSubmit} className="flex gap-2">
 <input
 type="text"
 value={name}
 onChange={e => setName(e.target.value)}
 placeholder="Employee name"
 required
 className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <input
 type="email"
 value={email}
 onChange={e => setEmail(e.target.value)}
 placeholder="email@company.com"
 required
 className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
 />
 <button
 type="submit"
 className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
 >
 Add
 </button>
 </form>
 )
}
