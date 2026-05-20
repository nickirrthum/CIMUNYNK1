import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt     = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
const today   = () => new Date().toISOString().split('T')[0];

const CY = new Date().getFullYear();
const ANOS  = Array.from({ length: 4 }, (_, i) => CY - i);
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const SEL_CLS = 'px-3 py-2 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-xl outline-none hover:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all cursor-pointer';

const STATUS_LABEL = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' };
const TIPO_LABEL   = { fixa: 'Fixa', recorrente: 'Recorrente', esporadica: 'Esporádica', operacional: 'Operacional', 'burocrática': 'Burocrática' };
const STATUS_CLS   = {
  pago:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pendente: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  atrasado: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
};
const STATUS_SELECT_CLS = {
  pago:    'bg-emerald-50 text-emerald-700 border-emerald-300',
  pendente:'bg-amber-50 text-amber-700 border-amber-300',
  atrasado:'bg-rose-50 text-rose-700 border-rose-300',
};
const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`;
const DESPESA_STATUS_OPTS = [['pendente','Pendente'],['pago','Pago'],['atrasado','Atrasado']];

function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      className={`text-[11px] font-semibold px-2 py-1 pr-5 rounded-lg border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${STATUS_SELECT_CLS[value] || 'bg-zinc-100 text-zinc-600 border-zinc-300'}`}
      style={{ backgroundImage: CHEVRON_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      {DESPESA_STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
const TIPO_CLS = {
  fixa: 'bg-violet-50 text-violet-700', recorrente: 'bg-blue-50 text-blue-700',
  esporadica: 'bg-pink-50 text-pink-700', operacional: 'bg-amber-50 text-amber-700',
  'burocrática': 'bg-teal-50 text-teal-700',
};

const EMPTY_DESPESA = { descricao:'', valor:'', tipo:'fixa', status:'pendente', data: today(), observacoes:'' };
const EMPTY_FIXA    = { descricao:'', valor:'', categoria:'fixa', dia_vencimento:'', ativo:1, observacoes:'' };

const Input  = ({ label, ...p }) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">{label}</label>
    <input {...p} className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all" />
  </div>
);
const Select = ({ label, children, ...p }) => (
  <div>
    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">{label}</label>
    <select {...p} className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all cursor-pointer">{children}</select>
  </div>
);

// ─── Tab: Lançamentos ────────────────────────────────────────────────────────

function TabLancamentos({ isAdmin }) {
  const [despesas, setDespesas]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filtroStatus,   setFiltroStatus]   = useState('');
  const [filtroTipo,     setFiltroTipo]     = useState('');
  const [filtroAno,      setFiltroAno]      = useState('');
  const [filtroMes,      setFiltroMes]      = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState(EMPTY_DESPESA);
  const [salvando, setSalvando]   = useState(false);
  const [updating, setUpdating]   = useState(false);
  const [erro, setErro]           = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filtroStatus)   params.status    = filtroStatus;
    if (filtroTipo)     params.tipo      = filtroTipo;
    if (filtroAno)      params.ano       = filtroAno;
    if (filtroMes)      params.mes       = filtroMes;
    if (filtroSemestre) params.semestre  = filtroSemestre;
    const res = await api.get('/despesas', { params });
    setDespesas(res.data);
    setLoading(false);
  }, [filtroStatus, filtroTipo, filtroAno, filtroMes, filtroSemestre]);

  const clearFiltros = () => {
    setFiltroStatus(''); setFiltroTipo('');
    setFiltroAno(''); setFiltroMes(''); setFiltroSemestre('');
  };
  const hasFilter = filtroStatus || filtroTipo || filtroAno || filtroMes || filtroSemestre;

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditando(null); setForm(EMPTY_DESPESA); setErro(''); setShowModal(true); };
  const openEdit = d  => { setEditando(d.id); setForm({ ...d, valor: String(d.valor) }); setErro(''); setShowModal(true); };
  const close    = () => { setShowModal(false); setEditando(null); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault(); setErro(''); setSalvando(true);
    try {
      editando ? await api.put(`/despesas/${editando}`, form) : await api.post('/despesas', form);
      close(); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/despesas/${confirmDelete}`); setConfirmDelete(null); load(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  };

  const updateStatus = async (d, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/despesas/${d.id}`, { ...d, status: newStatus });
      setDespesas(prev => prev.map(x => x.id === d.id ? { ...x, status: newStatus } : x));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar status');
    } finally { setUpdating(false); }
  };

  const total = despesas.reduce((s, d) => s + d.valor, 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{despesas.length} registros · Total: <span className="text-rose-500 font-semibold">{fmt(total)}</span></p>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nova Despesa
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={SEL_CLS}>
          <option value="">Todos os anos</option>
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroMes} onChange={e => { setFiltroMes(e.target.value); if (e.target.value) setFiltroSemestre(''); }} className={SEL_CLS}>
          <option value="">Todos os meses</option>
          {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={filtroSemestre} onChange={e => { setFiltroSemestre(e.target.value); if (e.target.value) setFiltroMes(''); }} className={SEL_CLS}>
          <option value="">Semestre</option>
          <option value="1">1º Semestre</option>
          <option value="2">2º Semestre</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={SEL_CLS}>
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="atrasado">Atrasado</option>
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={SEL_CLS}>
          <option value="">Todos os tipos</option>
          <option value="fixa">Fixa</option>
          <option value="recorrente">Recorrente</option>
          <option value="esporadica">Esporádica</option>
          <option value="operacional">Operacional</option>
          <option value="burocrática">Burocrática</option>
        </select>
        {hasFilter && (
          <button onClick={clearFiltros} className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-zinc-100">
              <tr>
                {['Descrição','Valor','Tipo','Data','Status','Obs.'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-4">{h}</th>
                ))}
                {isAdmin && <th className="px-5 py-4" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {despesas.length === 0 ? (
                <tr><td colSpan={isAdmin ? 7 : 6} className="text-center py-16 text-sm text-zinc-400">Nenhuma despesa encontrada</td></tr>
              ) : despesas.map(d => (
                <tr key={d.id} className="hover:bg-zinc-50/60 transition-colors duration-100">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-900">{d.descricao}</span>
                      {d.gerado_automaticamente === 1 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-semibold ring-1 ring-violet-200">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>
                          Auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-rose-500">{fmt(d.valor)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${TIPO_CLS[d.tipo] || 'bg-zinc-100 text-zinc-500'}`}>
                      {TIPO_LABEL[d.tipo] || d.tipo}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500">{fmtDate(d.data)}</td>
                  <td className="px-5 py-4">
                    {isAdmin ? (
                      <StatusSelect value={d.status} onChange={s => updateStatus(d, s)} disabled={updating} />
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[d.status] || ''}`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-400 max-w-[140px] truncate">{d.observacoes || '—'}</td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                        </button>
                        <button onClick={() => setConfirmDelete(d.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Modal despesa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && close()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editando ? 'Editar Despesa' : 'Nova Despesa'}</h2>
              <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4">
                {erro && <div className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{erro}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Input label="Descrição *" name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Descrição da despesa" /></div>
                  <Input label="Valor (R$) *" name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required placeholder="0,00" />
                  <Input label="Data *" name="data" type="date" value={form.data} onChange={handleChange} required />
                  <Select label="Tipo *" name="tipo" value={form.tipo} onChange={handleChange}>
                    <option value="fixa">Fixa</option><option value="recorrente">Recorrente</option>
                    <option value="esporadica">Esporádica</option><option value="operacional">Operacional</option>
                    <option value="burocrática">Burocrática</option>
                  </Select>
                  <Select label="Status *" name="status" value={form.status} onChange={handleChange}>
                    <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option>
                  </Select>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Observações</label>
                    <textarea name="observacoes" value={form.observacoes || ''} onChange={handleChange} rows={3} placeholder="Informações adicionais..." className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all resize-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100">
                <button type="button" onClick={close} className="px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-4 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Excluir despesa?</h3>
            <p className="text-sm text-zinc-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Tab: Despesas Fixas ─────────────────────────────────────────────────────

function TabDespesasFixas({ isAdmin }) {
  const [fixas, setFixas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FIXA);
  const [salvando, setSalvando]   = useState(false);
  const [erro, setErro]           = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [gerando, setGerando]     = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await api.get('/despesas-fixas');
    setFixas(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setEditando(null); setForm(EMPTY_FIXA); setErro(''); setShowModal(true); };
  const openEdit = f  => { setEditando(f.id); setForm({ ...f, valor: String(f.valor), dia_vencimento: String(f.dia_vencimento) }); setErro(''); setShowModal(true); };
  const close    = () => { setShowModal(false); setEditando(null); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async e => {
    e.preventDefault(); setErro(''); setSalvando(true);
    try {
      editando
        ? await api.put(`/despesas-fixas/${editando}`, form)
        : await api.post('/despesas-fixas', form);
      close(); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/despesas-fixas/${confirmDelete}`); setConfirmDelete(null); load(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  };

  const handleGerar = async () => {
    setGerando(true);
    try {
      const res = await api.post('/despesas-fixas/gerar');
      alert(res.data.mensagem);
      load();
    } catch (err) { alert(err.response?.data?.erro || 'Erro ao gerar'); }
    finally { setGerando(false); }
  };

  const toggleAtivo = async (fixa) => {
    await api.put(`/despesas-fixas/${fixa.id}`, { ativo: fixa.ativo ? 0 : 1 });
    load();
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{fixas.length} modelo(s) cadastrado(s)</p>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button onClick={handleGerar} disabled={gerando} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors disabled:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>
              {gerando ? 'Gerando...' : 'Gerar Hoje'}
            </button>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Nova Despesa Fixa
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" /></div>
      ) : fixas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>
          </div>
          <p className="text-sm text-zinc-400">Nenhuma despesa fixa cadastrada</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {fixas.map(f => (
            <div key={f.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${f.ativo ? 'border-zinc-100' : 'border-zinc-100 opacity-60'}`}>
              <div className="flex items-center gap-4 px-6 py-4">
                {/* Dia vencimento */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-50 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold text-violet-700 leading-none">{f.dia_vencimento}</span>
                  <span className="text-[9px] font-semibold text-violet-400 uppercase tracking-wide mt-0.5">todo mês</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-zinc-900">{f.descricao}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium ${TIPO_CLS[f.categoria] || 'bg-zinc-100 text-zinc-500'}`}>
                      {TIPO_LABEL[f.categoria] || f.categoria}
                    </span>
                    {!f.ativo && <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 text-zinc-400">Inativo</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    {f.ultimo_lancamento ? (
                      <span>Último: <span className="text-zinc-600 font-medium">{fmtDate(f.ultimo_lancamento.data)}</span></span>
                    ) : (
                      <span>Sem lançamentos ainda</span>
                    )}
                    {f.ativo && (
                      <span>Próximo: <span className="text-violet-600 font-medium">{fmtDate(f.proximo_previsto)}</span></span>
                    )}
                    {f.observacoes && <span className="truncate max-w-[200px]">{f.observacoes}</span>}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-base font-bold text-rose-500">{fmt(f.valor)}</p>
                  <p className="text-xs text-zinc-400">por mês</p>
                </div>

                {isAdmin && (
                  <div className="flex-shrink-0 flex items-center gap-1 ml-2">
                    <button
                      onClick={() => toggleAtivo(f)}
                      title={f.ativo ? 'Desativar' : 'Ativar'}
                      className={`p-1.5 rounded-lg transition-colors ${f.ativo ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-100 hover:text-zinc-500'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        {f.ativo
                          ? <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          : <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />}
                      </svg>
                    </button>
                    <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                    </button>
                    <button onClick={() => setConfirmDelete(f.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal despesa fixa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && close()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editando ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}</h2>
              <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4">
                {erro && <div className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{erro}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Input label="Descrição *" name="descricao" value={form.descricao} onChange={handleChange} required placeholder="Ex: Aluguel do Escritório" /></div>
                  <Input label="Valor (R$) *" name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required placeholder="0,00" />
                  <Input label="Dia de Vencimento *" name="dia_vencimento" type="number" min="1" max="31" value={form.dia_vencimento} onChange={handleChange} required placeholder="1–31" />
                  <Select label="Categoria *" name="categoria" value={form.categoria} onChange={handleChange}>
                    <option value="fixa">Fixa</option><option value="recorrente">Recorrente</option>
                    <option value="operacional">Operacional</option><option value="burocrática">Burocrática</option>
                  </Select>
                  {editando && (
                    <Select label="Status" name="ativo" value={String(form.ativo)} onChange={e => setForm(f => ({ ...f, ativo: parseInt(e.target.value) }))}>
                      <option value="1">Ativo</option>
                      <option value="0">Inativo</option>
                    </Select>
                  )}
                  <div className={editando ? 'col-span-2' : 'col-span-2'}>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Observações</label>
                    <textarea name="observacoes" value={form.observacoes || ''} onChange={handleChange} rows={2} placeholder="Informações adicionais..." className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all resize-none" />
                  </div>
                </div>
                <div className="px-3 py-2.5 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-xs text-violet-700">
                    <span className="font-semibold">Como funciona:</span> A cada dia {form.dia_vencimento || '…'} do mês, um lançamento de despesa será criado automaticamente com status <em>Pendente</em>.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100">
                <button type="button" onClick={close} className="px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-4 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Modelo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Excluir modelo?</h3>
            <p className="text-sm text-zinc-500 mb-5">Os lançamentos já gerados não serão afetados.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Despesas() {
  const { user }  = useAuth();
  const isAdmin   = user?.nivel_acesso === 'admin';
  const [tab, setTab] = useState('lancamentos');

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Despesas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Lançamentos e modelos de despesas fixas</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl w-fit">
        {[
          { key: 'lancamentos', label: 'Lançamentos' },
          { key: 'fixas', label: 'Despesas Fixas' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t.label}
            {t.key === 'fixas' && (
              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-violet-600">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>
                Auto
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'lancamentos'
        ? <TabLancamentos isAdmin={isAdmin} />
        : <TabDespesasFixas isAdmin={isAdmin} />
      }
    </div>
  );
}
