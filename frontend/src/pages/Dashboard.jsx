import React, { useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import api from '../services/api';

const DCY = new Date().getFullYear();
const D_ANOS  = Array.from({ length: 4 }, (_, i) => DCY - i);
const D_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const SEL_CLS = 'px-3 py-2 text-sm bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300 transition-all cursor-pointer appearance-none';

const fmt     = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtDate = s => { if (!s) return '-'; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; };

const STATUS_LABEL = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', cancelado: 'Cancelado' };
const TIPO_LABEL   = { fixa: 'Fixa', recorrente: 'Recorrente', esporadica: 'Esporádica', operacional: 'Operacional', 'burocrática': 'Burocrática' };

const STATUS_CLS = {
  pago:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  pendente: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  atrasado: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  cancelado:'bg-zinc-100 text-zinc-500',
};

// Comunynk CMYK softened palette
const C = {
  cyan:    '#22B8E6',
  magenta: '#E5379B',
  yellow:  '#E0B617',  // darkened yellow for legibility
  black:   '#2A2A2E',
  // semantic aliases (keeping CMYK soul)
  emerald: '#22B8E6',  // receita / positivo → cyan
  rose:    '#E5379B',  // despesa / negativo → magenta
  blue:    '#22B8E6',
  amber:   '#E0B617',
  indigo:  '#6B5BD2',
  zinc:    '#52525A',
};
const CHART_PALETTE = [C.cyan, C.magenta, C.yellow, C.black, '#6B5BD2', '#7DD3F2'];

const AXIS_COLOR  = '#D8D8DD';
const LABEL_COLOR = '#7C7C85';
const GRID_COLOR  = '#EEEEF1';
const TOOLTIP_STYLE = {
  backgroundColor: '#ffffff',
  borderColor: '#e4e4e7',
  borderWidth: 1,
  textStyle: { color: '#18181b', fontSize: 12 },
  extraCssText: 'border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.10)',
};

// ── Shared components ─────────────────────────────────────────────────────────

function Badge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[status] || 'bg-zinc-100 text-zinc-500'}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function MetricCard({ label, value, sub, color = 'default', icon }) {
  const colorMap = {
    default: { val: 'text-zinc-900',    icon: 'bg-zinc-100 text-zinc-500' },
    green:   { val: 'text-emerald-600', icon: 'bg-emerald-50 text-emerald-600' },
    red:     { val: 'text-rose-500',    icon: 'bg-rose-50 text-rose-500' },
    amber:   { val: 'text-amber-600',   icon: 'bg-amber-50 text-amber-600' },
    blue:    { val: 'text-blue-600',    icon: 'bg-blue-50 text-blue-600' },
  };
  const c = colorMap[color] ?? colorMap.default;
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{label}</p>
        {icon && <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>{icon}</div>}
      </div>
      <p className={`text-2xl font-bold tracking-tight leading-none ${c.val}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-2">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card-print ${className}`}>
      <div className="px-5 pt-5 pb-1">
        <p className="text-sm font-bold text-ink-800 tracking-tight">{title}</p>
        {subtitle && <p className="text-[11px] text-ink-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Chart option builders ─────────────────────────────────────────────────────

function buildBarOption(data) {
  if (!data?.length) return {};
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      formatter: params =>
        `<b style="color:#18181b">${params[0].axisValue}</b><br/>` +
        params.map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmt(p.value)}</b>`).join('<br/>'),
    },
    legend: {
      bottom: 4,
      textStyle: { color: LABEL_COLOR, fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    grid: { left: 0, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.mes),
      axisLine: { lineStyle: { color: AXIS_COLOR } },
      axisTick: { show: false },
      axisLabel: { color: LABEL_COLOR, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: LABEL_COLOR, fontSize: 10, formatter: v => `${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        name: 'Receitas',
        type: 'bar',
        barMaxWidth: 28,
        data: data.map(d => d.receitas ?? 0),
        itemStyle: { color: C.cyan, borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: '#1A9ECF' } },
      },
      {
        name: 'Despesas',
        type: 'bar',
        barMaxWidth: 28,
        data: data.map(d => d.despesas ?? 0),
        itemStyle: { color: '#F4A4CC', borderRadius: [4, 4, 0, 0] },
        emphasis: { itemStyle: { color: C.magenta } },
      },
    ],
  };
}

