const { pool } = require('../database/database');

function dataVencimento(dia, ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate();
  const d = Math.min(dia, ultimo);
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

async function gerarLancamento(fixa, dataVenc) {
  const mesAno = dataVenc.substring(0, 7); // 'YYYY-MM'
  const check  = await pool.query(
    `SELECT id FROM despesas WHERE despesa_fixa_id = $1 AND TO_CHAR(data::date,'YYYY-MM') = $2`,
    [fixa.id, mesAno]
  );
  if (check.rows[0]) return null;

  const result = await pool.query(
    `INSERT INTO despesas (descricao,valor,tipo,data,status,observacoes,despesa_fixa_id,gerado_automaticamente)
     VALUES ($1,$2,$3,$4,'pendente',$5,$6,1) RETURNING id`,
    [fixa.descricao, fixa.valor, fixa.categoria, dataVenc, fixa.observacoes || null, fixa.id]
  );
  return result.rows[0].id;
}

async function gerarLancamentosHoje() {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;
  const dia = now.getDate();

  const fixas = await pool.query(
    'SELECT * FROM despesas_fixas WHERE ativo = 1 AND dia_vencimento = $1',
    [dia]
  );
  let gerados = 0;
  for (const fixa of fixas.rows) {
    const dataVenc = dataVencimento(fixa.dia_vencimento, ano, mes);
    const id = await gerarLancamento(fixa, dataVenc);
    if (id) gerados++;
  }
  if (gerados > 0) console.log(`[CronJob] ${gerados} despesa(s) fixa(s) gerada(s) automaticamente`);
  return gerados;
}

async function inicializarLancamentos() {
  const now  = new Date();
  const ano  = now.getFullYear();
  const mes  = now.getMonth() + 1;
  const hoje = now.getDate();

  const fixas = await pool.query('SELECT * FROM despesas_fixas WHERE ativo = 1');
  let gerados = 0;
  for (const fixa of fixas.rows) {
    if (fixa.dia_vencimento <= hoje) {
      const dataVenc = dataVencimento(fixa.dia_vencimento, ano, mes);
      const id = await gerarLancamento(fixa, dataVenc);
      if (id) gerados++;
    }
  }
  if (gerados > 0) console.log(`[Startup] ${gerados} despesa(s) fixa(s) gerada(s) no catch-up inicial`);
  return gerados;
}

module.exports = { gerarLancamentosHoje, inicializarLancamentos };
