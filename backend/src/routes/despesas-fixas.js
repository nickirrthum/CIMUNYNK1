const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.use(auth);

async function enrich(fixa) {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = now.getMonth() + 1;
  const dia = fixa.dia_vencimento;

  const ultimoDiaMes  = new Date(ano, mes, 0).getDate();
  const diaReal       = Math.min(dia, ultimoDiaMes);
  const dataProxima   = `${ano}-${String(mes).padStart(2,'0')}-${String(diaReal).padStart(2,'0')}`;

  const proximoMes    = mes === 12 ? 1 : mes + 1;
  const anoProximo    = mes === 12 ? ano + 1 : ano;
  const ultimoDiaProx = new Date(anoProximo, proximoMes, 0).getDate();
  const diaProx       = Math.min(dia, ultimoDiaProx);
  const dataProxFutura = `${anoProximo}-${String(proximoMes).padStart(2,'0')}-${String(diaProx).padStart(2,'0')}`;

  const mesAnoAtual = `${ano}-${String(mes).padStart(2,'0')}`;

  const [ultimoRes, geradoRes] = await Promise.all([
    pool.query(
      `SELECT * FROM despesas WHERE despesa_fixa_id = $1 ORDER BY data DESC LIMIT 1`,
      [fixa.id]
    ),
    pool.query(
      `SELECT id FROM despesas WHERE despesa_fixa_id = $1 AND TO_CHAR(data::date,'YYYY-MM') = $2`,
      [fixa.id, mesAnoAtual]
    ),
  ]);

  const ultimo        = ultimoRes.rows[0] || null;
  const geradoEsteMes = geradoRes.rows[0] || null;
  const proximo_previsto = geradoEsteMes ? dataProxFutura : dataProxima;

  return { ...fixa, ultimo_lancamento: ultimo, proximo_previsto };
}

// GET /api/despesas-fixas
router.get('/', async (req, res) => {
  const fixas  = await pool.query('SELECT * FROM despesas_fixas ORDER BY dia_vencimento ASC');
  const result = await Promise.all(fixas.rows.map(enrich));
  res.json(result);
});

// POST /api/despesas-fixas
router.post('/', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const { descricao, valor, categoria = 'fixa', dia_vencimento, observacoes } = req.body;
  if (!descricao || !valor || !dia_vencimento)
    return res.status(400).json({ erro: 'Campos obrigatórios ausentes' });
  if (dia_vencimento < 1 || dia_vencimento > 31)
    return res.status(400).json({ erro: 'Dia de vencimento inválido (1-31)' });

  const result = await pool.query(
    `INSERT INTO despesas_fixas (descricao,valor,categoria,dia_vencimento,observacoes)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [descricao, parseFloat(valor), categoria, parseInt(dia_vencimento), observacoes || null]
  );
  res.status(201).json(await enrich(result.rows[0]));
});

// PUT /api/despesas-fixas/:id
router.put('/:id', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const check = await pool.query('SELECT id FROM despesas_fixas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Despesa fixa não encontrada' });

  const { descricao, valor, categoria, dia_vencimento, ativo, observacoes } = req.body;
  if (dia_vencimento !== undefined && (dia_vencimento < 1 || dia_vencimento > 31))
    return res.status(400).json({ erro: 'Dia de vencimento inválido (1-31)' });

  const result = await pool.query(
    `UPDATE despesas_fixas SET
       descricao      = COALESCE($1, descricao),
       valor          = COALESCE($2, valor),
       categoria      = COALESCE($3, categoria),
       dia_vencimento = COALESCE($4, dia_vencimento),
       ativo          = COALESCE($5, ativo),
       observacoes    = COALESCE($6, observacoes),
       updated_at     = NOW()
     WHERE id = $7 RETURNING *`,
    [
      descricao  || null,
      valor      ? parseFloat(valor) : null,
      categoria  || null,
      dia_vencimento ? parseInt(dia_vencimento) : null,
      ativo !== undefined ? ativo : null,
      observacoes !== undefined ? (observacoes || null) : null,
      req.params.id,
    ]
  );
  res.json(await enrich(result.rows[0]));
});

// DELETE /api/despesas-fixas/:id
router.delete('/:id', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const check = await pool.query('SELECT id FROM despesas_fixas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Despesa fixa não encontrada' });
  await pool.query('DELETE FROM despesas_fixas WHERE id = $1', [req.params.id]);
  res.json({ mensagem: 'Despesa fixa removida' });
});

// POST /api/despesas-fixas/gerar — acionamento manual
router.post('/gerar', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const { gerarLancamentosHoje } = require('../jobs/despesasFixas');
  const gerados = await gerarLancamentosHoje();
  res.json({ mensagem: `${gerados} lançamento(s) gerado(s)`, gerados });
});

module.exports = router;
