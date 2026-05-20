const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');
const { criarReceitas } = require('../helpers/receitas');

// ── Rotas públicas ─────────────────────────────────────────────────────────

router.get('/publico/:token', async (req, res) => {
  const result = await pool.query('SELECT * FROM orcamentos WHERE token_publico = $1', [req.params.token]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const orc = result.rows[0];
  res.json({ ...orc, servicos: JSON.parse(orc.servicos) });
});

router.put('/publico/:token/aprovar', async (req, res) => {
  const result = await pool.query('SELECT * FROM orcamentos WHERE token_publico = $1', [req.params.token]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const orc = result.rows[0];
  if (orc.status !== 'enviado')
    return res.status(400).json({ erro: 'Este orçamento não está disponível para aprovação' });

  await pool.query('UPDATE orcamentos SET status=$1, updated_at=NOW() WHERE id=$2', ['aprovado', orc.id]);

  const servicos    = JSON.parse(orc.servicos);
  const servicoDesc = servicos.map(s => s.descricao).join(', ');
  const hoje        = new Date().toISOString().split('T')[0];

  try {
    await criarReceitas({
      cliente:           orc.cliente,
      servico:           servicoDesc,
      valor:             orc.valor_total,
      status:            'pendente',
      data:              hoje,
      forma_pagamento:   orc.forma_pagamento   || 'transferencia',
      momento_pagamento: orc.momento_pagamento || 'a_vista',
      observacoes:       `Orçamento #${orc.id}`,
      num_parcelas:      orc.num_parcelas,
      valor_entrada:     orc.valor_entrada,
      data_restante:     orc.data_restante,
    });
  } catch (err) {
    return res.status(400).json({ erro: err.message });
  }
  res.json({ mensagem: 'Orçamento aprovado com sucesso! A(s) receita(s) foram criadas no fluxo de caixa.' });
});

router.put('/publico/:token/recusar', async (req, res) => {
  const result = await pool.query('SELECT * FROM orcamentos WHERE token_publico = $1', [req.params.token]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const orc = result.rows[0];
  if (orc.status !== 'enviado')
    return res.status(400).json({ erro: 'Este orçamento não está disponível para recusa' });

  await pool.query('UPDATE orcamentos SET status=$1, updated_at=NOW() WHERE id=$2', ['recusado', orc.id]);
  res.json({ mensagem: 'Orçamento recusado.' });
});

// ── Rotas autenticadas ─────────────────────────────────────────────────────

router.get('/', auth, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM orcamentos WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = $1'; params.push(status); }
  query += ' ORDER BY data_criacao DESC';
  const lista = await pool.query(query, params);
  res.json(lista.rows.map(o => ({ ...o, servicos: JSON.parse(o.servicos) })));
});

router.get('/:id', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM orcamentos WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const orc = result.rows[0];
  res.json({ ...orc, servicos: JSON.parse(orc.servicos) });
});

router.post('/', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const { cliente, email_cliente, servicos, valor_total, validade, observacoes, status,
          forma_pagamento, momento_pagamento, num_parcelas, valor_entrada, data_restante } = req.body;
  if (!cliente || !email_cliente || !servicos?.length || !valor_total || !validade)
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });

  const token  = crypto.randomBytes(20).toString('hex');
  const result = await pool.query(
    `INSERT INTO orcamentos
       (cliente,email_cliente,servicos,valor_total,validade,observacoes,status,token_publico,
        forma_pagamento,momento_pagamento,num_parcelas,valor_entrada,data_restante)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [cliente, email_cliente, JSON.stringify(servicos), Number(valor_total), validade,
     observacoes || null, status || 'rascunho', token,
     forma_pagamento || 'transferencia', momento_pagamento || 'a_vista',
     num_parcelas || null, valor_entrada || null, data_restante || null]
  );
  const novo = result.rows[0];
  res.status(201).json({ ...novo, servicos: JSON.parse(novo.servicos) });
});

router.put('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM orcamentos WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });

  const { cliente, email_cliente, servicos, valor_total, validade, observacoes, status,
          forma_pagamento, momento_pagamento, num_parcelas, valor_entrada, data_restante } = req.body;
  const result = await pool.query(
    `UPDATE orcamentos
     SET cliente=$1,email_cliente=$2,servicos=$3,valor_total=$4,validade=$5,
         observacoes=$6,status=$7,
         forma_pagamento=$8,momento_pagamento=$9,num_parcelas=$10,
         valor_entrada=$11,data_restante=$12,updated_at=NOW()
     WHERE id=$13 RETURNING *`,
    [cliente, email_cliente, JSON.stringify(servicos), Number(valor_total), validade,
     observacoes || null, status,
     forma_pagamento || 'transferencia', momento_pagamento || 'a_vista',
     num_parcelas || null, valor_entrada || null, data_restante || null,
     req.params.id]
  );
  const updated = result.rows[0];
  res.json({ ...updated, servicos: JSON.parse(updated.servicos) });
});

router.delete('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM orcamentos WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  await pool.query('DELETE FROM orcamentos WHERE id = $1', [req.params.id]);
  res.json({ mensagem: 'Orçamento excluído com sucesso' });
});

module.exports = router;
