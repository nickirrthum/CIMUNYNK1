const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.get('/resumo', auth, async (req, res) => {
  const { ano, mes, semestre } = req.query;
  let dateWhere = '', params = [];
  if (ano && mes) {
    dateWhere = ` AND TO_CHAR(data::date,'YYYY-MM') = $1`;
    params = [`${ano}-${String(mes).padStart(2, '0')}`];
  } else if (ano && semestre) {
    const s1 = semestre === '1' ? `${ano}-01` : `${ano}-07`;
    const s2 = semestre === '1' ? `${ano}-06` : `${ano}-12`;
    dateWhere = ` AND TO_CHAR(data::date,'YYYY-MM') BETWEEN $1 AND $2`;
    params = [s1, s2];
  } else if (ano) {
    dateWhere = ` AND TO_CHAR(data::date,'YYYY') = $1`;
    params = [String(ano)];
  }

  const [totRec, totDesp, recPend, despPend] = await Promise.all([
    pool.query(`SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE status='pago'${dateWhere}`, params),
    pool.query(`SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE status='pago'${dateWhere}`, params),
    pool.query(`SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as qtd FROM receitas WHERE status IN ('pendente','atrasado')${dateWhere}`, params),
    pool.query(`SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as qtd FROM despesas WHERE status IN ('pendente','atrasado')${dateWhere}`, params),
  ]);
  const rec  = parseFloat(totRec.rows[0].total);
  const desp = parseFloat(totDesp.rows[0].total);
  res.json({
    saldo_atual:         rec - desp,
    total_receitas:      rec,
    total_despesas:      desp,
    receitas_pendentes:  recPend.rows[0],
    despesas_pendentes:  despPend.rows[0],
  });
});

router.get('/grafico-mensal', auth, async (req, res) => {
  const { ano, mes, semestre } = req.query;
  const agora = new Date();
  let monthDates;
  if (ano && mes) {
    monthDates = [new Date(Number(ano), Number(mes) - 1, 1)];
  } else if (ano && semestre) {
    const startM = semestre === '1' ? 0 : 6;
    monthDates = Array.from({ length: 6 }, (_, i) => new Date(Number(ano), startM + i, 1));
  } else if (ano) {
    monthDates = Array.from({ length: 12 }, (_, i) => new Date(Number(ano), i, 1));
  } else {
    monthDates = Array.from({ length: 6 }, (_, i) => new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1));
  }
  const dados = [];
  for (const d of monthDates) {
    const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const [rec, desp] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(valor),0) as total FROM receitas
         WHERE TO_CHAR(data::date,'YYYY-MM')=$1 AND status='pago'`,
        [mesStr]
      ),
      pool.query(
        `SELECT COALESCE(SUM(valor),0) as total FROM despesas
         WHERE TO_CHAR(data::date,'YYYY-MM')=$1`,
        [mesStr]
      ),
    ]);
    const r = parseFloat(rec.rows[0].total);
    const de = parseFloat(desp.rows[0].total);
    dados.push({
      mes:      d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receitas: r,
      despesas: de,
      saldo:    r - de,
    });
  }
  res.json(dados);
});

router.get('/ponto-equilibrio', auth, async (req, res) => {
  const agora    = new Date();
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  const [desp, recPagas, recPend] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE TO_CHAR(data::date,'YYYY-MM')=$1`,
      [mesAtual]
    ),
    pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE TO_CHAR(data::date,'YYYY-MM')=$1 AND status='pago'`,
      [mesAtual]
    ),
    pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE TO_CHAR(data::date,'YYYY-MM')=$1 AND status IN ('pendente','atrasado')`,
      [mesAtual]
    ),
  ]);
  const meta      = parseFloat(desp.rows[0].total);
  const realizado = parseFloat(recPagas.rows[0].total);
  const pendente  = parseFloat(recPend.rows[0].total);
  const pct       = meta > 0 ? realizado / meta * 100 : (realizado > 0 ? 100 : 0);
  const pctPend   = meta > 0 ? Math.min((realizado + pendente) / meta * 100, 100) : 100;
  res.json({
    meta,
    realizado,
    pendente,
    superavit:       realizado - meta,
    percentual:      Math.round(pct  * 10) / 10,
    percentual_pend: Math.round(pctPend * 10) / 10,
    mes:             agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  });
});

