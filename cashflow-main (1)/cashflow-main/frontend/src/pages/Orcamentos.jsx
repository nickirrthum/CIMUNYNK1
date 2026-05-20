import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };
const today = () => new Date().toISOString().split('T')[0];

const STATUS_LABEL = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };
const STATUS_CLS   = {
  rascunho: 'bg-zinc-100 text-zinc-600',
  enviado:  'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  aprovado: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  recusado: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
};
const EMPTY_SERVICO = { descricao: '', valor: '' };
const MOMENTO_LABEL = { a_vista: 'À Vista', parcelado: 'Parcelado', entrada_restante: 'Entrada + Restante', recorrente_mensal: 'Recorrente Mensal' };
const EMPTY_FORM    = { cliente: '', email_cliente: '', validade: '', observacoes: '', status: 'rascunho', forma_pagamento: 'transferencia', momento_pagamento: 'a_vista', num_parcelas: '3', valor_entrada: '', data_restante: '' };

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

export default function Orcamentos() {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';

  const [orcamentos, setOrcamentos]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editando, setEditando]       = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [servicos, setServicos]       = useState([{ ...EMPTY_SERVICO }]);
  const [salvando, setSalvando]       = useState(false);
  const [erro, setErro]               = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filtroStatus) params.status = filtroStatus;
    const res = await api.get('/orcamentos', { params });
    setOrcamentos(res.data);
    setLoading(false);
  }, [filtroStatus]);

  useEffect(() => { load(); }, [load]);

  const valorTotal = servicos.reduce((s, i) => s + (parseFloat(i.valor) || 0), 0);

  const openAdd = () => {
    setEditando(null); setForm(EMPTY_FORM); setServicos([{ ...EMPTY_SERVICO }]); setErro(''); setShowModal(true);
  };
  const openEdit = (orc) => {
    setEditando(orc.id);
    setForm({
      cliente: orc.cliente, email_cliente: orc.email_cliente, validade: orc.validade,
      observacoes: orc.observacoes || '', status: orc.status,
      forma_pagamento:   orc.forma_pagamento   || 'transferencia',
      momento_pagamento: orc.momento_pagamento || 'a_vista',
      num_parcelas:      String(orc.num_parcelas || 3),
      valor_entrada:     orc.valor_entrada ? String(orc.valor_entrada) : '',
      data_restante:     orc.data_restante || '',
    });
    setServicos(orc.servicos.map(s => ({ descricao: s.descricao, valor: String(s.valor) })));
    setErro(''); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditando(null); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const addServico    = () => setServicos(s => [...s, { ...EMPTY_SERVICO }]);
  const removeServico = idx => setServicos(s => s.filter((_, i) => i !== idx));
  const updateServico = (idx, field, val) => setServicos(s => s.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const handleSave = async (e) => {
    e.preventDefault(); setErro('');
    const valid = servicos.filter(s => s.descricao.trim() && s.valor);
    if (!valid.length) { setErro('Adicione pelo menos um serviço com descrição e valor'); return; }
    setSalvando(true);
    try {
      const payload = {
        ...form,
        servicos:     valid.map(s => ({ descricao: s.descricao.trim(), valor: parseFloat(s.valor) })),
        valor_total:  valorTotal,
        num_parcelas: form.momento_pagamento === 'parcelado'       ? parseInt(form.num_parcelas) || null : null,
        valor_entrada: form.momento_pagamento === 'entrada_restante' ? parseFloat(form.valor_entrada) || null : null,
        data_restante: form.momento_pagamento === 'entrada_restante' ? form.data_restante || null : null,
      };
      editando ? await api.put(`/orcamentos/${editando}`, payload) : await api.post('/orcamentos', payload);
      closeModal(); load();
    } catch (err) { setErro(err.response?.data?.erro || 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const handleDelete = async () => {
    try { await api.delete(`/orcamentos/${confirmDelete}`); setConfirmDelete(null); load(); }
    catch (err) { alert(err.response?.data?.erro || 'Erro ao excluir'); }
  };

  const copiarLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/orcamento/${token}`);
    setLinkCopiado(token);
    setTimeout(() => setLinkCopiado(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Orçamentos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{orcamentos.length} orçamento(s)</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-xl hover:bg-zinc-800 transition-colors duration-150">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Novo Orçamento
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="px-3 py-2 text-sm text-zinc-700 bg-white border border-zinc-200 rounded-xl outline-none hover:border-zinc-300 focus:ring-2 focus:ring-zinc-900/10 transition-all cursor-pointer">
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option><option value="enviado">Enviado</option>
          <option value="aprovado">Aprovado</option><option value="recusado">Recusado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-zinc-100">
              <tr>
                {['#','Cliente','Email','Serviços','Valor Total','Validade','Status'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-4">{h}</th>
                ))}
                <th className="px-5 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {orcamentos.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-sm text-zinc-400">Nenhum orçamento encontrado</td></tr>
              ) : orcamentos.map(orc => (
                <tr key={orc.id} className="hover:bg-zinc-50/60 transition-colors duration-100">
                  <td className="px-5 py-4 text-xs text-zinc-400 font-mono">#{orc.id}</td>
                  <td className="px-5 py-4 text-sm font-medium text-zinc-900">{orc.cliente}</td>
                  <td className="px-5 py-4 text-sm text-zinc-500">{orc.email_cliente}</td>
                  <td className="px-5 py-4 text-xs text-zinc-400 max-w-[160px]">
                    {orc.servicos.slice(0,2).map(s => s.descricao).join(', ')}
                    {orc.servicos.length > 2 && <span className="ml-1 px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-md">+{orc.servicos.length - 2}</span>}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-blue-600">
                    {fmt(orc.valor_total)}
                    {orc.momento_pagamento && orc.momento_pagamento !== 'a_vista' && (
                      <span className="ml-1.5 text-[10px] font-medium text-zinc-400">{MOMENTO_LABEL[orc.momento_pagamento]}{orc.num_parcelas ? ` ${orc.num_parcelas}x` : ''}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-zinc-500">{fmtDate(orc.validade)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[orc.status] || ''}`}>
                      {STATUS_LABEL[orc.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copiarLink(orc.token_publico)}
                        title={linkCopiado === orc.token_publico ? 'Copiado!' : 'Copiar link público'}
                        className={`p-1.5 rounded-lg transition-colors ${linkCopiado === orc.token_publico ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100'}`}
                      >
                        {linkCopiado === orc.token_publico
                          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>
                        }
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(orc)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>
                          </button>
                          <button onClick={() => setConfirmDelete(orc.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-up">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editando ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
              <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors text-lg leading-none">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="px-6 py-5 space-y-4">
                {erro && <div className="px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600">{erro}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Nome do Cliente *" name="cliente" value={form.cliente} onChange={handleChange} required placeholder="Nome ou empresa" />
                  <Input label="Email *" name="email_cliente" type="email" value={form.email_cliente} onChange={handleChange} required placeholder="cliente@email.com" />
                  <Input label="Validade *" name="validade" type="date" value={form.validade} onChange={handleChange} required />
                  <Select label="Status" name="status" value={form.status} onChange={handleChange}>
                    <option value="rascunho">Rascunho</option><option value="enviado">Enviado</option>
                    <option value="aprovado">Aprovado</option><option value="recusado">Recusado</option>
                  </Select>
                </div>

                {/* Serviços */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Serviços *</label>
                    <button type="button" onClick={addServico} className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Adicionar serviço
                    </button>
                  </div>
                  <div className="space-y-2">
                    {servicos.map((s, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={s.descricao}
                          onChange={e => updateServico(idx, 'descricao', e.target.value)}
                          placeholder="Descrição do serviço"
                          className="flex-1 px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
                        />
                        <input
                          type="number" step="0.01" min="0"
                          value={s.valor}
                          onChange={e => updateServico(idx, 'valor', e.target.value)}
                          placeholder="Valor"
                          className="w-28 px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all"
                        />
                        {servicos.length > 1 && (
                          <button type="button" onClick={() => removeServico(idx)} className="p-2 rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Total preview */}
                  <div className="flex items-center justify-between mt-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <span className="text-xs font-medium text-blue-600">Valor Total</span>
                    <span className="text-base font-bold text-blue-700">{fmt(valorTotal)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Observações</label>
                  <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} placeholder="Condições, prazos, garantias..." className="w-full px-3 py-2.5 text-sm text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl placeholder:text-zinc-300 outline-none focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-all resize-none" />
                </div>

                {/* Condições de Pagamento */}
                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Condições de Pagamento</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Forma de Pagamento" name="forma_pagamento" value={form.forma_pagamento} onChange={handleChange}>
                      <option value="pix">PIX</option>
                      <option value="cartao">Cartão de Crédito</option>
                      <option value="boleto">Boleto</option>
                      <option value="transferencia">Transferência Bancária</option>
                    </Select>
                    <Select label="Tipo de Pagamento" name="momento_pagamento" value={form.momento_pagamento} onChange={handleChange}>
                      <option value="a_vista">À Vista</option>
                      <option value="parcelado">Parcelado</option>
                      <option value="entrada_restante">Entrada + Restante</option>
                    </Select>
                    {form.momento_pagamento === 'parcelado' && (
                      <div className="col-span-2">
                        <Input label="Número de Parcelas" name="num_parcelas" type="number" min="2" max="60" value={form.num_parcelas} onChange={handleChange} placeholder="Ex: 3" />
                        <p className="text-[11px] text-zinc-400 mt-1">Parcelas mensais geradas automaticamente ao aprovar</p>
                      </div>
                    )}
                    {form.momento_pagamento === 'entrada_restante' && (
                      <>
                        <Input label="Valor da Entrada (R$)" name="valor_entrada" type="number" step="0.01" min="0" value={form.valor_entrada} onChange={handleChange} placeholder="0,00" />
                        <Input label="Data do Restante" name="data_restante" type="date" value={form.data_restante} onChange={handleChange} />
                        {form.valor_entrada && valorTotal > 0 && (
                          <div className="col-span-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                            Entrada: {fmt(parseFloat(form.valor_entrada)||0)} · Restante: {fmt(valorTotal-(parseFloat(form.valor_entrada)||0))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-zinc-100">
                <button type="button" onClick={closeModal} className="px-4 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-4 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Criar Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-up">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-900 mb-1">Excluir orçamento?</h3>
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
