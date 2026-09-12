import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, Building2, Users, Upload, CheckCircle, ArrowRight, Globe } from 'lucide-react'

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

const fadeVideo = (
  el: HTMLVideoElement | null,
  to: number,
  duration = 500
): void => {
  if (!el) return
  const start = performance.now()
  const from = parseFloat(el.style.opacity || '1')
  const step = (now: number) => {
    const progress = Math.min((now - start) / duration, 1)
    el.style.opacity = String(from + (to - from) * progress)
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

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

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onCanPlay = () => {
      video.play().catch(() => {})
      fadeVideo(video, 1, 500)
    }

    const onEnded = () => {
      video.style.opacity = '0'
      setTimeout(() => {
        video.currentTime = 0
        video.play().then(() => fadeVideo(video, 1, 500)).catch(() => {})
      }, 100)
    }

    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

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
              <h2 className="text-3xl sm:text-4xl font-normal text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Create Your Company</h2>
              <p className="text-white/60 mt-1.5 text-sm">Set up your company workspace to get started with credit flow.</p>
            </div>
            <div className="space-y-4">
              <Field label="Company Name" value={data.companyName} onChange={v => updateData({ companyName: v })} placeholder="Acme Corporation" />
              <Field label="Company Slug" value={data.companySlug} onChange={v => updateData({ companySlug: v })} placeholder="acme-corp" hint="Used for your unique company workspace URL" />
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-normal text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Add Your Team</h2>
              <p className="text-white/60 mt-1.5 text-sm">Create your primary department or team line.</p>
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
              <h2 className="text-3xl sm:text-4xl font-normal text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Invite Employees</h2>
              <p className="text-white/60 mt-1.5 text-sm">Add team members who will utilize API corporate credits.</p>
            </div>
            <EmployeeForm onAdd={(name, email) => updateData({ employees: [...data.employees, { name: name.trim(), email: email.trim().toLowerCase() }] })} />
            {data.employees.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider font-mono">Invited Personnel ({data.employees.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {data.employees.map((emp, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-white/[0.04] rounded-2xl border border-white/10 backdrop-blur-md">
                      <div>
                        <p className="text-sm font-medium text-white/90">{emp.name}</p>
                        <p className="text-xs text-white/40 font-mono">{emp.email}</p>
                      </div>
                      <button
                        onClick={() => updateData({ employees: data.employees.filter((_, i) => i !== index) })}
                        className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-normal text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>Set Your Budget</h2>
              <p className="text-white/60 mt-1.5 text-sm">Define the total initial credit pool for your organization.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider font-mono">Total Credit Pool ($ USD)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-mono">$</span>
                <input
                  type="number"
                  value={data.budgetPool}
                  onChange={e => updateData({ budgetPool: e.target.value })}
                  placeholder="10000"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-white text-base placeholder:text-white/25 focus:outline-none focus:bg-white/[0.07] backdrop-blur-md transition-all shadow-inner font-mono"
                />
              </div>
              <p className="text-xs text-white/40 mt-2">This credit pool will be deposited for micro-allocation and idle yield generation.</p>
            </div>
          </div>
        )
      case 5:
        return (
          <div className="text-center space-y-6 py-6">
            <div className="w-20 h-20 rounded-full liquid-glass border border-white/25 flex items-center justify-center mx-auto shadow-[0_0_35px_rgba(255,255,255,0.2)]">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-4xl sm:text-5xl font-normal text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>You're All Set!</h2>
              <p className="text-white/60 mt-3 text-sm max-w-md mx-auto leading-relaxed">
                Your workspace <span className="text-white font-semibold">{data.companyName}</span> is established with {data.employees.length} team members and an initial budget pool of <span className="text-white font-mono font-bold">${parseFloat(data.budgetPool || '0').toLocaleString()}</span>.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.35)]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white flex flex-col justify-between p-4 sm:p-6 md:p-8">
      {/* ── Background Cinematic Video for True Glassmorphic Depth ── */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover object-bottom pointer-events-none"
        style={{ opacity: 0 }}
        muted
        autoPlay
        playsInline
        preload="auto"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Translucent Frosted Glass Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[3px] pointer-events-none" />

      {/* ── Top Floating Glass Navbar ── */}
      <header className="relative z-10 w-full max-w-3xl mx-auto mb-6">
        <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between border border-white/15 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Globe className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
            <span className="text-white font-semibold text-base tracking-tight">CreditFlow</span>
          </Link>
          <Link
            to="/"
            className="text-xs text-white/70 hover:text-white font-medium transition-colors px-3 py-1 rounded-full hover:bg-white/10"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* ── Center Onboarding Glass Modal ── */}
      <main className="relative z-10 w-full max-w-xl mx-auto my-auto py-4">
        {/* Stepper (Steps 1-4) */}
        {currentStep < 5 && (
          <div className="liquid-glass rounded-full px-6 py-3 flex items-center justify-between mb-6 border border-white/15 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
            {STEPS.map((s, index) => {
              const isActive = currentStep === s.step
              const isDone = currentStep > s.step
              return (
                <div key={s.step} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.45)]'
                          : isDone
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/30'
                      }`}
                    >
                      <s.icon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-xs hidden sm:inline transition-colors font-mono ${
                        isActive ? 'text-white font-semibold' : 'text-white/40'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-4 sm:w-8 h-px mx-2 transition-colors ${
                        currentStep > s.step ? 'bg-white/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Main Glass Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="liquid-glass rounded-3xl p-7 sm:p-10 border border-white/15 bg-white/[0.035] backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        >
          {renderStep()}

          {error && (
            <div className="mt-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-md">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {currentStep < 5 && (
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-white/10">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-5 py-2.5 rounded-full text-xs text-white/50 hover:text-white disabled:opacity-20 disabled:pointer-events-none hover:bg-white/5 transition-all font-medium"
              >
                Back
              </button>
              <button
                onClick={
                  currentStep === 1
                    ? handleCreateCompany
                    : currentStep === 2
                    ? handleCreateTeam
                    : currentStep === 3
                    ? handleInviteEmployees
                    : handleSetBudget
                }
                disabled={loading}
                className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-white text-black text-xs font-semibold hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                {loading ? 'Please wait...' : (
                  <>
                    <span>{currentStep === 4 ? 'Complete Setup' : 'Continue'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 w-full max-w-xl mx-auto text-center py-4">
        <p className="text-xs text-white/30 font-mono">
          &copy; {new Date().getFullYear()} CreditFlow &middot; Algorand Native Corporate Treasury
        </p>
      </footer>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider font-mono">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-white text-sm placeholder:text-white/25 focus:outline-none focus:bg-white/[0.07] backdrop-blur-md transition-all shadow-inner"
      />
      {hint && <p className="text-xs text-white/30 mt-1.5 font-mono">{hint}</p>}
    </div>
  )
}

function EmployeeForm({ onAdd }: { onAdd: (name: string, email: string) => void }) {
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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Employee name"
        required
        className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-white text-sm placeholder:text-white/25 focus:outline-none focus:bg-white/[0.07] backdrop-blur-md transition-all shadow-inner"
      />
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="email@company.com"
        required
        className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-white/40 text-white text-sm placeholder:text-white/25 focus:outline-none focus:bg-white/[0.07] backdrop-blur-md transition-all shadow-inner"
      />
      <button
        type="submit"
        className="px-5 py-2.5 bg-white text-black text-xs font-semibold rounded-full hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_15px_rgba(255,255,255,0.25)] shrink-0"
      >
        Add
      </button>
    </form>
  )
}