function buildPieOption(data, nameKey = 'tipo', valueKey = 'total', labelMap = TIPO_LABEL) {
  if (!data?.length) return {};
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'item',
      formatter: p =>
        `<b style="color:${p.color}">${labelMap[p.name] || p.name}</b><br/>${fmt(p.value)}<br/><span style="color:${LABEL_COLOR}">${p.percent}%</span>`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: LABEL_COLOR, fontSize: 10 },
      formatter: name => labelMap[name] || name,
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
    },
    series: [{
      type: 'pie',
      center: ['50%', '44%'],
      radius: ['38%', '66%'],
      padAngle: 3,
      minAngle: 5,
      itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
      emphasis: { scale: true, scaleSize: 6 },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      data: data.map((d, i) => ({
        name: d[nameKey],
        value: d[valueKey],
        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
      })),
    }],
  };
}

function buildTopProdOption(data) {
  if (!data?.length) return {};
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'item',
      formatter: p => `<b style="color:${p.color}">${p.name}</b><br/>${fmt(p.value)}<br/><span style="color:${LABEL_COLOR}">${p.percent}%</span>`,
    },
    legend: {
      bottom: 0,
      textStyle: { color: LABEL_COLOR, fontSize: 10 },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
    },
    series: [{
      type: 'pie',
      center: ['50%', '44%'],
      radius: ['30%', '60%'],
      roseType: 'radius',
      padAngle: 3,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      emphasis: { scale: true, scaleSize: 6 },
      animationType: 'scale',
      animationEasing: 'elasticOut',
      data: data.map((d, i) => ({
        name: d.name,
        value: d.total,
        itemStyle: { color: CHART_PALETTE[i % CHART_PALETTE.length] },
      })),
    }],
  };
}

function buildMargemOption(data) {
  if (!data?.length) return {};
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.04)' } },
      formatter: p => `${p[0].name}: <b>${p[0].value.toFixed(1)}%</b>`,
    },
    grid: { left: 0, right: 16, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: LABEL_COLOR, fontSize: 10, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    yAxis: {
      type: 'category',
      data: data.map(m => m.categoria),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#52525b', fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: data.map(m => ({
        value: m.margem,
        itemStyle: { color: C.cyan, borderRadius: [0, 6, 6, 0] },
      })),
      barMaxWidth: 20,
      emphasis: { itemStyle: { color: '#1A9ECF' } },
      animationEasing: 'elasticOut',
    }],
  };
}

