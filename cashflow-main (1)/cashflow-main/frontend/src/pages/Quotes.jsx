import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtD = s => { if (!s) return '-'; const d = new Date(s); return d.toLocaleDateString('pt-BR'); };
const CATS = ['Todos', 'Impressões', 'Impressos', 'Placas'];

const FORMA_LABEL = {
  pix: 'PIX', transferencia: 'Transferência', boleto: 'Boleto',
  cartao: 'Cartão', dinheiro: 'Dinheiro', cheque: 'Cheque',
};
const MOMENTO_LABEL = {
  a_vista: 'À vista', parcelado: 'Parcelado', entrada_restante: 'Entrada + Restante',
  recorrente_mensal: 'Recorrente mensal',
};

function marginBadge(m) {
  const v = parseFloat(m);
  if (v > 40) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  if (v >= 20) return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
}

const STATUS_CLS = {
  pending:  'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
  sent:     'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
};
const STATUS_LABEL = { pending: 'Pendente', sent: 'Enviado', approved: 'Aprovado', rejected: 'Recusado' };

const STATUS_SELECT_CLS = {
  pending:  'bg-zinc-100 text-zinc-700 border-zinc-300',
  sent:     'bg-blue-50 text-blue-700 border-blue-300',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  rejected: 'bg-rose-50 text-rose-700 border-rose-300',
};

