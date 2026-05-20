import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

const STATUS_CONFIG = {
  rascunho: { label: 'Em elaboração', cls: 'bg-zinc-100 text-zinc-600' },
  enviado:  { label: 'Aguardando aprovação', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20' },
  aprovado: { label: 'Aprovado', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  recusado: { label: 'Recusado', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20' },
};

export default function OrcamentoPublico() {
  const { token } = useParams();
  const [orc, setOrc]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acao, setAcao]         = useState(null);
  const [resultado, setResultado] = useState(null);
  const [confirmando, setConfirmando] = useState(null);

  useEffect(() => {
    api.get(`/orcamentos/publico/${token}`)
      .then(res => setOrc(res.data))
      .catch(err => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [token]);

  const executarAcao = async (tipo) => {
    setAcao(tipo); setConfirmando(null);
    try {
      const res = await api.put(`/orcamentos/publico/${token}/${tipo}`);
      setResultado({ tipo: 'sucesso', acao: tipo, msg: res.data.mensagem });
      setOrc(prev => ({ ...prev, status: tipo === 'aprovar' ? 'aprovado' : 'recusado' }));
    } catch (err) {
      setResultado({ tipo: 'erro', msg: err.response?.data?.erro || 'Erro ao processar' });
    } finally { setAcao(null); }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
      <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Orçamento não encontrado</h2>
        <p className="text-sm text-zinc-400">O link pode estar incorreto ou o orçamento foi removido.</p>
      </div>
    </div>
  );

  const statusCfg  = STATUS_CONFIG[orc.status] || STATUS_CONFIG.rascunho;
  const podeAgir   = orc.status === 'enviado' && !resultado;
  const valido     = orc.validade >= new Date().toISOString().split('T')[0];
  const emitidoEm  = orc.data_criacao?.split('T')[0] || orc.data_criacao;

  return (
    <div className="min-h-screen bg-zinc-50 flex justify-center px-4 py-12 font-sans">
      <div className="w-full max-w-[600px] animate-fade-up">

        {/* Card */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-[#0A0A0B] px-8 py-7">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">FC</span>
                </div>
                <span className="text-white/80 text-sm font-medium">Fluxo de Caixa</span>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-xs mb-1">Orçamento</p>
                <p className="text-white font-bold text-xl tracking-tight">#{orc.id}</p>
                <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-lg text-xs font-medium ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="divide-y divide-zinc-100">

            {/* Resultado */}
            {resultado && (
              <div className={`mx-6 mt-6 px-5 py-4 rounded-xl text-center ${resultado.tipo === 'sucesso' ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                <p className={`text-sm font-semibold ${resultado.tipo === 'sucesso' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {resultado.tipo === 'sucesso'
                    ? (resultado.acao === 'aprovar' ? '🎉 Orçamento aprovado com sucesso!' : '👋 Orçamento recusado')
                    : `⚠️ ${resultado.msg}`}
                </p>
                {resultado.tipo === 'sucesso' && resultado.acao === 'aprovar' && (
                  <p className="text-xs text-emerald-600 mt-1">O prestador foi notificado e irá entrar em contato.</p>
                )}
              </div>
            )}

            {/* Destinatário */}
            <div className="px-8 py-6">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Destinatário</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Cliente', val: orc.cliente },
                  { label: 'Email', val: orc.email_cliente },
                  {
                    label: 'Validade',
                    val: fmtDate(orc.validade),
                    extra: !valido ? <span className="text-rose-500 text-xs ml-1">(expirado)</span> : null,
                    valCls: valido ? 'text-emerald-600 font-semibold' : 'text-rose-500 font-semibold'
                  },
                  { label: 'Emissão', val: fmtDate(emitidoEm) },
                ].map(({ label, val, extra, valCls }) => (
                  <div key={label}>
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className={`text-sm font-medium text-zinc-800 ${valCls || ''}`}>{val}{extra}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Serviços */}
            <div className="px-8 py-6">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">Serviços</p>
              <div className="rounded-xl border border-zinc-100 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] px-4 py-2.5 bg-zinc-50 border-b border-zinc-100">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Descrição</span>
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Valor</span>
                </div>
                {orc.servicos.map((s, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto] px-4 py-3.5 border-b border-zinc-50 last:border-0">
                    <span className="text-sm text-zinc-700">{s.descricao}</span>
                    <span className="text-sm font-medium text-zinc-900">{fmt(s.valor)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] px-4 py-4 bg-zinc-50 border-t-2 border-zinc-100">
                  <span className="text-sm font-bold text-zinc-900">Total</span>
                  <span className="text-lg font-bold text-zinc-900">{fmt(orc.valor_total)}</span>
                </div>
              </div>
            </div>

            {/* Observações */}
            {orc.observacoes && (
              <div className="px-8 py-6">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Observações</p>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap bg-zinc-50 rounded-xl px-4 py-3 border border-zinc-100">{orc.observacoes}</p>
              </div>
            )}

            {/* Ações */}
            {podeAgir && !confirmando && (
              <div className="px-8 py-6">
                <p className="text-xs text-zinc-400 text-center mb-4">Revise os serviços acima e confirme sua decisão</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmando('recusar')}
                    disabled={!!acao}
                    className="flex-1 py-3 text-sm font-medium text-rose-600 border-2 border-rose-200 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => setConfirmando('aprovar')}
                    disabled={!!acao}
                    className="flex-[2] py-3 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    ✓ Aprovar Orçamento — {fmt(orc.valor_total)}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmação */}
            {confirmando && (
              <div className={`px-8 py-6 ${confirmando === 'aprovar' ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
                <p className="text-sm font-semibold text-zinc-900 text-center mb-1">
                  {confirmando === 'aprovar' ? `Confirmar aprovação de ${fmt(orc.valor_total)}?` : 'Confirmar recusa do orçamento?'}
                </p>
                <p className="text-xs text-zinc-500 text-center mb-5">
                  {confirmando === 'aprovar'
                    ? 'Ao aprovar, o prestador será notificado e iniciará o serviço.'
                    : 'Você poderá entrar em contato para negociar novos termos.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmando(null)} disabled={!!acao} className="flex-1 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl hover:bg-white transition-colors disabled:opacity-50">
                    Voltar
                  </button>
                  <button
                    onClick={() => executarAcao(confirmando)}
                    disabled={!!acao}
                    className={`flex-[2] py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 ${confirmando === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-500 hover:bg-rose-600'}`}
                  >
                    {acao ? 'Processando...' : confirmando === 'aprovar' ? 'Sim, aprovar' : 'Sim, recusar'}
                  </button>
                </div>
              </div>
            )}

            {/* Status final (já decidido, sem resultado novo) */}
            {!resultado && orc.status === 'aprovado' && (
              <div className="px-8 py-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <span className="text-sm font-semibold text-emerald-700">Este orçamento foi aprovado</span>
                </div>
              </div>
            )}
            {!resultado && orc.status === 'recusado' && (
              <div className="px-8 py-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  <span className="text-sm font-semibold text-rose-700">Este orçamento foi recusado</span>
                </div>
              </div>
            )}
            {!resultado && orc.status === 'rascunho' && (
              <div className="px-8 py-6 text-center">
                <p className="text-sm text-zinc-400">Este orçamento ainda não foi enviado para aprovação.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-zinc-100 bg-zinc-50">
            <p className="text-[11px] text-zinc-400 text-center">Gerado pelo sistema Fluxo de Caixa</p>
          </div>
        </div>

      </div>
    </div>
  );
}
