import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
const todayStr = () => new Date().toISOString().split('T')[0];

const FORMA_LABEL = { pix: 'Pix', transferencia: 'Transferência', boleto: 'Boleto', cartao: 'Cartão' };
const TIPOS_DESPESA = [
  { value: 'esporadica',   label: 'Esporádica'   },
  { value: 'fixa',         label: 'Fixa'          },
  { value: 'recorrente',   label: 'Recorrente'    },
  { value: 'operacional',  label: 'Operacional'   },
  { value: 'burocrática',  label: 'Burocrática'   },
];

const STATUS_CLS = {
  pago:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pendente: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  atrasado: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
};

const INP = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all bg-white';
const SEL = INP + ' cursor-pointer appearance-none';

// ── Modal: Abrir Caixa ────────────────────────────────────────────────────────
function AbrirCaixaModal({ onConfirm, onClose }) {
  const [saldo, setSaldo] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    await onConfirm(parseFloat(saldo) || 0);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Abrir Caixa</h2>
        <p className="text-sm text-zinc-400 mb-5">Informe o saldo inicial em espécie para hoje.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Saldo Inicial (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={saldo}
              onChange={e => setSaldo(e.target.value)}
              className={INP}
              autoFocus
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Abrindo...' : 'Abrir Caixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: Nova Despesa ───────────────────────────────────────────────────────
function LancamentoModal({ onConfirm, onClose }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    descricao: '', valor: '', tipo_despesa: 'esporadica', observacoes: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    await onConfirm({
      tipo: 'despesa',
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      tipo_despesa: form.tipo_despesa,
      observacoes: form.observacoes || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Nova Despesa</h2>
        <p className="text-sm text-zinc-400 mb-5">Receitas são lançadas automaticamente via orçamentos.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Descrição</label>
            <input required value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Descrição da despesa" className={INP} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Valor (R$)</label>
              <input required type="number" min="0.01" step="0.01" value={form.valor}
                onChange={e => set('valor', e.target.value)} placeholder="0,00" className={INP} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Tipo</label>
              <select value={form.tipo_despesa} onChange={e => set('tipo_despesa', e.target.value)} className={SEL}>
                {TIPOS_DESPESA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Observações</label>
            <input value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
              placeholder="Opcional" className={INP} />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50">
              {saving ? 'Salvando...' : 'Lançar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Row: item de movimentação ─────────────────────────────────────────────────
function MovRow({ item, onTogglePago }) {
  const isReceita = item._tipo === 'receita';
  const isPago    = item.status === 'pago';
  const [toggling, setToggling] = useState(false);

  const handle = async () => {
    setToggling(true);
    await onTogglePago(item._tipo, item.id, isPago ? 'pendente' : 'pago');
    setToggling(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors rounded-xl">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isReceita ? 'bg-emerald-100' : 'bg-rose-100'
      }`}>
        {isReceita
          ? <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" /></svg>
          : <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" /></svg>
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">
          {isReceita ? `${item.cliente} — ${item.servico}` : item.descricao}
        </p>
        {isReceita && item.forma_pagamento && (
          <p className="text-xs text-zinc-400">{FORMA_LABEL[item.forma_pagamento]}</p>
        )}
        {!isReceita && item.tipo && (
          <p className="text-xs text-zinc-400 capitalize">{item.tipo}</p>
        )}
      </div>

      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_CLS[item.status] || STATUS_CLS.pendente}`}>
        {item.status === 'pago' ? 'Pago' : 'Pendente'}
      </span>

      <span className={`text-sm font-semibold tabular-nums ${isReceita ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isReceita ? '+' : '−'}{fmt(item.valor)}
      </span>

      <button onClick={handle} disabled={toggling}
        title={isPago ? 'Marcar como pendente' : 'Marcar como pago'}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
          isPago
            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
        }`}>
        {toggling
          ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        }
      </button>
    </div>
  );
}

// ── Summary Card ─────────────────────────────────────────────────────────────
function SumCard({ label, value, color = 'zinc', sub }) {
  const colors = {
    zinc:    'text-zinc-900',
    emerald: 'text-emerald-600',
    rose:    'text-rose-600',
    blue:    'text-blue-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-zinc-400 mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Caixa() {
  const [sessao,         setSessao]         = useState(null);
  const [receitas,       setReceitas]       = useState([]);
  const [despesas,       setDespesas]       = useState([]);
  const [fixasPendentes, setFixasPendentes] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [showAbrir,      setShowAbrir]      = useState(false);
  const [showLanc,       setShowLanc]       = useState(false);
  const [lancandoFixa,   setLancandoFixa]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/caixa/hoje');
      setSessao(data.sessao);
      setReceitas(data.receitas);
      setDespesas(data.despesas);
      setFixasPendentes(data.fixas_pendentes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAbrir = async (saldo_inicial) => {
    await api.post('/caixa/abrir', { saldo_inicial });
    setShowAbrir(false);
    load();
  };

  const handleLancamento = async (payload) => {
    await api.post('/caixa/lancamento', payload);
    setShowLanc(false);
    load();
  };

  const handleTogglePago = async (tipo, id, novoStatus) => {
    await api.put(`/caixa/pagar/${tipo}/${id}`, { status: novoStatus });
    load();
  };

  const handleLancarFixa = async (id) => {
    setLancandoFixa(id);
    try {
      await api.post(`/caixa/lancar-fixa/${id}`);
      load();
    } finally {
      setLancandoFixa(null);
    }
  };

  // Computed totals
  const totalEntradas  = receitas.filter(r => r.status === 'pago').reduce((a, r) => a + r.valor, 0);
  const totalSaidas    = despesas.filter(d => d.status === 'pago').reduce((a, d) => a + d.valor, 0);
  const saldoFinal     = (sessao?.saldo_inicial || 0) + totalEntradas - totalSaidas;

  const pendRec = receitas.filter(r => r.status !== 'pago').length;
  const pendDesp = despesas.filter(d => d.status !== 'pago').length;

  // Unified sorted list
  const movimentacoes = [
    ...receitas.map(r => ({ ...r, _tipo: 'receita' })),
    ...despesas.map(d => ({ ...d, _tipo: 'despesa' })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const hoje = fmtDate(todayStr());

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {showAbrir && <AbrirCaixaModal onConfirm={handleAbrir} onClose={() => setShowAbrir(false)} />}
      {showLanc  && <LancamentoModal onConfirm={handleLancamento} onClose={() => setShowLanc(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Caixa</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{hoje}</p>
        </div>
        <div className="flex items-center gap-2">
          {sessao ? (
            <button onClick={() => setShowLanc(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Nova Despesa
            </button>
          ) : (
            <button onClick={() => setShowAbrir(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Caixa não aberto */}
      {!sessao && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Caixa não aberto</p>
            <p className="text-xs text-amber-600 mt-0.5">Abra o caixa para registrar movimentações do dia.</p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      {sessao && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SumCard
            label="Saldo Inicial"
            value={fmt(sessao.saldo_inicial)}
            color="blue"
            sub="Abertura do caixa"
          />
          <SumCard
            label="Entradas"
            value={fmt(totalEntradas)}
            color="emerald"
            sub={pendRec > 0 ? `${pendRec} pendente${pendRec > 1 ? 's' : ''}` : 'Todas pagas'}
          />
          <SumCard
            label="Sangria"
            value={fmt(totalSaidas)}
            color="rose"
            sub={pendDesp > 0 ? `${pendDesp} pendente${pendDesp > 1 ? 's' : ''}` : 'Todas pagas'}
          />
          <SumCard
            label="Saldo Final"
            value={fmt(saldoFinal)}
            color={saldoFinal >= 0 ? 'emerald' : 'rose'}
            sub="Inicial + entradas − sangria"
          />
        </div>
      )}

      {/* Despesas fixas pendentes */}
      {fixasPendentes.length > 0 && sessao && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <h2 className="text-sm font-semibold text-zinc-900">Despesas Fixas com Vencimento Hoje</h2>
            <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {fixasPendentes.length} pendente{fixasPendentes.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-zinc-50">
            {fixasPendentes.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{f.descricao}</p>
                  <p className="text-xs text-zinc-400 capitalize">{f.categoria}</p>
                </div>
                <span className="text-sm font-semibold text-rose-600 tabular-nums">
                  −{fmt(f.valor)}
                </span>
                <button
                  onClick={() => handleLancarFixa(f.id)}
                  disabled={lancandoFixa === f.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50">
                  {lancandoFixa === f.id
                    ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                    : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  }
                  Lançar como pago
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Movimentações */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-900">Movimentações de Hoje</h2>
          {movimentacoes.length > 0 && (
            <span className="ml-auto text-xs text-zinc-400">{movimentacoes.length} lançamento{movimentacoes.length > 1 ? 's' : ''}</span>
          )}
          {sessao && (
            <button onClick={() => setShowLanc(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Nova Despesa
            </button>
          )}
        </div>

        {movimentacoes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <svg className="w-8 h-8 text-zinc-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            <p className="text-sm text-zinc-400">
              {sessao ? 'Nenhum lançamento hoje.' : 'Abra o caixa para começar.'}
            </p>
          </div>
        ) : (
          <div className="px-1 py-1">
            {movimentacoes.map(item => (
              <MovRow
                key={`${item._tipo}-${item.id}`}
                item={item}
                onTogglePago={handleTogglePago}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
