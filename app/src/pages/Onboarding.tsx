import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Building2, Users, Upload, CheckCircle, ArrowRight } from 'lucide-react'

type Step = 1 | 2 | 3 | 4 | 5

interface OnboardingData {
 companyName: string
 companySlug: string
 teamName: string
 managerName: string
 employees: Array<{ name: string; email: string }>
 budgetPool: string
}

const STEPS = [
 { step: 1 as Step, label: 'Company', icon: Building2 },
 { step: 2 as Step, label: 'Team', icon: Users },
 { step: 3 as Step, label: 'Employees', icon: Upload },
 { step: 4 as Step, label: 'Budget', icon: ChevronRight },
 { step: 5 as Step, label: 'Done', icon: CheckCircle },
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

 const updateData = (updates: Partial<OnboardingData>) => setData(prev => ({ ...prev, ...updates }))
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
 const currentUser = await useAuthStore.getState().ensureUser(data.managerName || 'Admin')
 const slug = data.companySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
 let createdCompanyId = ''

 // 1. First check if company with this slug already exists
 const { data: existingComp } = await supabase
 .from('companies')
 .select('id')
 .eq('slug', slug)
 .maybeSingle()

 if (existingComp?.id) {
 createdCompanyId = existingComp.id
 } else {
 const { data: company, error: companyError } = await supabase
 .from('companies')
 .insert([
 {
 name: data.companyName.trim(),
 slug: slug,
 owner_id: currentUser.id,
 credit_pool: 0,
 yield_enabled: true,
 },
 ])
 .select()
 .maybeSingle()

 if (!companyError && company?.id) {
 createdCompanyId = company.id
 } else if (companyError) {
 // If insert had error (e.g. conflict), check if company exists for this owner
 const { data: userComp } = await supabase
 .from('companies')
 .select('id')
 .eq('owner_id', currentUser.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 if (userComp?.id) {
 createdCompanyId = userComp.id
 } else {
 throw companyError
 }
 }
 }

 if (!createdCompanyId) {
 throw new Error('Failed to create or retrieve company.')
 }

 useAuthStore.setState(state => ({
 user: state.user
 ? { ...state.user, company_id: createdCompanyId }
 : { ...currentUser, company_id: createdCompanyId },
 }))

 try {
 await supabase
 .from('profiles')
 .update({ company_id: createdCompanyId })
 .eq('id', currentUser.id)
 } catch (_) {}

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
 const currentUser = await useAuthStore.getState().ensureUser(data.managerName || 'Admin')
 let companyId = useAuthStore.getState().user?.company_id

 // Scoped fallback: only use a company the current user owns
 if (companyId) {
 const { data: owned } = await supabase
 .from('companies')
 .select('id')
 .eq('id', companyId)
 .eq('owner_id', currentUser.id)
 .maybeSingle()
 if (!owned) companyId = undefined
 }

 if (!companyId) {
 const { data: owned } = await supabase
 .from('companies')
 .select('id')
 .eq('owner_id', currentUser.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 if (owned?.id) {
 companyId = owned.id
 useAuthStore.setState(state => ({
 user: state.user ? { ...state.user, company_id: companyId } : state.user,
 }))
 }
 }

 if (!companyId) {
 throw new Error('Company not found. Please go back to Step 1.')
 }

 const { error: teamError } = await supabase.from('teams').insert([
 {
 company_id: companyId,
 name: data.teamName.trim(),
 manager_id: null,
 },
 ])

 if (teamError) {
 console.warn('Teams insert warning:', teamError)
 }

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to create team')
 } finally {
 setLoading(false)
 }
 }

 const handleInviteEmployees = async () => {
 setLoading(true)
 setError('')
 try {
 const authUser = useAuthStore.getState().user
 let companyId = authUser?.company_id

 if (!companyId) {
 const currentUser = await useAuthStore.getState().ensureUser()
 const { data: owned } = await supabase
 .from('companies')
 .select('id')
 .eq('owner_id', currentUser.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 if (owned?.id) companyId = owned.id
 }

 if (!companyId) {
 throw new Error('Company not found. Please go back to Step 1.')
 }

 const { data: teams } = await supabase
 .from('teams')
 .select('id')
 .eq('company_id', companyId)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()

 // Note: omit 'status' column as it is not in the database schema
 const employeeRecords = data.employees.map(emp => ({
 company_id: companyId,
 team_id: teams?.id || null,
 name: emp.name,
 email: emp.email,
 role: 'employee',
 }))

 if (employeeRecords.length > 0) {
 const { error: empError } = await supabase.from('employees').insert(employeeRecords)
 if (empError) {
 console.warn('Employees insert warning:', empError)
 throw empError
 }
 }

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
 const authUser = useAuthStore.getState().user
 let companyId = authUser?.company_id

 if (!companyId) {
 const currentUser = await useAuthStore.getState().ensureUser()
 const { data: owned } = await supabase
 .from('companies')
 .select('id')
 .eq('owner_id', currentUser.id)
 .order('created_at', { ascending: false })
 .limit(1)
 .maybeSingle()
 if (owned?.id) companyId = owned.id
 }

 if (companyId) {
 try {
 await supabase.from('companies').update({ credit_pool: budget }).eq('id', companyId)
 } catch (_) {}
 }

 nextStep()
 } catch (err: any) {
 setError(err.message || 'Failed to set budget')
 } finally {
 setLoading(false)
 }
 }

 const renderStep = () => {
 switch (currentStep) {
 case 1:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Create Your Company</h2>
 <p className="text-white/40 mt-2 text-sm">Set up your company workspace to get started.</p>
 </div>
 <div className="space-y-4">
 <Field label="Company Name" value={data.companyName} onChange={v => updateData({ companyName: v })} placeholder="Acme Corporation" />
 <Field label="Company Slug" value={data.companySlug} onChange={v => updateData({ companySlug: v })} placeholder="acme-corp" hint="Used for your workspace URL" />
 </div>
 </div>
 )
 case 2:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Add Your Team</h2>
 <p className="text-white/40 mt-2 text-sm">Create your first team and assign a manager.</p>
 </div>
 <div className="space-y-4">
 <Field label="Team Name" value={data.teamName} onChange={v => updateData({ teamName: v })} placeholder="Engineering" />
 <Field label="Manager Name" value={data.managerName} onChange={v => updateData({ managerName: v })} placeholder="John Manager" />
 </div>
 </div>
 )
 case 3:
 return (
 <div className="space-y-6">
 <div>
 <h2 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Invite Employees</h2>
 <p className="text-white/40 mt-2 text-sm">Add team members who will use API credits.</p>
 </div>
 <EmployeeForm onAdd={(name, email) => updateData({ employees: [...data.employees, { name: name.trim(), email: email.trim().toLowerCase() }] })} />
 {data.employees.length > 0 && (
 <div className="space-y-2">
 <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Added ({data.employees.length})</p>
 {data.employees.map((emp, index) => (
 <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
 <div>
 <p className="text-sm text-white/80">{emp.name}</p>
 <p className="text-xs text-white/30">{emp.email}</p>
 </div>
 <button onClick={() => updateData({ employees: data.employees.filter((_, i) => i !== index) })} className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
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
 <h2 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Set Your Budget</h2>
 <p className="text-white/40 mt-2 text-sm">Define the total credit pool for your company.</p>
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">Total Credit Pool ($)</label>
 <input type="number" value={data.budgetPool} onChange={e => updateData({ budgetPool: e.target.value })} placeholder="10000" min="0" step="0.01" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 <p className="text-xs text-white/30 mt-2">This amount will be available for credit allocation across your teams.</p>
 </div>
 </div>
 )
 case 5:
 return (
 <div className="text-center space-y-6 py-8">
 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
 <CheckCircle className="w-8 h-8 text-white/70" />
 </div>
 <div>
 <h2 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>You're All Set!</h2>
 <p className="text-white/40 mt-2 text-sm max-w-md mx-auto">Your company <span className="text-white/80 font-medium">{data.companyName}</span> has been created with {data.employees.length} employees and a budget of <span className="text-white/80 font-medium">${parseFloat(data.budgetPool || '0').toLocaleString()}</span>.</p>
 </div>
 <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
 Go to Dashboard <ArrowRight className="w-4 h-4" />
 </button>
 </div>
 )
 }
}

 if (currentStep === 5) return <div className="min-h-screen bg-black">{renderStep()}</div>

 return (
 <div className="min-h-screen bg-black flex flex-col">
 <div className="max-w-2xl mx-auto px-4 py-8 flex-1">
 {/* Steps */}
 <div className="flex items-center justify-between mb-12">
 {STEPS.map((s, index) => (
 <div key={s.step} className="flex items-center">
 <div className="flex flex-col items-center">
 <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${currentStep >= s.step ? 'bg-white text-black' : 'bg-white/5 text-white/30'}`}>
 <s.icon className="w-4 h-4" />
 </div>
 <span className="text-xs mt-1.5 text-white/40">{s.label}</span>
 </div>
 {index < STEPS.length - 1 && (
 <div className={`flex-1 h-px mx-3 transition-colors ${currentStep > s.step ? 'bg-white/20' : 'bg-white/5'}`} />
 )}
 </div>
 ))}
 </div>

 <div className="liquid-glass rounded-2xl p-8">
 {renderStep()}
 {error && (
 <div className="mt-4 p-3 bg-red-500/10 border border-red-500/10 rounded-xl">
 <p className="text-sm text-red-300">{error}</p>
 </div>
 )}
 <div className="flex justify-between mt-8">
 <button onClick={prevStep} disabled={currentStep === 1} className="px-4 py-2 text-sm text-white/50 hover:text-white disabled:opacity-30 transition-colors">Back</button>
 <button onClick={currentStep === 1 ? handleCreateCompany : currentStep === 2 ? handleCreateTeam : currentStep === 3 ? handleInviteEmployees : handleSetBudget} disabled={loading} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 transition-colors">
 {loading ? 'Please wait...' : <>{currentStep === 4 ? 'Complete Setup' : 'Continue'} <ChevronRight className="w-4 h-4" /></>}
 </button>
 </div>
 </div>
 </div>
 </div>
 )
}

function Field({ label, value, onChange, placeholder, hint }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string }) {
 return (
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">{label}</label>
 <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 {hint && <p className="text-xs text-white/20 mt-1.5">{hint}</p>}
 </div>
 )
}

function EmployeeForm({ onAdd }: { onAdd: (name: string, email: string) => void }) {
 const [name, setName] = useState('')
 const [email, setEmail] = useState('')
 const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim() || !email.trim()) return; onAdd(name, email); setName(''); setEmail('') }
 return (
 <form onSubmit={handleSubmit} className="flex gap-2">
 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Employee name" required className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@company.com" required className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 <button type="submit" className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 transition-colors">Add</button>
 </form>
 )
}