router.get('/caixa', auth, async (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const [entradasHoje, saidasHoje, movs] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE data::date=$1 AND status='pago'`,
      [hoje]
    ),
    pool.query(
      `SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE data::date=$1 AND status='pago'`,
      [hoje]
    ),
    pool.query(`
      SELECT tipo, id, descricao, valor, status, data, created_at FROM (
        SELECT 'receita' AS tipo, id,
               cliente || CASE WHEN servico IS NOT NULL AND servico <> '' THEN ' — ' || servico ELSE '' END AS descricao,
               valor, status, data, created_at
        FROM receitas
        UNION ALL
        SELECT 'despesa' AS tipo, id, descricao, valor, status, data, created_at
        FROM despesas
      ) t
      ORDER BY created_at DESC
      LIMIT 30
    `),
  ]);
  const entrada = parseFloat(entradasHoje.rows[0].total);
  const saida   = parseFloat(saidasHoje.rows[0].total);
  res.json({
    entradas_hoje:  entrada,
    saidas_hoje:    saida,
    saldo_hoje:     entrada - saida,
    movimentacoes:  movs.rows,
  });
});

router.get('/pendentes', auth, async (req, res) => {
  const [receitas, despesas] = await Promise.all([
    pool.query(`SELECT id,cliente,servico,valor,status,data FROM receitas
                WHERE status IN ('pendente','atrasado') ORDER BY status DESC, data ASC LIMIT 10`),
    pool.query(`SELECT id,descricao,valor,tipo,status,data FROM despesas
                WHERE status IN ('pendente','atrasado') ORDER BY status DESC, data ASC LIMIT 10`),
  ]);
  res.json({ receitas: receitas.rows, despesas: despesas.rows });
});

router.get('/despesas-categoria', auth, async (req, res) => {
  const { ano, mes, semestre } = req.query;
  const agora = new Date();
  let where, params;
  if (ano && mes) {
    where  = `TO_CHAR(data::date,'YYYY-MM') = $1`;
    params = [`${ano}-${String(mes).padStart(2, '0')}`];
  } else if (ano && semestre) {
    const s1 = semestre === '1' ? `${ano}-01` : `${ano}-07`;
    const s2 = semestre === '1' ? `${ano}-06` : `${ano}-12`;
    where  = `TO_CHAR(data::date,'YYYY-MM') BETWEEN $1 AND $2`;
    params = [s1, s2];
  } else if (ano) {
    where  = `TO_CHAR(data::date,'YYYY') = $1`;
    params = [String(ano)];
  } else {
    const m = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    where  = `TO_CHAR(data::date,'YYYY-MM') = $1`;
    params = [m];
  }
  const result = await pool.query(
    `SELECT tipo, COALESCE(SUM(valor),0) as total, COUNT(*) as qtd
     FROM despesas WHERE ${where}
     GROUP BY tipo ORDER BY total DESC`,
    params
  );
  res.json(result.rows);
});

router.get('/projecao', auth, async (req, res) => {
  const [recorrentes, despFixas] = await Promise.all([
    pool.query(`
      SELECT COALESCE(SUM(valor),0) as total FROM receitas
      WHERE momento_pagamento='recorrente_mensal' AND status!='cancelado'
      AND TO_CHAR(data::date,'YYYY-MM') = (
        SELECT TO_CHAR(MAX(data::date),'YYYY-MM') FROM receitas
        WHERE momento_pagamento='recorrente_mensal' AND status!='cancelado'
      )
    `),
    pool.query(`
      SELECT COALESCE(SUM(valor),0) as total FROM despesas
      WHERE tipo IN ('fixa','recorrente')
      AND TO_CHAR(data::date,'YYYY-MM') = (
        SELECT TO_CHAR(MAX(data::date),'YYYY-MM') FROM despesas
        WHERE tipo IN ('fixa','recorrente')
      )
    `),
  ]);

  const r = parseFloat(recorrentes.rows[0].total);
  const d = parseFloat(despFixas.rows[0].total);
  const agora = new Date();
  const projecao = [];
  for (let i = 1; i <= 3; i++) {
    const dt = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    projecao.push({
      mes:                  dt.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      receitas_projetadas:  r,
      despesas_projetadas:  d,
      saldo_projetado:      r - d,
    });
  }
  res.json(projecao);
});

// --- Gráfica analytics ---

router.get('/grafica-margens', auth, async (req, res) => {
  const { ano, mes, semestre, client_type } = req.query;
  const agora = new Date();
  let dateWhere, p;
  if (ano && mes) {
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') = $1`;
    p = [`${ano}-${String(mes).padStart(2, '0')}`];
  } else if (ano && semestre) {
    const s1 = semestre === '1' ? `${ano}-01` : `${ano}-07`;
    const s2 = semestre === '1' ? `${ano}-06` : `${ano}-12`;
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') BETWEEN $1 AND $2`;
    p = [s1, s2];
  } else if (ano) {
    dateWhere = `TO_CHAR(created_at,'YYYY') = $1`;
    p = [String(ano)];
  } else {
    const m = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') = $1`;
    p = [m];
  }

  let q = `SELECT items_json FROM ai_quotes WHERE status='approved' AND ${dateWhere}`;
  if (client_type) { q += ` AND client_type=$${p.length + 1}`; p.push(client_type); }

  const [quotesRes, prodsRes] = await Promise.all([
    pool.query(q, p),
    pool.query('SELECT id, category FROM products'),
  ]);

  const productMap = {};
  for (const p of prodsRes.rows) productMap[p.id] = p;

  const cats = { Impressões: { sum: 0, n: 0 }, Impressos: { sum: 0, n: 0 }, Placas: { sum: 0, n: 0 } };
  for (const q of quotesRes.rows) {
    for (const item of JSON.parse(q.items_json)) {
      const prod = item.product_id ? productMap[item.product_id] : null;
      const cat  = prod?.category || null;
      if (cat && cats[cat] && item.unit_price > 0) {
        const m = item.cost_unit ? ((item.unit_price - item.cost_unit) / item.unit_price * 100) : 0;
        cats[cat].sum += m;
        cats[cat].n++;
      }
    }
  }
  res.json(Object.entries(cats).map(([categoria, v]) => ({
    categoria,
    margem: v.n > 0 ? Math.round(v.sum / v.n * 10) / 10 : 0,
  })));
});

