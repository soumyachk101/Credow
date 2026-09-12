import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { motion } from 'framer-motion'
import { Plus, Search, Users, MoreVertical, Trash2, Edit3, X, UserPlus } from 'lucide-react'

export default function Teams() {
 const { user } = useAuthStore()
 const { teams, employees, fetchTeams, fetchEmployees, createTeam, updateTeam, deleteTeam } = useCompanyStore()
 const [search, setSearch] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [form, setForm] = useState({ name: '', manager_id: '', budget_pool: '' })
 const [saving, setSaving] = useState(false)

 useEffect(() => {
 if (user?.company_id) {
 fetchTeams(user.company_id)
 fetchEmployees(user.company_id)
 }
 }, [user?.company_id, fetchTeams, fetchEmployees])

 if (user?.role !== 'company_owner' && user?.role !== 'manager') {
 return <Navigate to="/dashboard" replace />
 }

 const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))

 const managers = employees.filter(e => e.role === 'company_owner' || e.role === 'manager')

 const handleSubmit = async () => {
 if (!form.name) return
 setSaving(true)
 try {
 if (editingId) {
 await updateTeam(editingId, {
 name: form.name,
 manager_id: form.manager_id || undefined,
 budget_pool: parseFloat(form.budget_pool) || 0,
 })
 } else {
 await createTeam({
 company_id: user!.company_id!,
 name: form.name,
 manager_id: form.manager_id || undefined,
 budget_pool: parseFloat(form.budget_pool) || 0,
 })
 }
 setShowModal(false)
 setEditingId(null)
 setForm({ name: '', manager_id: '', budget_pool: '' })
 fetchTeams(user!.company_id!)
 } catch (err) { console.error(err) }
 finally { setSaving(false) }
 }

 const openEdit = (team: any) => {
 setEditingId(team.id)
 setForm({ name: team.name, manager_id: team.manager_id || '', budget_pool: String(team.budget_pool || 0) })
 setShowModal(true)
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Delete this team? This cannot be undone.')) return
 await deleteTeam(id)
 fetchTeams(user!.company_id!)
 }

 return (
 <div className="space-y-6">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
 <div>
 <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
 Teams
 </h1>
 <p className="text-white/40 mt-1 text-sm">Organize employees into teams and manage budgets</p>
 </div>
 <button onClick={() => { setEditingId(null); setForm({ name: '', manager_id: '', budget_pool: '' }); setShowModal(true) }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
 <Plus className="w-4 h-4" /> New Team
 </button>
 </motion.div>

 <div className="liquid-glass rounded-2xl p-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search teams..."
 className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filtered.map((team, i) => (
 <motion.div
 key={team.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05 }}
 className="liquid-glass rounded-2xl p-5 flex flex-col"
 >
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-xl bg-white/5"><Users className="w-4 h-4 text-white/50" /></div>
 <div>
 <p className="text-sm font-medium text-white">{team.name}</p>
 <p className="text-xs text-white/30">ID: {team.id.slice(0, 8)}</p>
 </div>
 </div>
 <div className="flex items-center gap-0.5">
 <button onClick={() => openEdit(team)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
 <button onClick={() => handleDelete(team.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-red-300 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
 </div>
 </div>

 <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div>
 <p className="text-[10px] text-white/30 uppercase tracking-wider">Members</p>
 <p className="text-sm text-white/80 font-medium">{team.member_count || 0}</p>
 </div>
 <div>
 <p className="text-[10px] text-white/30 uppercase tracking-wider">Budget</p>
 <p className="text-sm text-white/80 font-medium">${(team.budget_pool || 0).toLocaleString()}</p>
 </div>
 </div>
 </div>
 </motion.div>
 ))}
 {filtered.length === 0 && (
 <div className="col-span-full text-center py-12">
 <Users className="w-8 h-8 text-white/20 mx-auto mb-3" />
 <p className="text-sm text-white/30">{search ? 'No teams match your search.' : 'No teams yet. Create your first team.'}</p>
 </div>
 )}
 </div>

 {showModal && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="liquid-glass rounded-2xl max-w-md w-full p-6 space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-white/10">
 <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Team' : 'New Team'}</h3>
 <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Team Name</label>
 <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20" />
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Manager</label>
 <select value={form.manager_id} onChange={e => setForm(p => ({ ...p, manager_id: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20">
 <option value="" className="bg-slate-900">Select manager</option>
 <option value={user?.id} className="bg-slate-900">Me ({user?.name})</option>
 {managers.map(m => (
 <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Budget Pool ($)</label>
 <input type="number" value={form.budget_pool} onChange={e => setForm(p => ({ ...p, budget_pool: e.target.value }))} placeholder="0.00" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 </div>
 </div>
 <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
 <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
 <button onClick={handleSubmit} disabled={saving || !form.name} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors">
 {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </div>
 )
}
