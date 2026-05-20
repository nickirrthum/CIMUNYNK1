const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha são obrigatórios' });

  const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
  const usuario = result.rows[0];
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel_acesso: usuario.nivel_acesso },
    process.env.JWT_SECRET || 'cashflow_jwt_secret_2024',
    { expiresIn: '24h' }
  );
  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, nivel_acesso: usuario.nivel_acesso },
  });
});

router.get('/me', auth, async (req, res) => {
  const result = await pool.query(
    'SELECT id, nome, email, nivel_acesso FROM usuarios WHERE id = $1',
    [req.usuario.id]
  );
  if (!result.rows[0]) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(result.rows[0]);
});

module.exports = router;
