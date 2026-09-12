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
 <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
 Companies
 </h1>
 <p className="text-white/40 mt-1 text-sm">Manage all companies on the platform</p>
 </div>
 <button onClick={() => { setEditingId(null); setForm({ name: '', slug: '', wallet_address: '' }); setShowModal(true) }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
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
 <div className="p-2 rounded-xl bg-white/5"><Globe className="w-4 h-4 text-white/50" /></div>
 <div>
 <p className="text-sm text-white/90">{company.name}</p>
 <p className="text-xs text-white/30">{company.slug}</p>
 </div>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-white/50 font-mono text-xs">{company.slug}</td>
 <td className="px-6 py-4 text-sm text-white/80">{fmt(company.credit_pool || 0)}</td>
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
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="liquid-glass rounded-2xl max-w-md w-full p-6 space-y-4">
 <div className="flex justify-between items-center pb-3 border-b border-white/10">
 <h3 className="text-lg font-semibold text-white">{editingId ? 'Edit Company' : 'New Company'}</h3>
 <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
 </div>
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Name</label>
 <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20" />
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Slug</label>
 <input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} disabled={!!editingId} className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-white/20 disabled:opacity-50" />
 </div>
 <div>
 <label className="block text-xs font-medium text-white/40 mb-1 uppercase tracking-wider">Wallet Address</label>
 <input value={form.wallet_address} onChange={e => setForm(p => ({ ...p, wallet_address: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20" />
 </div>
 </div>
 <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
 <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
 <button onClick={handleSubmit} disabled={saving || !form.name || !form.slug} className="px-4 py-2 bg-white text-black text-sm font-medium rounded-xl hover:bg-white/90 disabled:opacity-40 transition-colors">
 {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
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
