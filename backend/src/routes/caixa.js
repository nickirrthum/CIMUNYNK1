const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.use(auth);

const today = () => new Date().toISOString().split('T')[0];

// GET /api/caixa/hoje — sessão + movimentações de hoje + fixas pendentes
router.get('/hoje', async (req, res) => {
  try {
    const data = today();
    const diaHoje = new Date().getDate();

    const [sessaoRes, receitasRes, despesasRes, fixasRes] = await Promise.all([
      pool.query('SELECT * FROM caixa_sessoes WHERE data = $1', [data]),

      pool.query(
        `SELECT id, cliente, servico, valor, status, forma_pagamento, observacoes, created_at
         FROM receitas WHERE data = $1 ORDER BY created_at DESC`,
        [data]
      ),

      pool.query(
        `SELECT id, descricao, valor, tipo, status, observacoes, despesa_fixa_id, created_at
         FROM despesas WHERE data = $1 ORDER BY created_at DESC`,
        [data]
      ),

      pool.query(
        `SELECT df.id, df.descricao, df.valor, df.categoria
         FROM despesas_fixas df
         WHERE df.ativo = 1
           AND df.dia_vencimento = $1
           AND NOT EXISTS (
             SELECT 1 FROM despesas d
             WHERE d.despesa_fixa_id = df.id AND d.data = $2
           )`,
        [diaHoje, data]
      ),
    ]);

    res.json({
      sessao:          sessaoRes.rows[0] || null,
      receitas:        receitasRes.rows,
      despesas:        despesasRes.rows,
      fixas_pendentes: fixasRes.rows,
    });
  } catch (e) {
    console.error('[caixa/hoje]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/caixa/abrir — abre o caixa do dia com saldo inicial
router.post('/abrir', async (req, res) => {
  try {
    const { saldo_inicial = 0 } = req.body;
    const data = today();

    const existe = await pool.query('SELECT id FROM caixa_sessoes WHERE data = $1', [data]);
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'Caixa já foi aberto hoje.' });
    }

    const r = await pool.query(
      'INSERT INTO caixa_sessoes (data, saldo_inicial) VALUES ($1, $2) RETURNING *',
      [data, saldo_inicial]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('[caixa/abrir]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/caixa/lancamento — cria receita ou despesa com status=pago
router.post('/lancamento', async (req, res) => {
  try {
    const { tipo } = req.body;
    const data = today();

    if (tipo === 'receita') {
      const { cliente, servico, valor, forma_pagamento = 'pix', observacoes = null } = req.body;
      const r = await pool.query(
        `INSERT INTO receitas (cliente, servico, valor, status, data, forma_pagamento, momento_pagamento, observacoes)
         VALUES ($1, $2, $3, 'pago', $4, $5, 'a_vista', $6) RETURNING *`,
        [cliente, servico, valor, data, forma_pagamento, observacoes]
      );
      return res.status(201).json({ tipo: 'receita', ...r.rows[0] });
    }

    if (tipo === 'despesa') {
      const { descricao, valor, tipo_despesa = 'esporadica', observacoes = null } = req.body;
      const r = await pool.query(
        `INSERT INTO despesas (descricao, valor, tipo, status, data, observacoes)
         VALUES ($1, $2, $3, 'pago', $4, $5) RETURNING *`,
        [descricao, valor, tipo_despesa, data, observacoes]
      );
      return res.status(201).json({ tipo: 'despesa', ...r.rows[0] });
    }

    res.status(400).json({ error: 'tipo deve ser "receita" ou "despesa"' });
  } catch (e) {
    console.error('[caixa/lancamento]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/caixa/pagar/:tipo/:id — alterna status pago ↔ pendente
router.put('/pagar/:tipo/:id', async (req, res) => {
  try {
    const { tipo, id } = req.params;
    const { status } = req.body;

    if (tipo === 'receita') {
      const r = await pool.query(
        'UPDATE receitas SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      return res.json(r.rows[0]);
    }

    if (tipo === 'despesa') {
      const r = await pool.query(
        'UPDATE despesas SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );
      return res.json(r.rows[0]);
    }

    res.status(400).json({ error: 'tipo inválido' });
  } catch (e) {
    console.error('[caixa/pagar]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/caixa/lancar-fixa/:id — lança uma despesa fixa como pago hoje
router.post('/lancar-fixa/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = today();

    const fixa = await pool.query('SELECT * FROM despesas_fixas WHERE id = $1', [id]);
    if (!fixa.rows.length) return res.status(404).json({ error: 'Despesa fixa não encontrada.' });

    const f = fixa.rows[0];

    // Verifica se já foi lançada hoje
    const jaExiste = await pool.query(
      'SELECT id FROM despesas WHERE despesa_fixa_id = $1 AND data = $2',
      [f.id, data]
    );
    if (jaExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Despesa fixa já lançada hoje.' });
    }

    const r = await pool.query(
      `INSERT INTO despesas (descricao, valor, tipo, status, data, despesa_fixa_id, gerado_automaticamente)
       VALUES ($1, $2, $3, 'pago', $4, $5, 0) RETURNING *`,
      [f.descricao, f.valor, f.categoria, data, f.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('[caixa/lancar-fixa]', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