function buildLinhaOption(data) {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...TOOLTIP_STYLE,
      trigger: 'axis',
      formatter: params =>
        `<b style="color:#18181b">${params[0].axisValue}</b><br/>` +
        params.map(p => `<span style="color:${p.color}">●</span> ${p.seriesName}: <b>${fmt(p.value)}</b>`).join('<br/>'),
    },
    legend: {
      bottom: 0,
      textStyle: { color: LABEL_COLOR, fontSize: 11 },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
    },
    grid: { left: 0, right: 16, top: 12, bottom: 28, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map(d => d.mes),
      axisLine: { lineStyle: { color: AXIS_COLOR } },
      axisTick: { show: false },
      axisLabel: { color: LABEL_COLOR, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: LABEL_COLOR, fontSize: 10, formatter: v => `${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: GRID_COLOR } },
    },
    series: [
      {
        type: 'line',
        name: 'Receita',
        data: data.map(d => d.receita ?? 0),
        smooth: true,
        symbolSize: 7,
        symbol: 'circle',
        itemStyle: { color: C.cyan },
        lineStyle: { color: C.cyan, width: 2.5 },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(34,184,230,0.18)' }, { offset: 1, color: 'rgba(34,184,230,0.01)' }] },
        },
      },
      {
        type: 'line',
        name: 'Custo',
        data: data.map(d => d.custo ?? 0),
        smooth: true,
        symbolSize: 6,
        symbol: 'circle',
        itemStyle: { color: C.magenta },
        lineStyle: { color: C.magenta, width: 2, type: 'dashed' },
      },
    ],
  };
}

// ── Breakeven Card ────────────────────────────────────────────────────────────
function BreakevenCard({ data }) {
  const pct     = data?.percentual      ?? 0;
  const pctPend = data?.percentual_pend ?? 0;
  const sup     = data?.superavit       ?? 0;
  const meta    = data?.meta            ?? 0;

  let status, statusColor, barColor, barHex;
  if (pct >= 100) {
    status = 'Equilíbrio atingido'; statusColor = 'text-emerald-600'; barColor = 'bg-emerald-500'; barHex = C.emerald;
  } else if (pct >= 70) {
    status = 'Próximo do equilíbrio'; statusColor = 'text-amber-600'; barColor = 'bg-amber-400'; barHex = C.amber;
  } else {
    status = 'Abaixo do equilíbrio'; statusColor = 'text-rose-500'; barColor = 'bg-rose-400'; barHex = C.rose;
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Ponto de Equilíbrio</p>
            <p className="text-[11px] text-zinc-400 capitalize">{data?.mes ?? 'mês atual'}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold ${statusColor}`}>{status}</span>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-zinc-400">Progresso</span>
          <span className={`text-sm font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-zinc-700'}`}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="relative h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          {pctPend > pct && (
            <div className="absolute inset-y-0 left-0 rounded-full opacity-30 transition-all duration-700"
              style={{ width: `${Math.min(pctPend, 100)}%`, background: barHex }} />
          )}
          <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        {pctPend > pct && pct < 100 && (
          <p className="text-[10px] text-zinc-400">
            Com pendentes: <span className="font-medium text-zinc-500">{pctPend.toFixed(1)}%</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Meta</p>
          <p className="text-sm font-bold text-zinc-700">{fmt(meta)}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">despesas do mês</p>
        </div>
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">Realizado</p>
          <p className="text-sm font-bold text-emerald-700">{fmt(data?.realizado ?? 0)}</p>
          <p className="text-[10px] text-emerald-500/70 mt-0.5">receitas pagas</p>
        </div>
        <div className={`rounded-xl border px-3 py-2.5 ${sup >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${sup >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            {sup >= 0 ? 'Superávit' : 'Déficit'}
          </p>
          <p className={`text-sm font-bold ${sup >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{fmt(Math.abs(sup))}</p>
        </div>
      </div>
    </div>
  );
}

// ── Movimentações Modal ───────────────────────────────────────────────────────
function MovimentacoesModal({ data, onClose }) {
  const movs = data?.movimentacoes || [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Movimentações Recentes</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Últimas {movs.length} movimentações registradas</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto p-3 space-y-0.5">
          {movs.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">Nenhuma movimentação encontrada</div>
          ) : movs.map((m, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.tipo === 'receita' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                  {m.tipo === 'receita' ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800 leading-tight">{m.descricao}</p>
                  <p className="text-xs text-zinc-400 leading-tight mt-0.5">
                    {m.tipo === 'receita' ? 'Entrada' : 'Saída'} · {fmtDate(m.data?.split?.('T')[0] ?? m.data)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                <span className={`text-sm font-semibold ${m.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {m.tipo === 'receita' ? '+' : '−'}{fmt(m.valor)}
                </span>
                <Badge status={m.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Caixa Widget ──────────────────────────────────────────────────────────────
function CaixaWidget({ data, onOpenModal }) {
  const saldoPositivo = (data?.saldo_hoje ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H18M2.25 10.5H3.375c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125H2.25" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Caixa</p>
            <p className="text-[11px] text-zinc-400">Movimentações de hoje</p>
          </div>
        </div>
        <button onClick={onOpenModal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          Ver movimentações
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-widest mb-1.5">Entradas</p>
          <p className="text-lg font-bold text-emerald-700 leading-none">{fmt(data?.entradas_hoje ?? 0)}</p>
          <p className="text-[10px] text-emerald-500/70 mt-1">receitas pagas hoje</p>
        </div>
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-3.5">
          <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-widest mb-1.5">Saídas</p>
          <p className="text-lg font-bold text-rose-600 leading-none">{fmt(data?.saidas_hoje ?? 0)}</p>
          <p className="text-[10px] text-rose-400/70 mt-1">despesas pagas hoje</p>
        </div>
        <div className={`rounded-xl border p-3.5 ${saldoPositivo ? 'bg-blue-50 border-blue-100' : 'bg-rose-50 border-rose-100'}`}>
          <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${saldoPositivo ? 'text-blue-600' : 'text-rose-500'}`}>
            Saldo do Dia
          </p>
          <p className={`text-lg font-bold leading-none ${saldoPositivo ? 'text-blue-700' : 'text-rose-600'}`}>
            {fmt(data?.saldo_hoje ?? 0)}
          </p>
          <p className={`text-[10px] mt-1 ${saldoPositivo ? 'text-blue-500/70' : 'text-rose-400/70'}`}>entradas − saídas</p>
        </div>
      </div>
    </div>
  );
}

// ── CountUp hook ──────────────────────────────────────────────────────────────
function useCountUp(target, duration = 1200) {
  const [val, setVal] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target == null) return;
    const range = target;
    const startTime = performance.now();
    function tick(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(range * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [resumo, setResumo]         = useState(null);
  const [grafico, setGrafico]       = useState([]);
  const [pendentes, setPendentes]   = useState({ receitas: [], despesas: [] });
  const [categorias, setCategorias] = useState([]);
  const [projecao, setProjecao]     = useState([]);
  const [margens, setMargens]       = useState([]);
  const [topProd, setTopProd]       = useState([]);
  const [recCusto, setRecCusto]     = useState([]);
  const [ticket, setTicket]         = useState(null);
  const [caixa, setCaixa]           = useState(null);
  const [showCaixa, setShowCaixa]   = useState(false);
  const [equilibrio, setEquilibrio] = useState(null);
  const [loading, setLoading]       = useState(true);

  const [fAno,      setFAno]      = useState('');
  const [fMes,      setFMes]      = useState('');
  const [fSemestre, setFSemestre] = useState('');
  const [fCliente,  setFCliente]  = useState('');
  const [applied, setApplied]     = useState({ ano: '', mes: '', semestre: '', client_type: '' });

  const ticketRevenda = useCountUp(ticket?.revenda ?? null);
  const ticketFinal   = useCountUp(ticket?.final   ?? null);

  const handleSearch = () => setApplied({ ano: fAno, mes: fMes, semestre: fSemestre, client_type: fCliente });
  const handleClear  = () => {
    setFAno(''); setFMes(''); setFSemestre(''); setFCliente('');
    setApplied({ ano: '', mes: '', semestre: '', client_type: '' });
  };

  useEffect(() => {
    setLoading(true);
    const cp = {};
    if (applied.ano)         cp.ano         = applied.ano;
    if (applied.mes)         cp.mes         = applied.mes;
    if (applied.semestre)    cp.semestre    = applied.semestre;
    if (applied.client_type) cp.client_type = applied.client_type;

    const get  = url => api.get(url).then(r => r.data).catch(() => null);
    const getF = url => api.get(url, { params: cp }).then(r => r.data).catch(() => null);

    Promise.all([
      getF('/dashboard/resumo'),
      getF('/dashboard/grafico-mensal'),
      get('/dashboard/pendentes'),
      getF('/dashboard/despesas-categoria'),
      get('/dashboard/projecao'),
      getF('/dashboard/grafica-margens'),
      getF('/dashboard/grafica-top-produtos'),
      getF('/dashboard/grafica-receita-custo'),
      getF('/dashboard/grafica-ticket-medio'),
      get('/dashboard/caixa'),
      get('/dashboard/ponto-equilibrio'),
    ]).then(([r, g, p, c, proj, marg, top, rc, tk, cx, eq]) => {
      if (r)    setResumo(r);
      if (g)    setGrafico(g);
      if (p)    setPendentes(p);
      if (c)    setCategorias(c);
      if (proj) setProjecao(proj);
      if (marg) setMargens(marg);
      if (top)  setTopProd(top);
      if (rc)   setRecCusto(rc);
      if (tk)   setTicket(tk);
      if (cx)   setCaixa(cx);
      if (eq)   setEquilibrio(eq);
    }).finally(() => setLoading(false));
  }, [applied]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="cmyk-loader"><span/><span/><span/><span/></div>
    </div>
  );

  if (!resumo) return (
    <div className="flex items-center justify-center h-64 text-sm text-ink-400">
      Erro ao carregar o dashboard. Verifique se o servidor está rodando.
    </div>
  );

  const totalPendentes = (pendentes.receitas?.length || 0) + (pendentes.despesas?.length || 0);
  const hasAtrasados   = pendentes.receitas.some(r => r.status === 'atrasado') || pendentes.despesas.some(d => d.status === 'atrasado');
  const hasMargens     = margens.some(m => m.margem > 0);
  const filterKey      = `${applied.ano}-${applied.mes}-${applied.semestre}-${applied.client_type}`;

  return (
    <div className="space-y-6 animate-fade-up">
      {showCaixa && <MovimentacoesModal data={caixa} onClose={() => setShowCaixa(false)} />}

      {/* ── 1. Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-white border border-ink-100 items-center justify-center shadow-ink relative">
            <span className="reg-mark" style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Dashboard</h1>
            <p className="text-sm text-ink-400 mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-c" />
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-m" />
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-y" />
              <span className="inline-block w-1.5 h-1.5 rounded-sm bg-cmyk-k" />
              Visão geral do seu fluxo de caixa
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Filtros ── */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest shrink-0">Filtros</span>
          <select value={fAno} onChange={e => setFAno(e.target.value)} className={SEL_CLS}>
            <option value="">Todos os anos</option>
            {D_ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={fMes} onChange={e => { setFMes(e.target.value); if (e.target.value) setFSemestre(''); }} className={SEL_CLS}>
            <option value="">Todos os meses</option>
            {D_MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={fSemestre} onChange={e => { setFSemestre(e.target.value); if (e.target.value) setFMes(''); }} className={SEL_CLS}>
            <option value="">Semestre</option>
            <option value="1">1º Semestre</option>
            <option value="2">2º Semestre</option>
          </select>
          <select value={fCliente} onChange={e => setFCliente(e.target.value)} className={SEL_CLS}>
            <option value="">Todos os clientes</option>
            <option value="revenda">Revenda</option>
            <option value="final">Cliente Final</option>
          </select>
          <button onClick={handleSearch}
            className="px-4 py-2 text-sm font-medium bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition-colors">
            Buscar
          </button>
          {(fAno || fMes || fSemestre || fCliente) && (
            <button onClick={handleClear}
              className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors">
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Alerta atrasados (só aparece se houver) ── */}
      {hasAtrasados && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl">
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm font-medium text-rose-700">
            Há contas em atraso — verifique a seção de pendentes abaixo.
          </p>
        </div>
      )}

      {/* ── 4. KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Saldo Atual"
          value={fmt(resumo.saldo_atual)}
          sub="Receitas pagas − despesas pagas"
          color={resumo.saldo_atual >= 0 ? 'green' : 'red'}
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
        />
        <MetricCard
          label="Total Receitas"
          value={fmt(resumo.total_receitas)}
          sub="Pagamentos recebidos"
          color="green"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" /></svg>}
        />
        <MetricCard
          label="Total Despesas"
          value={fmt(resumo.total_despesas)}
          sub="Valores pagos"
          color="red"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181" /></svg>}
        />
        <MetricCard
          label="A Receber"
          value={fmt(resumo.receitas_pendentes.total)}
          sub={`${resumo.receitas_pendentes.qtd} conta(s) pendente(s)`}
          color="amber"
          icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>}
        />
      </div>

      {/* ── 5. Situação atual: Caixa + Equilíbrio ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CaixaWidget data={caixa} onOpenModal={() => setShowCaixa(true)} />
        <BreakevenCard data={equilibrio} />
      </div>

      {/* ── 6. Histórico + Pendentes ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <ChartCard className="md:col-span-3" title="Receitas × Despesas" subtitle="Por mês">
          <ReactECharts key={filterKey} option={buildBarOption(grafico)} style={{ height: 280 }} notMerge />
        </ChartCard>

        {/* Contas Pendentes */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-zinc-800">Contas Pendentes</p>
            {totalPendentes > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${hasAtrasados ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100 text-zinc-500'}`}>
                {totalPendentes}
              </span>
            )}
          </div>
          {totalPendentes === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-400">Nenhuma conta pendente</div>
          ) : (
            <div className="space-y-1 overflow-y-auto max-h-[220px] pr-0.5">
              {pendentes.receitas.map(r => (
                <div key={`r-${r.id}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate">{r.cliente}</p>
                      <p className="text-[10px] text-zinc-400">{fmtDate(r.data)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-semibold text-emerald-600">{fmt(r.valor)}</span>
                    <Badge status={r.status} />
                  </div>
                </div>
              ))}
              {pendentes.despesas.map(d => (
                <div key={`d-${d.id}`} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-800 truncate">{d.descricao}</p>
                      <p className="text-[10px] text-zinc-400">{fmtDate(d.data)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs font-semibold text-rose-500">{fmt(d.valor)}</span>
                    <Badge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 7. Projeção + Despesas por Categoria ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Projeção */}
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-zinc-800 mb-0.5">Projeção — Próximos 3 Meses</p>
          <p className="text-[11px] text-zinc-400 mb-4">Baseada em receitas recorrentes ativas</p>
          <div className="space-y-3">
            {projecao.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">Sem dados de projeção</p>
            ) : projecao.map((p, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <p className="text-xs font-semibold text-zinc-500 capitalize mb-2.5 tracking-wide">{p.mes}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Receitas</span>
                    <span className="text-xs font-semibold text-emerald-600">{fmt(p.receitas_projetadas)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Despesas</span>
                    <span className="text-xs font-semibold text-rose-500">{fmt(p.despesas_projetadas)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-200">
                    <span className="text-xs font-semibold text-zinc-600">Saldo projetado</span>
                    <span className={`text-sm font-bold ${p.saldo_projetado >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {fmt(p.saldo_projetado)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Despesas por Categoria */}
        <ChartCard title="Despesas por Categoria" subtitle="Período selecionado">
          {categorias.length > 0 ? (
            <ReactECharts key={filterKey} option={buildPieOption(categorias)} style={{ height: 264 }} notMerge />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-zinc-400">
              Sem despesas no período
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── 8. Analytics da Gráfica ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <p className="text-xs font-bold text-ink-500 uppercase tracking-[0.22em]">Gráfica — Análise Comercial</p>
          <div className="flex-1 h-px bg-gradient-to-r from-ink-200 via-ink-100 to-transparent" />
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-cmyk-c" />
            <span className="w-2 h-2 rounded-sm bg-cmyk-m" />
            <span className="w-2 h-2 rounded-sm bg-cmyk-y" />
            <span className="w-2 h-2 rounded-sm bg-cmyk-k" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <ChartCard title="Margem por Categoria" subtitle="Orçamentos aprovados">
            {!hasMargens ? (
              <div className="h-44 flex items-center justify-center text-sm text-zinc-400">
                Sem orçamentos aprovados
              </div>
            ) : (
              <ReactECharts key={filterKey} option={buildMargemOption(margens)} style={{ height: 176 }} notMerge />
            )}
          </ChartCard>

          <ChartCard title="Serviços Mais Vendidos" subtitle="Top 5 por receita">
            {topProd.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-zinc-400">
                Sem dados no período
              </div>
            ) : (
              <ReactECharts key={filterKey} option={buildTopProdOption(topProd)} style={{ height: 176 }} notMerge />
            )}
          </ChartCard>

          <ChartCard title="Receita vs Custo de Produção" subtitle="Orçamentos aprovados — últimos 6 meses">
            <ReactECharts key={filterKey} option={buildLinhaOption(recCusto)} style={{ height: 176 }} notMerge />
          </ChartCard>

          {/* Ticket Médio */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <p className="text-sm font-semibold text-zinc-800">Ticket Médio por Tipo de Cliente</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{ticket?.total_orcamentos || 0} orçamento(s) aprovado(s)</p>
            </div>
            <div className="px-5 pb-5 pt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-3">Revenda</p>
                <p className="text-2xl font-bold text-blue-700 leading-none">{fmt(ticketRevenda)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-3">Cliente Final</p>
                <p className="text-2xl font-bold text-emerald-700 leading-none">{fmt(ticketFinal)}</p>
              </div>
            </div>
            {ticket && ticket.revenda === 0 && ticket.final === 0 && (
              <p className="text-center text-xs pb-4 text-zinc-400">Sem dados suficientes para calcular</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
