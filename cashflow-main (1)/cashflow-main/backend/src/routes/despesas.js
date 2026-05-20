const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const { status, tipo, mes, ano, semestre } = req.query;
  let query = 'SELECT * FROM despesas WHERE 1=1';
  const params = [];
  let idx = 1;
  if (status) { query += ` AND status = $${idx++}`; params.push(status); }
  if (tipo)   { query += ` AND tipo = $${idx++}`;   params.push(tipo); }
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
  const result = await pool.query('SELECT * FROM despesas WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Despesa não encontrada' });
  res.json(result.rows[0]);
});

router.post('/', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const { descricao, valor, tipo, data, status, observacoes } = req.body;
  if (!descricao || !valor || !tipo || !data)
    return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });

  const result = await pool.query(
    `INSERT INTO despesas (descricao,valor,tipo,data,status,observacoes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [descricao, Number(valor), tipo, data, status || 'pendente', observacoes || null]
  );
  res.status(201).json(result.rows[0]);
});

router.put('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM despesas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Despesa não encontrada' });

  const { descricao, valor, tipo, data, status, observacoes } = req.body;
  const result = await pool.query(
    `UPDATE despesas SET descricao=$1,valor=$2,tipo=$3,data=$4,status=$5,
     observacoes=$6,updated_at=NOW() WHERE id=$7 RETURNING *`,
    [descricao, Number(valor), tipo, data, status, observacoes || null, req.params.id]
  );
  res.json(result.rows[0]);
});

router.delete('/:id', auth, async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Sem permissão' });
  const check = await pool.query('SELECT id FROM despesas WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Despesa não encontrada' });
  await pool.query('DELETE FROM despesas WHERE id = $1', [req.params.id]);
  res.json({ mensagem: 'Despesa excluída com sucesso' });
});

module.exports = router;
