import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const CATEGORIES = ['Todos', 'Impressões', 'Impressos', 'Placas'];

function marginClass(m) {
  if (m > 40) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (m >= 20) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
}

const EMPTY = { name: '', category: 'Impressões', unit: 'm²', cost_price: '', resale_price: '', final_price: '' };

export default function Products() {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';
  const [products, setProducts] = useState([]);
  const [filter, setFilter]     = useState('Todos');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = filter !== 'Todos' ? `?category=${encodeURIComponent(filter)}` : '';
    api.get(`/products${params}`).then(r => setProducts(r.data)).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setEditing(null); setForm(EMPTY); setModal(true); }
  function openEdit(p) {
    setEditing(p);
    setForm({ name: p.name, category: p.category, unit: p.unit,
      cost_price: p.cost_price, resale_price: p.resale_price ?? '', final_price: p.final_price });
    setModal(true);
  }
  function closeModal() { setModal(false); setEditing(null); setForm(EMPTY); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const cost  = parseFloat(String(form.cost_price).replace(',', '.'));
      const final = parseFloat(String(form.final_price).replace(',', '.'));
      const resale = form.resale_price !== ''
        ? parseFloat(String(form.resale_price).replace(',', '.'))
        : null;

      if (isNaN(cost) || isNaN(final)) {
        alert('Custo e Preço Final devem ser números válidos.');
        return;
      }

      const payload = {
        name:         form.name,
        category:     form.category,
        unit:         form.unit,
        cost_price:   cost,
        final_price:  final,
        resale_price: resale,
      };

      if (editing) await api.put(`/products/${editing.id}`, payload);
      else         await api.post('/products', payload);
      load();
      closeModal();
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      const msg = err.response?.data?.erro
        || err.response?.data?.message
        || (err.response ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}` : err.message);
      alert('Erro: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p) {
    try {
      await api.put(`/products/${p.id}`, { active: p.active ? 0 : 1 });
      load();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar produto.');
    }
  }

  const visible = products.filter(p => filter === 'Todos' || p.category === filter);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Produtos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Catálogo de impressões, impressos e placas</p>
        </div>
        {isAdmin && (
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo Produto
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === c ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {['Nome', 'Categoria', 'Unidade', 'Custo', 'Revenda', 'Preço Final', 'Margem %', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {visible.map(p => (
                <tr key={p.id} className={`hover:bg-zinc-50/60 transition-colors ${!p.active ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-zinc-800">{p.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.category}</td>
                  <td className="px-4 py-3 text-zinc-500">{p.unit}</td>
                  <td className="px-4 py-3 text-zinc-600">{fmt(p.cost_price)}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.resale_price ? fmt(p.resale_price) : <span className="text-zinc-300">—</span>}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{fmt(p.final_price)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${marginClass(p.margin_percent)}`}>
                      {p.margin_percent?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(p)}
                          className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded-lg hover:bg-zinc-100 transition-colors">
                          Editar
                        </button>
                        <button onClick={() => toggleActive(p)}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            p.active ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}>
                          {p.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-zinc-400">Nenhum produto encontrado</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>


      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Categoria *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                    {CATEGORIES.filter(c => c !== 'Todos').map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Unidade</label>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                    {['m²', '1000 un', 'un'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Custo *',        key: 'cost_price',   required: true },
                  { label: 'P. Revenda',     key: 'resale_price', required: false },
                  { label: 'P. Final *',     key: 'final_price',  required: true },
                ].map(({ label, key, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">{label}</label>
                    <input type="number" step="0.01" min="0" required={required}
                      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                  </div>
                ))}
              </div>
              {form.cost_price && form.final_price && (
                <p className="text-xs text-zinc-400">
                  Margem calculada:{' '}
                  <span className={`font-semibold ${
                    ((form.final_price - form.cost_price) / form.final_price * 100) > 40
                      ? 'text-emerald-600' : ((form.final_price - form.cost_price) / form.final_price * 100) >= 20
                        ? 'text-amber-600' : 'text-rose-500'
                  }`}>
                    {((form.final_price - form.cost_price) / form.final_price * 100).toFixed(1)}%
                  </span>
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-60">
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
