const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');
const { criarReceitas } = require('../helpers/receitas');

router.get('/', auth, async (req, res) => {
  const { status, forma_pagamento, momento_pagamento, mes, ano, semestre } = req.query;
  let query = 'SELECT * FROM receitas WHERE 1=1';
  const params = [];
  let idx = 1;
  if (status)            { query += ` AND status = $${idx++}`;            params.push(status); }
  if (forma_pagamento)   { query += ` AND forma_pagamento = $${idx++}`;   params.push(forma_pagamento); }
  if (momento_pagamento) { query += ` AND momento_pagamento = $${idx++}`; params.push(momento_pagamento); }
  if (ano && mes) {
    query += ` AND TO_CHAR(data::date,'YYYY-MM') = $${idx++}`;
    params.push(`${ano}-${String(mes).padStart(2,'0')}`);
  } else if (ano && semestre) {
    const [s, e] = semestre === '1' ? [1,6] : [7,12];
    query += ` AND EXTRACT(YEAR FROM data::date) = $${idx++} AND EXTRACT(MONTH FROM data::date) BETWEEN ${s} AND ${e}`;
    params.push(Number(ano));
  } else if (ano) {
    query += ` AND EXTRACT(YEAR FROM data::date) = $${idx++}`;
    params.push(Number(ano));
  }
  query += ' ORDER BY data DESC, created_at DESC';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.get('/:id', auth, async (req, res) => {
  const result = await pool.query('SELECT * FROM receitas WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Receita não encontrada' });
  res.json(result.rows[0]);
});

router.post('/', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const { cliente, servico, valor, status, data, forma_pagamento, momento_pagamento,
          observacoes, num_parcelas, valor_entrada, data_restante } = req.body;
  if (!cliente || !servico || !valor || !data || !forma_pagamento || !momento_pagamento)
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });

  try {
    const result = await criarReceitas({
      cliente, servico, valor, status, data, forma_pagamento, momento_pagamento,
      observacoes, num_parcelas, valor_entrada, data_restante,
    });
    if (result.parcelas) {
      res.status(201).json({ mensagem: `${result.parcelas} lançamentos criados com sucesso`, ids: result.ids, parcelas: result.parcelas });
    } else {
      res.status(201).json(result);
    }
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM receitas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Receita não encontrada' });

  const { cliente, servico, valor, status, data, forma_pagamento, momento_pagamento, observacoes } = req.body;
  const result = await pool.query(
    `UPDATE receitas SET cliente=$1,servico=$2,valor=$3,status=$4,data=$5,
     forma_pagamento=$6,momento_pagamento=$7,observacoes=$8,updated_at=NOW()
     WHERE id=$9 RETURNING *`,
    [cliente, servico, Number(valor), status, data, forma_pagamento, momento_pagamento, observacoes || null, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM receitas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Receita não encontrada' });
  await pool.query('DELETE FROM receitas WHERE id = $1', [req.params.id]);
  res.json({ mensagem: 'Receita excluída com sucesso' });
});

module.exports = router;
