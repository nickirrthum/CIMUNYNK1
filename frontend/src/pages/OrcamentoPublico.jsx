import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import ComunynkLogo from '../components/ComunynkLogo';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

const STATUS_CONFIG = {
  rascunho: { label: 'Em elaboração',          cls: 'bg-ink-50 text-ink-600 ring-1 ring-ink-200' },
  enviado:  { label: 'Aguardando aprovação',   cls: 'bg-cmyk-c-soft text-cmyk-c ring-1 ring-cmyk-c-ring' },
  aprovado: { label: 'Aprovado',                cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20' },
  recusado: { label: 'Recusado',                cls: 'bg-cmyk-m-soft text-cmyk-m ring-1 ring-cmyk-m-ring' },
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
    <div className="min-h-screen paper-bg flex items-center justify-center font-sans">
      <div className="cmyk-loader"><span/><span/><span/><span/></div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen paper-bg flex items-center justify-center font-sans p-4">
      <div className="text-center max-w-sm">
        <div className="reg-mark mx-auto mb-6" style={{ width: 48, height: 48 }} />
        <h2 className="text-xl font-extrabold text-ink-900 mb-2 tracking-tight">Orçamento não encontrado</h2>
        <p className="text-sm text-ink-400">O link pode estar incorreto ou o orçamento foi removido.</p>
      </div>
    </div>
  );

  const statusCfg  = STATUS_CONFIG[orc.status] || STATUS_CONFIG.rascunho;
  const podeAgir   = orc.status === 'enviado' && !resultado;
  const valido     = orc.validade >= new Date().toISOString().split('T')[0];
  const emitidoEm  = orc.data_criacao?.split('T')[0] || orc.data_criacao;
  const numFormat  = String(orc.id).padStart(4, '0');

  return (
    <div className="min-h-screen paper-bg flex justify-center px-4 py-10 font-sans relative overflow-hidden">
      {/* Decorative CMYK stripes */}
      <div className="absolute -top-16 -left-16 w-80 h-80 rotate-[-12deg] opacity-[0.06] cmyk-stripe-thin pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-80 h-80 rotate-[-12deg] opacity-[0.06] cmyk-stripe-thin pointer-events-none" />

      <div className="w-full max-w-[700px] animate-fade-up relative z-10">

        {/* Sheet */}
        <div className="bg-white rounded-2xl shadow-ink-md border border-ink-100 overflow-hidden relative">

          {/* Top CMYK strip */}
          <div className="h-2 cmyk-stripe-soft" />

          {/* Header */}
          <div className="px-8 pt-8 pb-6 relative overflow-hidden">
            {/* Diagonal CMYK accent */}
            <div className="absolute -top-6 -right-12 w-64 h-32 rotate-[-12deg] opacity-[0.08] cmyk-stripe pointer-events-none" />
            {/* Registration mark */}
            <div className="absolute top-4 right-4 reg-mark opacity-60" style={{ width: 26, height: 26 }} />

            <div className="flex items-start justify-between gap-6 relative">
              <ComunynkLogo size="md" variant="wordmark" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-ink-400 uppercase tracking-[0.24em] mb-1">Orçamento</p>
                <p className="font-display text-3xl text-ink-900 leading-none tracking-tight">
                  <span className="text-cmyk-m">#</span>{numFormat}
                </p>
                <span className={`inline-flex items-center mt-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${statusCfg.cls}`}>
                  {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Tagline strip */}
          <div className="flex items-center gap-3 px-8 py-3 bg-ink-900 text-white text-[10px] font-semibold tracking-[0.22em] uppercase">
            <span className="w-2 h-2 rounded-full bg-cmyk-c" />
            <span className="w-2 h-2 rounded-full bg-cmyk-m" />
            <span className="w-2 h-2 rounded-full bg-cmyk-y" />
            <span>Impressão · Sinalização · Comunicação Visual</span>
            <span className="flex-1" />
            <span className="text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.06]">CMYK READY</span>
          </div>

          {/* Body */}
          <div className="divide-y divide-ink-100">

            {/* Resultado */}
            {resultado && (
              <div className={`mx-6 mt-6 px-5 py-4 rounded-2xl text-center ${resultado.tipo === 'sucesso' ? 'bg-emerald-50 border border-emerald-200' : 'bg-cmyk-m-soft border border-cmyk-m-ring'}`}>
                <p className={`text-sm font-bold ${resultado.tipo === 'sucesso' ? 'text-emerald-700' : 'text-cmyk-m'}`}>
                  {resultado.tipo === 'sucesso'
                    ? (resultado.acao === 'aprovar' ? 'Orçamento aprovado com sucesso!' : 'Orçamento recusado')
                    : `${resultado.msg}`}
                </p>
                {resultado.tipo === 'sucesso' && resultado.acao === 'aprovar' && (
                  <p className="text-xs text-emerald-600 mt-1">A Comunynk foi notificada e entrará em contato para iniciar a produção.</p>
                )}
              </div>
            )}

            {/* Destinatário */}
            <div className="px-8 py-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-3.5 rounded-sm bg-cmyk-c" />
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-[0.28em]">Destinatário</p>
              </div>
              <div className="bg-paper border border-ink-100 rounded-2xl p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 w-1 cmyk-stripe-soft" />
                <div className="grid grid-cols-2 gap-5 pl-2">
                  {[
                    { label: 'Cliente', val: orc.cliente, big: true },
                    { label: 'Email', val: orc.email_cliente, muted: true },
                    {
                      label: 'Validade',
                      val: fmtDate(orc.validade),
                      extra: !valido ? <span className="text-cmyk-m text-xs ml-1 font-bold">(expirado)</span> : null,
                      valCls: valido ? 'text-emerald-700' : 'text-cmyk-m'
                    },
                    { label: 'Emissão', val: fmtDate(emitidoEm) },
                  ].map(({ label, val, extra, valCls, big, muted }) => (
                    <div key={label}>
                      <p className="text-[9px] font-extrabold text-ink-400 uppercase tracking-[0.22em] mb-1">{label}</p>
                      <p className={`${big ? 'text-base font-bold' : muted ? 'text-sm font-medium' : 'text-sm font-semibold'} ${valCls || 'text-ink-800'}`}>{val}{extra}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Serviços */}
            <div className="px-8 py-7">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-3.5 rounded-sm bg-cmyk-m" />
                <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-[0.28em]">Serviços</p>
              </div>
              <div className="rounded-2xl border border-ink-100 overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] px-5 py-3 bg-ink-900 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Descrição</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Valor</span>
                </div>
                {orc.servicos.map((s, i) => (
                  <div key={i} className={`grid grid-cols-[auto_1fr_auto] gap-3 items-center px-5 py-4 border-b border-ink-100 last:border-0 ${i % 2 ? '' : 'bg-cmyk-c-soft/30'}`}>
                    <span className="font-mono text-[11px] font-bold text-cmyk-m">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-sm font-medium text-ink-800">{s.descricao}</span>
                    <span className="text-sm font-bold text-ink-900 font-mono">{fmt(s.valor)}</span>
                  </div>
                ))}
                <div className="px-5 py-5 bg-ink-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 cmyk-stripe-soft" />
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">Valor Total</p>
                    </div>
                    <p className="font-display text-3xl text-cmyk-y leading-none tracking-tight">
                      <span className="text-sm text-white/70 mr-1.5 font-sans font-semibold">R$</span>
                      {(orc.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            {orc.observacoes && (
              <div className="px-8 py-7">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1 h-3.5 rounded-sm bg-cmyk-y" />
                  <p className="text-[10px] font-extrabold text-ink-500 uppercase tracking-[0.28em]">Observações</p>
                </div>
                <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-wrap bg-paper rounded-2xl px-5 py-4 border border-ink-100">{orc.observacoes}</p>
              </div>
            )}

            {/* Ações */}
            {podeAgir && !confirmando && (
              <div className="px-8 py-7">
                <p className="text-xs text-ink-400 text-center mb-4 tracking-wide">Revise os serviços acima e confirme sua decisão</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmando('recusar')}
                    disabled={!!acao}
                    data-testid="orcamento-recusar-btn"
                    className="flex-1 py-3 text-sm font-bold text-cmyk-m border-2 border-cmyk-m-ring rounded-xl hover:bg-cmyk-m-soft transition-colors disabled:opacity-50"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => setConfirmando('aprovar')}
                    disabled={!!acao}
                    data-testid="orcamento-aprovar-btn"
                    className="flex-[2] py-3 text-sm font-bold text-white bg-ink-900 hover:bg-ink-800 rounded-xl transition-colors disabled:opacity-50 relative overflow-hidden group"
                  >
                    <span className="absolute inset-y-0 left-0 w-1.5 cmyk-stripe-soft" />
                    <span className="relative">Aprovar Orçamento · {fmt(orc.valor_total)}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Confirmação */}
            {confirmando && (
              <div className={`px-8 py-7 ${confirmando === 'aprovar' ? 'bg-emerald-50/50' : 'bg-cmyk-m-soft/40'}`}>
                <p className="text-sm font-bold text-ink-900 text-center mb-1.5">
                  {confirmando === 'aprovar' ? `Confirmar aprovação de ${fmt(orc.valor_total)}?` : 'Confirmar recusa do orçamento?'}
                </p>
                <p className="text-xs text-ink-500 text-center mb-5">
                  {confirmando === 'aprovar'
                    ? 'A Comunynk será notificada e iniciará a produção.'
                    : 'Você poderá entrar em contato para negociar novos termos.'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmando(null)} disabled={!!acao} className="flex-1 py-2.5 text-sm font-medium text-ink-600 border border-ink-200 rounded-xl hover:bg-white transition-colors disabled:opacity-50">
                    Voltar
                  </button>
                  <button
                    onClick={() => executarAcao(confirmando)}
                    disabled={!!acao}
                    data-testid="orcamento-confirmar-btn"
                    className={`flex-[2] py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50 ${confirmando === 'aprovar' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-cmyk-m hover:bg-cmyk-m/90'}`}
                  >
                    {acao ? 'Processando...' : confirmando === 'aprovar' ? 'Sim, aprovar' : 'Sim, recusar'}
                  </button>
                </div>
              </div>
            )}

            {/* Status final */}
            {!resultado && orc.status === 'aprovado' && (
              <div className="px-8 py-7 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  <span className="text-sm font-bold text-emerald-700">Este orçamento foi aprovado</span>
                </div>
              </div>
            )}
            {!resultado && orc.status === 'recusado' && (
              <div className="px-8 py-7 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-cmyk-m-soft border border-cmyk-m-ring rounded-xl">
                  <svg className="w-4 h-4 text-cmyk-m" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                  <span className="text-sm font-bold text-cmyk-m">Este orçamento foi recusado</span>
                </div>
              </div>
            )}
            {!resultado && orc.status === 'rascunho' && (
              <div className="px-8 py-7 text-center">
                <p className="text-sm text-ink-400">Este orçamento ainda não foi enviado para aprovação.</p>
              </div>
            )}

            {/* Terms */}
            <div className="px-8 py-5">
              <div className="rounded-xl px-5 py-4 text-[11px] text-ink-500 leading-relaxed" style={{ background: 'linear-gradient(135deg, rgba(34,184,230,0.05), rgba(229,55,155,0.05))' }}>
                <strong className="text-ink-700 font-bold">Termos & Condições.</strong> Esta proposta é válida pelo prazo informado acima.
                Os valores podem ser revistos após este prazo. Pagamento conforme condições acordadas. Não constitui nota fiscal.
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-ink-900 text-white/70 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-1 cmyk-stripe-soft" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-base leading-none tracking-tight">
                  <span className="text-cmyk-c">CO</span>
                  <span className="text-cmyk-m">MU</span>
                  <span className="text-cmyk-y">NY</span>
                  <span className="text-white">NK</span>
                </p>
                <p className="text-[9px] uppercase tracking-[0.22em] text-white/40 mt-1">Impressão & Comunicação Visual</p>
              </div>
              <p className="text-[10px] text-white/40 text-right tracking-wide">
                Proposta gerada eletronicamente<br/>
                {new Date(orc.data_criacao || Date.now()).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
