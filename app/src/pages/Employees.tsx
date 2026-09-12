import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { motion } from 'framer-motion'
import { Plus, Search, Users, MoreVertical, Trash2, Edit3, X, UserPlus, Shield, Filter } from 'lucide-react'

const ROLE_OPTIONS = ['company_owner', 'manager', 'member']

export default function Employees() {
 const { user } = useAuthStore()
 const { employees, teams, fetchEmployees, fetchTeams, createEmployee, updateEmployee, terminateEmployee } = useCompanyStore()
 const { allocations } = useAllocationStore()
 const [search, setSearch] = useState('')
 const [filterTeam, setFilterTeam] = useState('')
 const [filterRole, setFilterRole] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [form, setForm] = useState({ name: '', email: '', role: 'member', team_id: '', wallet_address: '' })
 const [saving, setSaving] = useState(false)
 const [showInvite, setShowInvite] = useState(false)

 useEffect(() => {
 if (user?.company_id) {
 fetchTeams(user.company_id)
 fetchEmployees(user.company_id)
 }
 }, [user?.company_id, fetchTeams, fetchEmployees])

 if (user?.role !== 'company_owner' && user?.role !== 'manager') {
 return <Navigate to="/dashboard" replace />
 }

 const getEmployeeBalance = (empId: string) => {
 const empAllocs = allocations.filter(a => a.employee_id === empId)
 return empAllocs.reduce((s, a) => s + a.unclaimed_credits, 0)
 }

 const filtered = employees.filter(e => {
 if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false
 if (filterTeam && e.team_id !== filterTeam) return false
 if (filterRole && e.role !== filterRole) return false
 return true
 })

 const handleSubmit = async () => {
 if (!form.name || !form.email || !form.role) return
 setSaving(true)
 try {
 if (editingId) {
 await updateEmployee(editingId, {
 name: form.name,
 role: form.role,
 team_id: form.team_id || undefined,
 wallet_address: form.wallet_address || undefined,
 })
 } else {
 await createEmployee({
 company_id: user!.company_id!,
 name: form.name,
 email: form.email,
 role: form.role,
 team_id: form.team_id || undefined,
 wallet_address: form.wallet_address || undefined,
 })
 }
 setShowModal(false)
 setEditingId(null)
 setForm({ name: '', email: '', role: 'member', team_id: '', wallet_address: '' })
 fetchEmployees(user!.company_id!)
 } catch (err: any) {
 alert(err.message || 'Operation failed')
 }
 finally { setSaving(false) }
 }

 const openEdit = (emp: any) => {
 setEditingId(emp.id)
 setForm({ name: emp.name, email: emp.email, role: emp.role, team_id: emp.team_id || '', wallet_address: emp.wallet_address || '' })
 setShowModal(true)
 }

 const handleTerminate = async (id: string) => {
 if (!confirm('Terminate this employee? They will lose access immediately.')) return
 await terminateEmployee(id)
 fetchEmployees(user!.company_id!)
 }

 const activeCount = employees.filter(e => e.status === 'active').length
 const teamList = teams.filter(t => t.status === 'active')

 return (
 <div className="space-y-6">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
 Employees
 </h1>
 <p className="text-white/40 mt-1 text-sm">{activeCount} active members across {teams.length} teams</p>
 </div>
 <div className="flex gap-2">
 <button onClick={() => { setEditingId(null); setForm({ name: '', email: '', role: 'member', team_id: '', wallet_address: '' }); setShowModal(true) }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
 <Plus className="w-4 h-4" /> Add Employee
 </button>
 <button onClick={() => setShowInvite(!showInvite)} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors border border-white/10">
 <UserPlus className="w-4 h-4" /> Invite
 </button>
 </div>
 </motion.div>

 {showInvite && (
 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="liquid-glass rounded-2xl p-5">
 <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">Send Invite Link</p>
 <div className="flex gap-2">
 <input
 readOnly
 value={`${window.location.origin}/onboarding?invite=${user?.company_id}`}
 className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:outline-none"
 />
 <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/onboarding?invite=${user?.company_id}`)} className="px-3 py-2 rounded-xl bg-white/5 text-white text-xs hover:bg-white/10 transition-colors">
 Copy
 </button>
 </div>
 <p className="text-xs text-white/30 mt-2">Share this link with new team members. They can sign up and join your company.</p>
 </motion.div>
 )}

 <div className="liquid-glass rounded-2xl p-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search by name or email..."
 className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
 />
 </div>
 <div className="flex gap-2">
 <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-white/20">
 <option value="" className="bg-slate-900">All Teams</option>
 {teamList.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
 </select>
 <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-white/20">
 <option value="" className="bg-slate-900">All Roles</option>
 {ROLE_OPTIONS.map(r => <option key={r} value={r} className="bg-slate-900 capitalize">{r.replace('_', ' ')}</option>)}
 </select>
 </div>
 </div>
 </div>

 <div className="liquid-glass rounded-2xl overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-white/5">
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Employee</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Team</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Role</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Balance</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Status</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-white/30 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {filtered.map((emp) => {
 const team = teams.find(t => t.id === emp.team_id)
 const balance = getEmployeeBalance(emp.id)
 return (
 <tr key={emp.id} className="hover:bg-white/5 transition-colors">
 <td className="px-6 py-4">
 <div>
 <p className="text-sm text-white/90">{emp.name}</p>
 <p className="text-xs text-white/30">{emp.email}</p>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-white/60">{team?.name || '-'}</td>
 <td className="px-6 py-4">
 <span className="inline-flex px-2 py-1 text-[10px] font-medium rounded-full bg-white/5 text-white/50 capitalize">{emp.role?.replace('_', ' ')}</span>
 </td>
 <td className="px-6 py-4 text-sm text-white/80">${balance.toFixed(2)}</td>
 <td className="px-6 py-4">
 <span className={`inline-flex px-2 py-1 text-[10px] font-medium rounded-full capitalize ${emp.status === 'active' ? 'bg-white/10 text-white/70' : emp.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-red-500/10 text-red-300'}`}>{emp.status}</span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-end gap-1">
 <button onClick={() => openEdit(emp)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
 {emp.status !== 'terminated' && (
 <button onClick={() => handleTerminate(emp.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-red-300 transition-colors" title="Terminate"><Trash2 className="w-4 h-4" /></button>
 )}
 </div>
 </td>
 </tr>
 )
 })}
 {filtered.length === 0 && (
 <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-white/30">No employees found.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="liquid-glass rounded-2xl max-w-md w-full p-6 space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-white/10">
 <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
 <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Full Name</label>
 <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20" />
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Email</label>
 <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={!!editingId} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 disabled:opacity-50" />
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Role</label>
 <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20">
 {ROLE_OPTIONS.map(r => <option key={r} value={r} className="bg-slate-900 capitalize">{r.replace('_', ' ')}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Team</label>
 <select value={form.team_id} onChange={e => setForm(p => ({ ...p, team_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20">
 <option value="" className="bg-slate-900">No team</option>
 {teamList.map(t => <option key={t.id} value={t.id} className="bg-slate-900">{t.name}</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Wallet Address (optional)</label>
 <input value={form.wallet_address} onChange={e => setForm(p => ({ ...p, wallet_address: e.target.value }))} placeholder="Algorand address" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 </div>
 </div>
 <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
 <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
 <button onClick={handleSubmit} disabled={saving || !form.name || !form.email} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors">
 {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </div>
 )
}