router.get('/grafica-top-produtos', auth, async (req, res) => {
  const { ano, mes, semestre, client_type } = req.query;
  const agora = new Date();
  let dateWhere, p;
  if (ano && mes) {
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') = $1`;
    p = [`${ano}-${String(mes).padStart(2, '0')}`];
  } else if (ano && semestre) {
    const s1 = semestre === '1' ? `${ano}-01` : `${ano}-07`;
    const s2 = semestre === '1' ? `${ano}-06` : `${ano}-12`;
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') BETWEEN $1 AND $2`;
    p = [s1, s2];
  } else if (ano) {
    dateWhere = `TO_CHAR(created_at,'YYYY') = $1`;
    p = [String(ano)];
  } else {
    const m = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    dateWhere = `TO_CHAR(created_at,'YYYY-MM') = $1`;
    p = [m];
  }
  let q = `SELECT items_json FROM ai_quotes WHERE status='approved' AND ${dateWhere}`;
  if (client_type) { q += ` AND client_type=$${p.length + 1}`; p.push(client_type); }
  const result = await pool.query(q, p);

  const totals = {};
  for (const q of result.rows) {
    for (const item of JSON.parse(q.items_json)) {
      totals[item.name] = (totals[item.name] || 0) + (item.total || 0);
    }
  }
  res.json(
    Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }))
  );
});

router.get('/grafica-receita-custo', auth, async (req, res) => {
  const { ano, mes: mesParam, semestre, client_type } = req.query;
  const agora = new Date();
  let monthDates;
  if (ano && mesParam) {
    monthDates = [new Date(Number(ano), Number(mesParam) - 1, 1)];
  } else if (ano && semestre) {
    const startM = semestre === '1' ? 0 : 6;
    monthDates = Array.from({ length: 6 }, (_, i) => new Date(Number(ano), startM + i, 1));
  } else if (ano) {
    monthDates = Array.from({ length: 12 }, (_, i) => new Date(Number(ano), i, 1));
  } else {
    monthDates = Array.from({ length: 6 }, (_, i) => new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1));
  }
  const dados = [];
  for (const d of monthDates) {
    const mesStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let q = `SELECT COALESCE(SUM(total_value),0) as receita, COALESCE(SUM(cost_total),0) as custo
       FROM ai_quotes WHERE status='approved' AND TO_CHAR(created_at,'YYYY-MM')=$1`;
    const p = [mesStr];
    if (client_type) { q += ` AND client_type=$2`; p.push(client_type); }
    const agg = await pool.query(q, p);
    dados.push({
      mes:     d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      receita: parseFloat(agg.rows[0].receita),
      custo:   parseFloat(agg.rows[0].custo),
    });
  }
  res.json(dados);
});

router.get('/grafica-ticket-medio', auth, async (req, res) => {
  const { ano, mes, semestre, client_type } = req.query;
  let q = `SELECT total_value, client_type FROM ai_quotes WHERE status='approved'`;
  const p = [];
  if (ano && mes) {
    q += ` AND TO_CHAR(created_at,'YYYY-MM') = $${p.length + 1}`; p.push(`${ano}-${String(mes).padStart(2, '0')}`);
  } else if (ano && semestre) {
    const s1 = semestre === '1' ? `${ano}-01` : `${ano}-07`;
    const s2 = semestre === '1' ? `${ano}-06` : `${ano}-12`;
    q += ` AND TO_CHAR(created_at,'YYYY-MM') BETWEEN $${p.length + 1} AND $${p.length + 2}`; p.push(s1, s2);
  } else if (ano) {
    q += ` AND EXTRACT(YEAR FROM created_at) = $${p.length + 1}`; p.push(Number(ano));
  }
  if (client_type) { q += ` AND client_type = $${p.length + 1}`; p.push(client_type); }
  const result = await pool.query(q, p);
  const types = { revenda: { sum: 0, n: 0 }, final: { sum: 0, n: 0 } };
  for (const q of result.rows) {
    const key = q.client_type === 'revenda' ? 'revenda' : 'final';
    types[key].sum += parseFloat(q.total_value);
    types[key].n++;
  }
  res.json({
    revenda:           types.revenda.n > 0 ? Math.round(types.revenda.sum / types.revenda.n * 100) / 100 : 0,
    final:             types.final.n   > 0 ? Math.round(types.final.sum   / types.final.n   * 100) / 100 : 0,
    total_orcamentos:  result.rows.length,
  });
});

module.exports = router;
