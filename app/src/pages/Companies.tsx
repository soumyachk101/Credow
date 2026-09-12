import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCompanyStore } from '@/stores/companyStore'
import { motion } from 'framer-motion'
import { Plus, Search, Globe, Users, Wallet, MoreVertical, Trash2, Edit3, ChevronRight, X } from 'lucide-react'

const fmt = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v)

export default function Companies() {
 const { user } = useAuthStore()
 const { companies, fetchCompanies, loading } = useCompanyStore()
 const [search, setSearch] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [editingId, setEditingId] = useState<string | null>(null)
 const [form, setForm] = useState({ name: '', slug: '', wallet_address: '' })
 const [saving, setSaving] = useState(false)

 useEffect(() => {
 if (user?.role === 'super_admin') {
 fetchCompanies()
 }
 }, [user?.role, fetchCompanies])

 if (user?.role !== 'super_admin') {
 return <Navigate to="/dashboard" replace />
 }

 const filtered = companies.filter(c =>
 c.name.toLowerCase().includes(search.toLowerCase()) ||
 c.slug.toLowerCase().includes(search.toLowerCase())
 )

 const handleSubmit = async () => {
 if (!form.name || !form.slug) return
 setSaving(true)
 try {
 if (editingId) {
 await supabaseUpdateCompany(editingId, { name: form.name, wallet_address: form.wallet_address })
 } else {
 await supabaseCreateCompany(form.name, form.slug, form.wallet_address)
 }
 setShowModal(false)
 setEditingId(null)
 setForm({ name: '', slug: '', wallet_address: '' })
 fetchCompanies()
 } catch (err) { console.error(err) }
 finally { setSaving(false) }
 }

 const openEdit = (company: any) => {
 setEditingId(company.id)
 setForm({ name: company.name, slug: company.slug, wallet_address: company.wallet_address || '' })
 setShowModal(true)
 }

 const handleDelete = async (id: string) => {
 if (!confirm('Delete this company? This cannot be undone.')) return
 await supabaseDeleteCompany(id)
 fetchCompanies()
 }

 return (
 <div className="space-y-6">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Platform Companies
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              Super Admin
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">Manage all companies and tenant organizations on the platform.</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm({ name: '', slug: '', wallet_address: '' }); setShowModal(true) }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all"
        >
          <Plus className="w-4 h-4" /> New Company
        </button>
      </motion.div>

 <div className="liquid-glass rounded-2xl p-4">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
 <input
 type="text"
 value={search}
 onChange={e => setSearch(e.target.value)}
 placeholder="Search companies..."
 className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
 />
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
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Company</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Slug</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Credit Pool</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Wallet</th>
 <th className="px-6 py-3 text-left text-xs font-medium text-white/30 uppercase">Created</th>
 <th className="px-6 py-3 text-right text-xs font-medium text-white/30 uppercase">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-white/5">
 {filtered.map((company) => (
 <tr key={company.id} className="hover:bg-white/5 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"><Globe className="w-4 h-4" /></div>
                  <div>
                    <p className="text-sm font-semibold text-white">{company.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{company.slug}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-xs font-mono text-zinc-400">{company.slug}</td>
              <td className="px-6 py-4 text-sm font-mono text-emerald-400 font-semibold">{fmt(company.credit_pool || 0)}</td>
 <td className="px-6 py-4 text-xs text-white/40 font-mono">{company.wallet_address ? company.wallet_address.slice(0, 8) + '...' : '-'}</td>
 <td className="px-6 py-4 text-xs text-white/40">{new Date(company.created_at).toLocaleDateString()}</td>
 <td className="px-6 py-4">
 <div className="flex items-center justify-end gap-1">
 <button onClick={() => openEdit(company)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-white transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
 <button onClick={() => handleDelete(company.id)} className="p-1.5 rounded-lg hover:bg-white/5 text-white/50 hover:text-red-300 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
 </div>
 </td>
 </tr>
 ))}
 {filtered.length === 0 && (
 <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-white/30">No companies found.</td></tr>
 )}
 </tbody>
 </table>
 </div>
 )}
 </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#0B0D13] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Company' : 'New Company'}</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Slug</label>
                <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} disabled={!!editingId} className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-500/40 disabled:opacity-50 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1 uppercase tracking-wider font-mono">Wallet Address</label>
                <input value={form.wallet_address} onChange={e => setForm(p => ({ ...p, wallet_address: e.target.value }))} placeholder="Optional Algorand address" className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 font-mono" />
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 flex justify-end gap-2.5">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.name || !form.slug} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create Company'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
 </div>
 )
}

// ─── Supabase helpers ───
import { supabase } from '@/lib/supabase'

async function supabaseCreateCompany(name: string, slug: string, _wallet_address?: string) {
  const { data, error } = await supabase.from('companies').insert([{ name, slug }]).select().maybeSingle()
  if (error) throw error
  return data
}

async function supabaseUpdateCompany(id: string, updates: any) {
  const sanitized: any = { name: updates.name }
  if (updates.slug) sanitized.slug = updates.slug
  const { data, error } = await supabase.from('companies').update(sanitized).eq('id', id).select().maybeSingle()
  if (error) throw error
  return data
}

async function supabaseDeleteCompany(id: string) {
  const { error } = await supabase.from('companies').delete().eq('id', id)
  if (error) throw error
}
