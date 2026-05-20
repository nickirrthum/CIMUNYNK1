import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
const today = () => new Date().toISOString().split('T')[0];

const CY = new Date().getFullYear();
const ANOS       = Array.from({ length: 4 }, (_, i) => CY - i);
const MESES      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_LONG = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function groupByMonth(list) {
  const map = {};
  list.forEach(r => {
    const [y, m] = (r.data || '').split('-');
    if (!y || !m) return;
    const key = `${y}-${m}`;
    if (!map[key]) map[key] = { label: `${MESES_LONG[parseInt(m, 10) - 1]} ${y}`, items: [], total: 0, recebido: 0 };
    map[key].items.push(r);
    map[key].total += r.valor;
    if (r.status === 'pago') map[key].recebido += r.valor;
  });
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, g]) => g);
}
const SEL_CLS = 'px-3 py-2 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-xl outline-none hover:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all cursor-pointer';

const STATUS_LABEL  = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', cancelado: 'Cancelado' };
const FORMA_LABEL   = { pix: 'PIX', cartao: 'Cartão', boleto: 'Boleto', transferencia: 'Transferência', dinheiro: 'Dinheiro', permuta: 'Permuta' };
const MOMENTO_LABEL = { a_vista: 'À Vista', parcelado: 'Parcelado', recorrente_mensal: 'Recorrente Mensal', entrada_restante: 'Entrada + Restante' };
const STATUS_CLS    = {
  pago:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pendente: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  atrasado: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  cancelado:'bg-zinc-100 text-zinc-500',
};
const STATUS_SELECT_CLS = {
  pago:     'bg-emerald-50 text-emerald-700 border-emerald-300',
  pendente: 'bg-amber-50 text-amber-700 border-amber-300',
  atrasado: 'bg-rose-50 text-rose-700 border-rose-300',
  cancelado:'bg-zinc-100 text-zinc-600 border-zinc-300',
};
const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`;

function StatusSelect({ value, onChange, disabled, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      className={`text-[11px] font-semibold px-2 py-1 pr-5 rounded-lg border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${STATUS_SELECT_CLS[value] || 'bg-zinc-100 text-zinc-600 border-zinc-300'}`}
      style={{ backgroundImage: CHEVRON_SVG, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
const RECEITA_STATUS_OPTS = [['pendente','Pendente'],['pago','Pago'],['atrasado','Atrasado'],['cancelado','Cancelado']];

const EMPTY = { cliente:'', servico:'', valor:'', status:'pendente', data: today(), forma_pagamento:'pix', momento_pagamento:'a_vista', observacoes:'', num_parcelas:'3', valor_entrada:'', data_restante:'' };

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

export default function Receitas() {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';

  const [receitas, setReceitas]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtroStatus,   setFiltroStatus]   = useState('');
  const [filtroMomento,  setFiltroMomento]  = useState('');
  const [filtroForma,    setFiltroForma]    = useState('');
  const [filtroAno,      setFiltroAno]      = useState('');
  const [filtroMes,      setFiltroMes]      = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(EMPTY);
  const [salvando, setSalvando]       = useState(false);
  const [updating, setUpdating]       = useState(false);
  const [erro, setErro]               = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filtroStatus)   params.status            = filtroStatus;
    if (filtroMomento)  params.momento_pagamento = filtroMomento;
    if (filtroForma)    params.forma_pagamento   = filtroForma;
    if (filtroAno)      params.ano               = filtroAno;
    if (filtroMes)      params.mes               = filtroMes;
    if (filtroSemestre) params.semestre          = filtroSemestre;
    const res = await api.get('/receitas', { params });
    setReceitas(res.data);
    setLoading(false);
  }, [filtroStatus, filtroMomento, filtroForma, filtroAno, filtroMes, filtroSemestre]);

  const clearFiltros = () => {
    setFiltroStatus(''); setFiltroMomento(''); setFiltroForma('');
    setFiltroAno(''); setFiltroMes(''); setFiltroSemestre('');
  };
  const hasFilter = filtroStatus || filtroMomento || filtroForma || filtroAno || filtroMes || filtroSemestre;

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setEditando(null); setForm(EMPTY); setErro(''); setShowModal(true); };
  const openEdit = (r) => { setEditando(r.id); setForm({ ...r, valor: String(r.valor) }); setErro(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditando(null); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault(); setErro(''); setSalvando(true);
    try {
      if (editando) {
        await api.put(`/receitas/${editando}`, form);
      } else {
        const payload = { ...form };
        if (form.momento_pagamento === 'parcelado') payload.num_parcelas = parseInt(form.num_parcelas) || 3;
        if (form.momento_pagamento === 'entrada_restante') {
          payload.valor_entrada = parseFloat(form.valor_entrada);
          payload.data_restante = form.data_restante;
        }
        await api.post('/receitas', payload);
      }
      closeModal(); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/receitas/${confirmDelete}`); setConfirmDelete(null); load(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  };

  const updateStatus = async (r, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/receitas/${r.id}`, { ...r, status: newStatus });
      setReceitas(prev => prev.map(x => x.id === r.id ? { ...x, status: newStatus } : x));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar status');
    } finally { setUpdating(false); }
  };

  const recebido  = receitas.filter(r => r.status === 'pago').reduce((s, r) => s + r.valor, 0);
  const aReceber  = receitas.filter(r => r.status === 'pendente').reduce((s, r) => s + r.valor, 0);
  const atrasado  = receitas.filter(r => r.status === 'atrasado').reduce((s, r) => s + r.valor, 0);
  const grupos    = groupByMonth(receitas);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Receitas</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{receitas.length} registro{receitas.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Nova Receita
          </button>
        )}
      </div>

      {/* Filters */}
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
          <option value="cancelado">Cancelado</option>
        </select>
        <select value={filtroForma} onChange={e => setFiltroForma(e.target.value)} className={SEL_CLS}>
          <option value="">Todas as formas</option>
          <option value="pix">PIX</option>
          <option value="cartao">Cartão</option>
          <option value="boleto">Boleto</option>
          <option value="transferencia">Transferência</option>
        </select>
        <select value={filtroMomento} onChange={e => setFiltroMomento(e.target.value)} className={SEL_CLS}>
          <option value="">Todos os tipos</option>
          <option value="a_vista">À Vista</option>
          <option value="parcelado">Parcelado</option>
          <option value="entrada_restante">Entrada + Restante</option>
          <option value="recorrente_mensal">Recorrente Mensal</option>
        </select>
        {hasFilter && (
          <button onClick={clearFiltros} className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Recebido</p>
            <p className="text-xl font-bold text-emerald-600 tabular-nums">{fmt(recebido)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{receitas.filter(r => r.status === 'pago').length} pago{receitas.filter(r => r.status === 'pago').length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">A Receber</p>
            <p className="text-xl font-bold text-amber-500 tabular-nums">{fmt(aReceber)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{receitas.filter(r => r.status === 'pendente').length} pendente{receitas.filter(r => r.status === 'pendente').length !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1">Atrasado</p>
            <p className="text-xl font-bold text-rose-500 tabular-nums">{fmt(atrasado)}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{receitas.filter(r => r.status === 'atrasado').length} atrasado{receitas.filter(r => r.status === 'atrasado').length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* Table grouped by month */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" /></div>
      ) : receitas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm flex items-center justify-center py-16 text-sm text-zinc-400">
          Nenhuma receita encontrada
        </div>
      ) : (
        <div className="space-y-4">
          {grupos.map(grupo => (
            <div key={grupo.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
              {/* Month header */}
              <div className="flex items-center justify-between px-5 py-3 bg-zinc-50 border-b border-zinc-100">
                <span className="text-sm font-semibold text-zinc-700">{grupo.label}</span>
                <div className="flex items-center gap-3">
                  {grupo.recebido > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">{fmt(grupo.recebido)} recebido</span>
                  )}
                  <span className="text-xs font-semibold text-zinc-500">{fmt(grupo.total)} total · {grupo.items.length} registro{grupo.items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-zinc-100">
                    <tr>
                      {['Cliente','Serviço','Valor','Status','Data','Forma Pag.','Tipo'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">{h}</th>
                      ))}
                      {isAdmin && <th className="px-5 py-3" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {grupo.items.map(r => (
                      <tr key={r.id} className="hover:bg-zinc-50/60 transition-colors duration-100">
                        <td className="px-5 py-3.5 text-sm font-medium text-zinc-900">{r.cliente}</td>
                        <td className="px-5 py-3.5 text-sm text-zinc-600">{r.servico}</td>
                        <td className="px-5 py-3.5 text-sm font-semibold text-emerald-600">{fmt(r.valor)}</td>
                        <td className="px-5 py-3.5">
                          {isAdmin ? (
                            <StatusSelect value={r.status} onChange={s => updateStatus(r, s)} disabled={updating} options={RECEITA_STATUS_OPTS} />
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[r.status] || ''}`}>
                              {STATUS_LABEL[r.status]}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-zinc-500">{fmtDate(r.data)}</td>
                        <td className="px-5 py-3.5 text-sm text-zinc-500">{FORMA_LABEL[r.forma_pagamento]}</td>
                        <td className="px-5 py-3.5 text-xs text-zinc-400">
                          {MOMENTO_LABEL[r.momento_pagamento]}
                          {r.parcela_total > 1 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-md font-mono">
                              {r.parcela_numero}/{r.parcela_total}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                              </button>
                              <button onClick={() => setConfirmDelete(r.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
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
          ))}
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editando ? 'Editar Receita' : 'Nova Receita'}</h2>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4">
                {erro && <div className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{erro}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><Input label="Cliente *" name="cliente" value={form.cliente} onChange={handleChange} required placeholder="Nome do cliente" /></div>
                  <div className="col-span-2"><Input label="Serviço Prestado *" name="servico" value={form.servico} onChange={handleChange} required placeholder="Descrição do serviço" /></div>
                  <Input label="Valor (R$) *" name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required placeholder="0,00" />
                  <Input label="Data *" name="data" type="date" value={form.data} onChange={handleChange} required />
                  <Select label="Status *" name="status" value={form.status} onChange={handleChange}>
                    <option value="pendente">Pendente</option><option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option><option value="cancelado">Cancelado</option>
                  </Select>
                  <Select label="Forma de Pagamento *" name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange}>
                    <option value="pix">PIX</option><option value="cartao">Cartão de Crédito</option>
                    <option value="boleto">Boleto</option><option value="transferencia">Transferência Bancária</option>
                  </Select>
                  <div className="col-span-2">
                    <Select label="Momento do Pagamento *" name="momento_pagamento" value={form.momento_pagamento} onChange={handleChange}>
                      <option value="a_vista">À Vista</option>
                      <option value="parcelado">Parcelado</option>
                      <option value="entrada_restante">Entrada + Restante</option>
                      <option value="recorrente_mensal">Recorrente Mensal</option>
                    </Select>
                  </div>
                  {!editando && form.momento_pagamento === 'parcelado' && (
                    <div className="col-span-2">
                      <Input label="Número de Parcelas *" name="num_parcelas" type="number" min="2" max="60" value={form.num_parcelas} onChange={handleChange} required placeholder="Ex: 3" />
                      <p className="text-[11px] text-zinc-400 mt-1">Os lançamentos serão criados mensalmente a partir da data informada</p>
                    </div>
                  )}
                  {!editando && form.momento_pagamento === 'entrada_restante' && (
                    <>
                      <Input label="Valor da Entrada (R$) *" name="valor_entrada" type="number" step="0.01" min="0" value={form.valor_entrada} onChange={handleChange} required placeholder="0,00" />
                      <Input label="Data do Restante *" name="data_restante" type="date" value={form.data_restante} onChange={handleChange} required />
                      {form.valor && form.valor_entrada && (
                        <div className="col-span-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                          Entrada: {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parseFloat(form.valor_entrada)||0)} · Restante: {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format((parseFloat(form.valor)||0)-(parseFloat(form.valor_entrada)||0))}
                        </div>
                      )}
                    </>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Observações</label>
                    <textarea name="observacoes" value={form.observacoes || ''} onChange={handleChange} placeholder="Informações adicionais..." rows={3} className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all resize-none" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100">
                <button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Receita'}
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
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Excluir receita?</h3>
            <p className="text-sm text-zinc-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-xl hover:bg-rose-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
