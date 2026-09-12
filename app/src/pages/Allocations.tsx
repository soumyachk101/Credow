import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAllocationStore } from '@/stores/allocationStore'
import { motion } from 'framer-motion'
import { Plus, Search, Pause, Play, X } from 'lucide-react'

const fmtCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v)

export default function Allocations() {
 const { user } = useAuthStore()
 const { allocations, fetchAllocations, createAllocation, updateAllocation } = useAllocationStore()
 const [teams, setTeams] = useState<any[]>([])
 const [employees, setEmployees] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [showModal, setShowModal] = useState(false)
 const [filterTeam, setFilterTeam] = useState('')
 const [filterStatus, setFilterStatus] = useState('')
 const [searchQuery, setSearchQuery] = useState('')
 const [formData, setFormData] = useState({ team_id: '', employee_id: '', period_start: '', period_end: '', total_credits: '' })

 useEffect(() => {
 if (!user?.company_id) return
 const companyId = user.company_id
 const loadData = async () => {
 setLoading(true)
 try {
 await Promise.all([fetchAllocations(companyId)])
 const { data: t } = await supabase.from('teams').select('*').eq('company_id', companyId); setTeams(t || [])
 const { data: e } = await supabase.from('employees').select('*').eq('company_id', companyId); setEmployees(e || [])
 } catch (err) { console.error(err) }
 finally { setLoading(false) }
 }
 loadData()
 }, [user?.company_id, fetchAllocations])

 const handleCreateAllocation = async () => {
 if (!formData.team_id || !formData.employee_id || !formData.total_credits) return
 const amount = parseFloat(formData.total_credits)
 if (isNaN(amount) || amount <= 0) return
 try {
 await createAllocation({
 company_id: user!.company_id!,
 team_id: formData.team_id,
 employee_id: formData.employee_id,
 period_start: formData.period_start || new Date().toISOString().split('T')[0],
 period_end: formData.period_end || '',
 total_credits: amount,
 })
 setShowModal(false)
 setFormData({ team_id: '', employee_id: '', period_start: '', period_end: '', total_credits: '' })
 } catch (err) { console.error(err) }
 }

 const filtered = allocations.filter((a: any) => {
 if (filterTeam && a.team_id !== filterTeam) return false
 if (filterStatus && a.status !== filterStatus) return false
 if (searchQuery) {
 const emp = employees.find((e: any) => e.id === a.employee_id)
 const team = teams.find((t: any) => t.id === a.team_id)
 const s = ((emp?.name || '') + ' ' + (emp?.email || '') + ' ' + (team?.name || '')).toLowerCase()
 if (!s.includes(searchQuery.toLowerCase())) return false
 }
 return true
 })

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Credit Allocations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Corporate Ledger
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">Manage credit allocations across teams and employees.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
        >
          <Plus className="w-4 h-4" /> New Allocation
        </button>
 </div>

 <div className="liquid-glass rounded-2xl p-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <div className="flex-1 relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
 <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20" />
 </div>
        <div className="flex gap-2">
          <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40">
            <option value="" className="bg-[#0B0D13]">All Teams</option>
            {teams.map((team: any) => <option key={team.id} value={team.id} className="bg-[#0B0D13]">{team.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40">
            <option value="" className="bg-[#0B0D13]">All Statuses</option>
            <option value="active" className="bg-[#0B0D13]">Active</option>
            <option value="suspended" className="bg-[#0B0D13]">Suspended</option>
            <option value="terminated" className="bg-[#0B0D13]">Terminated</option>
          </select>
        </div>
 </div>
 </div>

 <div className="liquid-glass rounded-2xl overflow-hidden">
 {loading ? (
 <div className="flex items-center justify-center py-12">
 <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
 </div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="border-b border-white/5">
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Employee</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Team</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Total</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Claimed</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Unclaimed</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Status</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Period</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-white/30 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {filtered.map((allocation: any) => {
 const employee = employees.find((e: any) => e.id === allocation.employee_id)
 const team = teams.find((t: any) => t.id === allocation.team_id)
 const claimPct = allocation.total_credits > 0 ? (allocation.claimed_credits / allocation.total_credits) * 100 : 0
 return (
 <tr key={allocation.id} className="hover:bg-white/5 transition-colors">
 <td className="px-6 py-4">
 <div>
 <p className="text-sm text-white/90">{employee?.name || 'Unknown'}</p>
 <p className="text-xs text-white/30">{employee?.email}</p>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-white/60">{team?.name || '-'}</td>
 <td className="px-6 py-4 text-sm text-white/90">{fmtCurrency(allocation.total_credits)}</td>
              <td className="px-6 py-4">
                <span className="text-sm font-mono text-zinc-300">{fmtCurrency(allocation.claimed_credits)}</span>
                <div className="w-16 h-1.5 rounded-full bg-white/5 mt-1.5 overflow-hidden">
                  <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: Math.min(claimPct, 100) + '%' }} />
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-mono text-emerald-400 font-medium">{fmtCurrency(allocation.unclaimed_credits)}</td>
              <td className="px-6 py-4">
                <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-mono font-medium rounded-full capitalize ${allocation.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : allocation.status === 'suspended' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{allocation.status}</span>
              </td>
 <td className="px-6 py-4 text-xs text-white/40">
 {allocation.period_start ? new Date(allocation.period_start).toLocaleDateString() : '-'}
 {allocation.period_end ? ` - ${new Date(allocation.period_end).toLocaleDateString()}` : ''}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-end gap-1">
 {allocation.status === 'active' ? (
 <button onClick={() => updateAllocation(allocation.id, { status: 'suspended' })} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-yellow-300 transition-colors" title="Suspend"><Pause className="w-4 h-4" /></button>
 ) : (
 <button onClick={() => updateAllocation(allocation.id, { status: 'active' })} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-green-300 transition-colors" title="Activate"><Play className="w-4 h-4" /></button>
 )}
 <button onClick={() => updateAllocation(allocation.id, { status: 'terminated' })} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-red-300 transition-colors" title="Terminate"><X className="w-4 h-4" /></button>
 </div>
 </td>
 </tr>
 )
 })}
 {filtered.length === 0 && (
 <tr><td colSpan={8} className="px-6 py-8 text-center text-sm text-white/30">No allocations found.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B0D13] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">New Allocation</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Team</label>
                <select
                  value={formData.team_id}
                  onChange={e => setFormData(prev => ({ ...prev, team_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                >
                  <option value="" className="bg-[#0B0D13]">Select team</option>
                  {teams.map((team: any) => (
                    <option key={team.id} value={team.id} className="bg-[#0B0D13]">{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={e => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                >
                  <option value="" className="bg-[#0B0D13]">Select employee</option>
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id} className="bg-[#0B0D13]">{emp.name} ({emp.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Credit Amount ($)</label>
                <input
                  type="number"
                  value={formData.total_credits}
                  onChange={e => setFormData(prev => ({ ...prev, total_credits: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Start Date</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={e => setFormData(prev => ({ ...prev, period_start: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">End Date</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={e => setFormData(prev => ({ ...prev, period_end: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAllocation}
                disabled={!formData.team_id || !formData.employee_id || !formData.total_credits}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Create Allocation
              </button>
            </div>
          </div>
        </div>
      )}
 </div>
 )
}