function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      onClick={e => e.stopPropagation()}
      className={`text-[11px] font-semibold px-2 py-1 pr-5 rounded-lg border cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${STATUS_SELECT_CLS[value] || 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
    >
      <option value="pending">Pendente</option>
      <option value="sent">Enviado</option>
      <option value="approved">Aprovado</option>
      <option value="rejected">Recusado</option>
    </select>
  );
}

// ── Quote print preview ───────────────────────────────────────────────────────
function buildPaymentText(q) {
  const forma   = FORMA_LABEL[q.forma_pagamento]   || q.forma_pagamento   || 'PIX';
  const momento = MOMENTO_LABEL[q.momento_pagamento] || q.momento_pagamento || 'À vista';
  if (q.momento_pagamento === 'parcelado' && q.num_parcelas) {
    return `${forma} · ${q.num_parcelas}× de ${fmt(q.total_value / q.num_parcelas)}`;
  }
  if (q.momento_pagamento === 'entrada_restante' && q.valor_entrada) {
    return `${forma} · Entrada ${fmt(q.valor_entrada)} + restante ${fmt(q.total_value - q.valor_entrada)}`;
  }
  return `${forma} · ${momento}`;
}

function openPrintPreview(q) {
  const items   = (q.items || []);
  const payment = buildPaymentText(q);
  const date    = fmtD(q.created_at);
  const phone   = q.client_contact?.replace(/\D/g, '') || '';
  const isPhone = phone.length >= 10;

  const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
  const imageExts  = ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'];
  const arteIsImg  = q.arte_filename && imageExts.some(ext => q.arte_filename.toLowerCase().endsWith(ext));
  const arteUrl    = q.arte_filename ? `${backendUrl}/uploads/${q.arte_filename}` : null;

  const rows = items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}</td>
      <td>${Number(item.quantity).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
      <td>${item.unit}</td>
      <td>${fmt(item.unit_price)}</td>
      <td class="total">${fmt(item.total)}</td>
    </tr>`).join('');

  const whatsappBtn = isPhone ? `
    <a class="btn-whatsapp no-print"
       href="https://wa.me/55${phone}?text=${encodeURIComponent(`Olá ${q.client_name}! Segue o orçamento #${q.id} da Comunynk Gráfica no valor de ${fmt(q.total_value)}. Qualquer dúvida estamos à disposição!`)}"
       target="_blank">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Enviar via WhatsApp
    </a>` : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Orçamento #${q.id} — Comunynk Gráfica</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #111; }
  .page { max-width: 780px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: linear-gradient(135deg, #0f0e17 0%, #1a1a2e 100%); color: #fff; padding: 32px 40px; display: flex; justify-content: space-between; align-items: flex-start; }
  .company-name { font-size: 22px; font-weight: 700; letter-spacing: -.5px; }
  .company-sub { font-size: 12px; opacity: .5; margin-top: 4px; }
  .quote-meta { text-align: right; }
  .quote-num { font-size: 28px; font-weight: 800; color: #E91E8C; letter-spacing: -1px; }
  .quote-date { font-size: 12px; opacity: .5; margin-top: 4px; }
  .body { padding: 32px 40px; }
  .client-box { background: #f8f8f8; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; }
  .label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #999; margin-bottom: 4px; }
  .client-name { font-size: 18px; font-weight: 600; color: #111; }
  .client-contact { font-size: 13px; color: #666; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { border-bottom: 2px solid #f0f0f0; }
  th { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .08em; color: #aaa; padding: 0 12px 10px; text-align: left; }
  th:last-child, td:last-child { text-align: right; }
  td { padding: 12px; font-size: 14px; color: #333; border-bottom: 1px solid #f5f5f5; }
  td.total { font-weight: 600; color: #111; }
  .totals { display: flex; justify-content: flex-end; padding-top: 8px; }
  .total-box { background: #0f0e17; color: #fff; border-radius: 10px; padding: 16px 24px; min-width: 200px; text-align: right; }
  .total-label { font-size: 11px; opacity: .5; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
  .total-value { font-size: 26px; font-weight: 800; letter-spacing: -1px; color: #E91E8C; }
  .payment { margin-top: 24px; padding: 14px 20px; background: #f8f8f8; border-radius: 10px; font-size: 13px; color: #555; }
  .payment strong { color: #111; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 11px; color: #bbb; text-align: center; }
  .validity { font-size: 11px; color: #aaa; margin-top: 8px; }
  .arte-section { margin-top: 28px; }
  .arte-img { display: block; max-width: 100%; max-height: 420px; object-fit: contain; border-radius: 8px; border: 1px solid #eee; margin-top: 10px; }
  .arte-file { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; background: #f8f8f8; border-radius: 8px; padding: 10px 16px; font-size: 13px; color: #555; }
  .actions { display: flex; gap: 12px; justify-content: center; padding: 24px 40px; background: #fafafa; border-top: 1px solid #f0f0f0; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; }
  .btn-print { background: #0f0e17; color: #fff; }
  .btn-print:hover { background: #1a1a2e; }
  .btn-whatsapp { background: #25D366; color: #fff; }
  .btn-whatsapp svg { width: 16px; height: 16px; }
  @media print {
    body { background: #fff; }
    .page { box-shadow: none; border-radius: 0; margin: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="company-name">Comunynk Gráfica</div>
      <div class="company-sub">Impressão · Sinalização · Comunicação Visual</div>
    </div>
    <div class="quote-meta">
      <div class="quote-num">Orçamento #${q.id}</div>
      <div class="quote-date">Data: ${date}</div>
    </div>
  </div>

  <div class="body">
    <div class="client-box">
      <div class="label">Cliente</div>
      <div class="client-name">${q.client_name}</div>
      ${q.client_contact ? `<div class="client-contact">${q.client_contact}</div>` : ''}
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Descrição</th>
          <th>Qtd</th>
          <th>Un.</th>
          <th>Preço unit.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="total-box">
        <div class="total-label">Valor Total</div>
        <div class="total-value">${fmt(q.total_value)}</div>
      </div>
    </div>

    <div class="payment">
      <strong>Pagamento:</strong> ${payment}
    </div>

    ${arteUrl ? `
    <div class="arte-section">
      <div class="label">Arte Enviada pelo Cliente</div>
      ${arteIsImg
        ? `<img src="${arteUrl}" class="arte-img" alt="Arte do cliente" />`
        : `<div class="arte-file">
             <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"/></svg>
             ${q.arte_originalname || q.arte_filename}
           </div>`
      }
    </div>` : ''}

    <div class="validity">Orçamento válido por 15 dias a partir da data de emissão.</div>

    <div class="footer">
      Comunynk Gráfica · Este documento é um orçamento e não constitui nota fiscal.
    </div>
  </div>

  <div class="actions no-print">
    <button class="btn btn-print" onclick="window.print()">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.75 19.5m10.56-5.671-.003.004L17.25 19.5M7.5 14.25 6.75 19.5m9 0 .75-5.25M17.25 19.5H6.75m10.5 0H6.75M21 7.5V18a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18V7.5m18 0A2.25 2.25 0 0 0 18.75 5.25H5.25A2.25 2.25 0 0 0 3 7.5m18 0H3"/></svg>
      Imprimir / Salvar PDF
    </button>
    ${whatsappBtn}
  </div>
</div>
</body>
</html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

// ── Arte upload section ───────────────────────────────────────────────────────
function ArteSection({ quote, onUpdated }) {
  const [uploading, setUploading]   = useState(false);
  const [removing, setRemoving]     = useState(false);
  const fileRef = useRef(null);
  const backendUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('arte', file);
      const r = await api.post(`/ai-quote/history/${quote.id}/upload-arte`, fd);
      onUpdated({ arte_filename: r.data.filename, arte_originalname: r.data.originalname });
    } catch {
      alert('Erro ao enviar arquivo. Verifique o formato e tamanho (máx. 20MB).');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleRemove() {
    if (!confirm('Remover a arte enviada?')) return;
    setRemoving(true);
    try {
      await api.delete(`/ai-quote/history/${quote.id}/arte`);
      onUpdated({ arte_filename: null, arte_originalname: null });
    } catch {
      alert('Erro ao remover arquivo.');
    } finally {
      setRemoving(false);
    }
  }

  const isImage = quote.arte_filename && /\.(jpg|jpeg|png|webp|svg)$/i.test(quote.arte_filename);
  const fileUrl = quote.arte_filename ? `${backendUrl}/uploads/${quote.arte_filename}` : null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Arte do Cliente</p>

      {quote.arte_filename ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden">
          {isImage && (
            <img src={fileUrl} alt="Arte" className="w-full max-h-48 object-contain bg-white" />
          )}
          <div className="flex items-center justify-between px-3 py-2.5 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-xs text-zinc-600 truncate">{quote.arte_originalname || quote.arte_filename}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a href={fileUrl} target="_blank" rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Visualizar
              </a>
              <button onClick={handleRemove} disabled={removing}
                className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors disabled:opacity-50">
                {removing ? '...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {uploading ? (
            <div className="w-4 h-4 rounded-full border-2 border-zinc-300 border-t-zinc-600 animate-spin" />
          ) : (
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          )}
          <span className="text-xs text-zinc-400">
            {uploading ? 'Enviando...' : 'Clique para enviar a arte'}
          </span>
          <span className="text-[10px] text-zinc-300">JPG, PNG, PDF, AI, EPS, PSD, CDR, SVG, ZIP · máx. 20MB</span>
        </button>
      )}

      <input ref={fileRef} type="file" className="hidden"
        accept=".jpg,.jpeg,.png,.webp,.pdf,.ai,.eps,.psd,.cdr,.svg,.zip,.tif,.tiff"
        onChange={handleUpload}
      />
    </div>
  );
}

// ── New quote: add item modal ─────────────────────────────────────────────────
function AddItemModal({ product, clientType, onAdd, onClose }) {
  const [mode, setMode]     = useState(product.unit === 'm²' ? 'dims' : 'qty');
  const [width, setWidth]   = useState('');
  const [height, setHeight] = useState('');
  const [qty, setQty]       = useState('1');
  const [count, setCount]   = useState('1');

  const unitPrice = clientType === 'revenda' && product.resale_price
    ? product.resale_price
    : product.final_price;

  const isSqm = product.unit === 'm²';

  let quantity = 0;
  if (isSqm && mode === 'dims') {
    const w = parseFloat(width) || 0;
    const h = parseFloat(height) || 0;
    const n = parseFloat(count)  || 1;
    quantity = w * h * n;
  } else {
    quantity = parseFloat(qty) || 0;
  }

  const total    = unitPrice * quantity;
  const costUnit = product.cost_price;
  const canAdd   = quantity > 0;

  function handleAdd() {
    if (!canAdd) return;
    onAdd({
      product_id: product.id,
      name:       product.name,
      quantity:   Math.round(quantity * 1000) / 1000,
      unit:       product.unit,
      unit_price: unitPrice,
      cost_unit:  costUnit,
      total:      Math.round(total * 100) / 100,
      cost_total: Math.round(costUnit * quantity * 100) / 100,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 animate-fade-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{product.category}</p>
            <h2 className="text-sm font-semibold text-zinc-900 mt-0.5">{product.name}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 mt-0.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-zinc-400">
            {clientType === 'revenda' && product.resale_price ? 'Preço revenda' : 'Preço final'}
          </span>
          <span className="text-sm font-bold text-zinc-900">{fmt(unitPrice)} / {product.unit}</span>
        </div>

        {isSqm && (
          <div className="flex rounded-xl overflow-hidden border border-zinc-200 mb-4 text-xs font-medium">
            <button
              onClick={() => setMode('dims')}
              className={`flex-1 py-1.5 transition-colors ${mode === 'dims' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}>
              Dimensões (L × A)
            </button>
            <button
              onClick={() => setMode('area')}
              className={`flex-1 py-1.5 transition-colors ${mode === 'area' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}>
              m² direto
            </button>
          </div>
        )}

        <div className="space-y-3">
          {isSqm && mode === 'dims' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Largura (m)</label>
                  <input type="number" min="0" step="0.01" value={width} onChange={e => setWidth(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">Altura (m)</label>
                  <input type="number" min="0" step="0.01" value={height} onChange={e => setHeight(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1">Quantidade (peças)</label>
                <input type="number" min="1" step="1" value={count} onChange={e => setCount(e.target.value)}
                  placeholder="1"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
              </div>
              {quantity > 0 && (
                <p className="text-[11px] text-zinc-400">
                  Área total: <span className="font-semibold text-zinc-700">{quantity.toFixed(3)} m²</span>
                </p>
              )}
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                {isSqm ? 'Área (m²)' : product.unit === '1000 un' ? 'Quantidade (milhares)' : 'Quantidade'}
              </label>
              <input type="number" min="0" step={isSqm ? '0.01' : '1'} value={qty} onChange={e => setQty(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
              {product.unit === '1000 un' && (
                <p className="text-[11px] text-zinc-400 mt-1">Ex: 1 = 1.000 unidades, 2 = 2.000 unidades</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 bg-zinc-50 rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Total do item</span>
          <span className={`text-base font-bold ${canAdd ? 'text-zinc-900' : 'text-zinc-300'}`}>{fmt(total)}</span>
        </div>

        <div className="flex gap-2 mt-4">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleAdd} disabled={!canAdd}
            className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-40">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New quote: confirm modal ──────────────────────────────────────────────────
function ConfirmModal({ quote, onClose, onDone, onCreated }) {
  const [clientName, setClientName]           = useState('');
  const [clientContact, setClientContact]     = useState('');
  const [formaPagamento, setFormaPagamento]   = useState('pix');
  const [momentoPagamento, setMomentoPagamento] = useState('a_vista');
  const [numParcelas, setNumParcelas]         = useState('3');
  const [valorEntrada, setValorEntrada]       = useState('');
  const [dataRestante, setDataRestante]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState(null);
  const [arteFile, setArteFile] = useState(null);
  const arteInputRef = useRef(null);

  const ALLOWED_ARTE = ['.jpg','.jpeg','.png','.pdf','.ai','.eps','.psd','.cdr','.svg','.zip','.webp','.tif','.tiff'];

  async function confirm() {
    if (!clientName.trim()) return;
    setSaving(true);
    try {
      const r = await api.post('/ai-quote/confirm', {
        client_name:       clientName,
        client_contact:    clientContact,
        items:             quote.items,
        total_value:       quote.total_value,
        cost_total:        quote.cost_total,
        margin_percent:    quote.margin_percent,
        client_type:       quote.client_type,
        forma_pagamento:   formaPagamento,
        momento_pagamento: momentoPagamento,
        num_parcelas:      momentoPagamento === 'parcelado' ? parseInt(numParcelas) || null : null,
        valor_entrada:     momentoPagamento === 'entrada_restante' ? parseFloat(valorEntrada) || null : null,
        data_restante:     momentoPagamento === 'entrada_restante' ? dataRestante || null : null,
      });
      if (arteFile) {
        const fd = new FormData();
        fd.append('arte', arteFile);
        await api.post(`/ai-quote/history/${r.data.quote_id}/upload-arte`, fd)
          .catch(err => console.warn('Upload de arte falhou:', err?.response?.data || err.message));
      }
      setResult(r.data);
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao confirmar orçamento');
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
        {result ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-zinc-900">Orçamento Criado!</p>
              <p className="text-sm text-zinc-500 mt-1">Orçamento #{result.quote_id} salvo e aguardando aprovação.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={onDone}
                className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                Novo Orçamento
              </button>
              <button onClick={onCreated}
                className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors">
                Ver na lista
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">Confirmar Orçamento</h2>
              <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nome do Cliente *</label>
                <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Contato (opcional)</label>
                <input value={clientContact} onChange={e => setClientContact(e.target.value)} placeholder="Telefone ou e-mail"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Forma de Pagamento</label>
                  <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo de Pagamento</label>
                  <select value={momentoPagamento} onChange={e => setMomentoPagamento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10">
                    <option value="a_vista">À Vista</option>
                    <option value="parcelado">Parcelado</option>
                    <option value="entrada_restante">Entrada + Restante</option>
                  </select>
                </div>
                {momentoPagamento === 'parcelado' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-600 mb-1">Número de Parcelas</label>
                    <input type="number" min="2" max="60" value={numParcelas} onChange={e => setNumParcelas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                  </div>
                )}
                {momentoPagamento === 'entrada_restante' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Valor da Entrada (R$)</label>
                      <input type="number" step="0.01" min="0" value={valorEntrada} onChange={e => setValorEntrada(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 mb-1">Data do Restante</label>
                      <input type="date" value={dataRestante} onChange={e => setDataRestante(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10" />
                    </div>
                  </>
                )}
              </div>

              <div className="bg-zinc-50 rounded-xl p-3 space-y-1.5 max-h-40 overflow-y-auto">
                {quote.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-600 truncate mr-2">{item.name}</span>
                    <span className="font-medium text-zinc-800 shrink-0">{fmt(item.total)}</span>
                  </div>
                ))}
                <div className="border-t border-zinc-200 pt-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-zinc-700">Total</span>
                  <span className="text-zinc-900">{fmt(quote.total_value)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Margem</span>
                  <span className="font-medium">{parseFloat(quote.margin_percent).toFixed(1)}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Arte do Cliente (opcional)</label>
                <input
                  ref={arteInputRef}
                  type="file"
                  accept={ALLOWED_ARTE.join(',')}
                  className="hidden"
                  onChange={e => setArteFile(e.target.files[0] || null)}
                />
                {arteFile ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                    <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    <span className="text-xs text-violet-700 font-medium truncate flex-1">{arteFile.name}</span>
                    <button onClick={() => { setArteFile(null); arteInputRef.current.value = ''; }}
                      className="text-violet-400 hover:text-violet-600 shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => arteInputRef.current.click()}
                    className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-zinc-300 rounded-xl text-xs text-zinc-400 hover:border-zinc-400 hover:text-zinc-500 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Anexar arte (JPG, PNG, PDF, AI, CDR…)
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={confirm} disabled={saving || !clientName.trim()}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-60">
                  {saving ? 'Confirmando...' : 'Confirmar e Lançar'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── New quote: cart panel ─────────────────────────────────────────────────────
function QuoteCart({ items, onRemove, onClear, onConfirm }) {
  const total  = items.reduce((s, i) => s + i.total, 0);
  const cost   = items.reduce((s, i) => s + i.cost_total, 0);
  const margin = total > 0 ? (total - cost) / total * 100 : 0;
  const marginCls = margin > 40 ? 'text-emerald-600' : margin >= 20 ? 'text-amber-600' : 'text-rose-500';

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-500">Nenhum item</p>
        <p className="text-xs text-zinc-400 mt-1">Clique em um produto para adicionar ao orçamento</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 p-2.5 bg-white rounded-xl border border-zinc-100 shadow-sm group">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-800 truncate">{item.name}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {item.quantity} {item.unit} × {fmt(item.unit_price)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-zinc-900">{fmt(item.total)}</p>
              <button onClick={() => onRemove(i)}
                className="text-zinc-300 hover:text-rose-500 transition-colors mt-0.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>Custo estimado</span>
          <span>{fmt(cost)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Margem</span>
          <span className={`font-semibold ${marginCls}`}>{margin.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1">
          <span>Total</span>
          <span>{fmt(total)}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClear}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-500 hover:bg-zinc-50 transition-colors">
            Limpar
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-700 transition-colors">
            Confirmar Orçamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New quote overlay ─────────────────────────────────────────────────────────
function NewQuoteOverlay({ onClose, onCreated }) {
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState('Todos');
  const [search, setSearch]         = useState('');
  const [clientType, setClientType] = useState('final');
  const [items, setItems]           = useState([]);
  const [addModal, setAddModal]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    api.get('/products').then(r => setProducts(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = products
    .filter(p => p.active)
    .filter(p => category === 'Todos' || p.category === category)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  function addItem(item) {
    setItems(prev => [...prev, item]);
    setAddModal(null);
  }

  const totalValue = items.reduce((s, i) => s + i.total, 0);
  const costTotal  = items.reduce((s, i) => s + i.cost_total, 0);
  const marginPct  = totalValue > 0
    ? ((totalValue - costTotal) / totalValue * 100).toFixed(1)
    : '0';
  const quote = { items, total_value: totalValue, cost_total: costTotal, margin_percent: marginPct, client_type: clientType };

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Novo Orçamento</h1>
            <p className="text-sm text-zinc-400">Selecione os produtos e defina as quantidades</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium">Tipo de cliente:</span>
          <div className="flex rounded-xl overflow-hidden border border-zinc-200 text-xs font-semibold">
            <button
              onClick={() => setClientType('final')}
              className={`px-3 py-1.5 transition-colors ${clientType === 'final' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}>
              Cliente Final
            </button>
            <button
              onClick={() => setClientType('revenda')}
              className={`px-3 py-1.5 transition-colors ${clientType === 'revenda' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-50'}`}>
              Revenda
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 min-h-0 p-6">
        {/* LEFT: product catalog */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-col gap-2 mb-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
            <div className="flex gap-1.5 flex-wrap">
              {CATS.map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    category === c ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-10">Nenhum produto encontrado</p>
            ) : (
              <div className="space-y-1.5">
                {filtered.map(p => {
                  const price = clientType === 'revenda' && p.resale_price ? p.resale_price : p.final_price;
                  const margin = p.margin_percent;
                  const mCls = margin > 40 ? 'bg-emerald-50 text-emerald-700' : margin >= 20 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-600';
                  return (
                    <button key={p.id} onClick={() => setAddModal(p)}
                      className="w-full flex items-center gap-3 px-3.5 py-3 bg-white border border-zinc-100 rounded-xl hover:border-zinc-300 hover:shadow-sm transition-all text-left group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900 truncate">{p.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{p.category} · {p.unit}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-zinc-900">{fmt(price)}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${mCls}`}>
                          {margin.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center transition-colors shrink-0">
                        <svg className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: cart */}
        <div className="w-64 shrink-0 flex flex-col bg-zinc-50 rounded-2xl border border-zinc-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-800">Orçamento</h2>
            {items.length > 0 && (
              <span className="text-[11px] font-semibold bg-zinc-900 text-white rounded-full w-5 h-5 flex items-center justify-center">
                {items.length}
              </span>
            )}
          </div>
          <QuoteCart
            items={items}
            onRemove={idx => setItems(prev => prev.filter((_, i) => i !== idx))}
            onClear={() => setItems([])}
            onConfirm={() => setConfirmModal(true)}
          />
        </div>
      </div>

      {addModal && (
        <AddItemModal
          product={addModal}
          clientType={clientType}
          onAdd={addItem}
          onClose={() => setAddModal(null)}
        />
      )}
      {confirmModal && items.length > 0 && (
        <ConfirmModal
          quote={quote}
          onClose={() => setConfirmModal(false)}
          onDone={() => { setConfirmModal(false); setItems([]); }}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Quotes() {
  const { user } = useAuth();
  const isAdmin = user?.nivel_acesso === 'admin';
  const [quotes, setQuotes]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [approveResult, setApproveResult] = useState(null);
  const [showNewQuote, setShowNewQuote]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/ai-quote/history').then(r => setQuotes(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    setUpdating(true);
    try {
      const r = await api.put(`/ai-quote/history/${id}`, { status });
      if (status === 'approved') {
        setApproveResult(r.data);
        if (!selected) {
          const q = quotes.find(q => q.id === id);
          if (q) setSelected({ ...q, status: 'approved' });
        }
      }
      load();
      setSelected(prev => prev ? { ...prev, status } : null);
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar status.');
    } finally {
      setUpdating(false);
    }
  }

  function closeDetail() {
    setSelected(null);
    setApproveResult(null);
  }

  function handleArteUpdated(patch) {
    setSelected(prev => ({ ...prev, ...patch }));
    setQuotes(prev => prev.map(q => q.id === selected?.id ? { ...q, ...patch } : q));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 rounded-full border-2 border-zinc-200 border-t-zinc-500 animate-spin" />
    </div>
  );

  const pending  = quotes.filter(q => q.status === 'pending').length;
  const approved = quotes.filter(q => q.status === 'approved').length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Orçamentos</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{quotes.length} orçamento(s) · {pending} pendente(s) · {approved} aprovado(s)</p>
        </div>
        <button
          onClick={() => setShowNewQuote(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Orçamento
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-600">Nenhum orçamento encontrado</p>
          <p className="text-xs text-zinc-400 mt-1">Clique em "Novo Orçamento" para criar</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {['#', 'Cliente', 'Total', 'Custo', 'Lucro', 'Margem', 'Arte', 'Status', 'Data', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {quotes.map(q => (
                <tr key={q.id} className="hover:bg-zinc-50/60 transition-colors cursor-pointer" onClick={() => { setSelected(q); setApproveResult(null); }}>
                  <td className="px-4 py-3 text-zinc-400 font-mono text-xs">#{q.id}</td>
                  <td className="px-4 py-3 font-medium text-zinc-800">{q.client_name}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{fmt(q.total_value)}</td>
                  <td className="px-4 py-3 text-zinc-500">{fmt(q.cost_total)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{fmt(parseFloat(q.total_value) - parseFloat(q.cost_total))}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${marginBadge(q.margin_percent)}`}>
                      {parseFloat(q.margin_percent).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {q.arte_filename ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                        </svg>
                        Arte
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {isAdmin ? (
                      <StatusSelect
                        value={q.status}
                        onChange={status => updateStatus(q.id, status)}
                        disabled={updating}
                      />
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[q.status]}`}>
                        {STATUS_LABEL[q.status] || q.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{fmtD(q.created_at)}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-up">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Orçamento #{selected.id}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{selected.client_name} · {fmtD(selected.created_at)}</p>
              </div>
              <button onClick={closeDetail} className="text-zinc-400 hover:text-zinc-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {selected.client_contact && (
                <p className="text-xs text-zinc-500">Contato: <span className="font-medium">{selected.client_contact}</span></p>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Status:</span>
                {isAdmin ? (
                  <StatusSelect
                    value={selected.status}
                    onChange={status => updateStatus(selected.id, status)}
                    disabled={updating}
                  />
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_CLS[selected.status]}`}>
                    {STATUS_LABEL[selected.status] || selected.status}
                  </span>
                )}
              </div>

              {approveResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700">Lançamento realizado</p>
                  <div className="text-[11px] text-emerald-600">
                    {approveResult.parcelas > 1
                      ? <span>{approveResult.parcelas} receitas parceladas (IDs: {approveResult.receita_ids?.join(', ')})</span>
                      : <span>Receita #{approveResult.receita_id} lançada em Receitas</span>
                    }
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Itens</p>
                {(selected.items || []).map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{item.name}</p>
                      <p className="text-xs text-zinc-400">{item.quantity} {item.unit} × {fmt(item.unit_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-900">{fmt(item.total)}</p>
                      <p className="text-[11px] text-zinc-400">custo {fmt(item.cost_total)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-zinc-50 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-zinc-400 mb-1">Total</p>
                  <p className="text-sm font-bold text-zinc-900">{fmt(selected.total_value)}</p>
                </div>
                <div className="bg-zinc-50 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-zinc-400 mb-1">Custo</p>
                  <p className="text-sm font-bold text-zinc-500">{fmt(selected.cost_total)}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-[11px] text-emerald-600 mb-1">Lucro</p>
                  <p className="text-sm font-bold text-emerald-700">{fmt(parseFloat(selected.total_value) - parseFloat(selected.cost_total))}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${marginBadge(selected.margin_percent)}`}>
                  <p className="text-[11px] mb-1 opacity-70">Margem</p>
                  <p className="text-sm font-bold">{parseFloat(selected.margin_percent).toFixed(1)}%</p>
                </div>
              </div>

              <button
                onClick={() => openPrintPreview(selected)}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                Gerar Orçamento para Cliente
              </button>

              <ArteSection quote={selected} onUpdated={handleArteUpdated} />
            </div>
          </div>
        </div>
      )}

      {/* New quote overlay */}
      {showNewQuote && (
        <NewQuoteOverlay
          onClose={() => setShowNewQuote(false)}
          onCreated={() => { setShowNewQuote(false); load(); }}
        />
      )}
    </div>
  );
}
