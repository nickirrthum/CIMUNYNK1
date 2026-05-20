const express = require('express');
const router  = express.Router();
const { pool } = require('../database/database');
const auth    = require('../middleware/auth');

router.use(auth);

// GET /api/products
router.get('/', async (req, res) => {
  const { category } = req.query;
  if (category) {
    const result = await pool.query(
      'SELECT * FROM products WHERE category = $1 ORDER BY name ASC',
      [category]
    );
    return res.json(result.rows);
  }
  const result = await pool.query('SELECT * FROM products ORDER BY category, name ASC');
  res.json(result.rows);
});

// POST /api/products
router.post('/', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const { name, category, unit, cost_price, resale_price, final_price } = req.body;
  if (!name || !category || !cost_price || !final_price)
    return res.status(400).json({ erro: 'Campos obrigatórios: name, category, cost_price, final_price' });

  const cost   = parseFloat(cost_price);
  const final  = parseFloat(final_price);
  const margin = Math.round(((final - cost) / final) * 1000) / 10;
  const result = await pool.query(
    `INSERT INTO products (name,category,unit,cost_price,resale_price,final_price,margin_percent)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, category, unit || 'm²', cost, resale_price ? parseFloat(resale_price) : null, final, margin]
  );
  res.status(201).json(result.rows[0]);
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  if (req.usuario.nivel_acesso !== 'admin') return res.status(403).json({ erro: 'Acesso negado' });
  const check = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Produto não encontrado' });
  const prod = check.rows[0];

  const { name, category, unit, cost_price, resale_price, final_price, active } = req.body;
  const newCost   = cost_price   !== undefined ? parseFloat(cost_price)  : parseFloat(prod.cost_price);
  const newFinal  = final_price  !== undefined ? parseFloat(final_price) : parseFloat(prod.final_price);
  const newResale = resale_price !== undefined ? (resale_price ? parseFloat(resale_price) : null) : prod.resale_price;
  const margin    = Math.round(((newFinal - newCost) / newFinal) * 1000) / 10;

  const result = await pool.query(
    `UPDATE products SET name=$1,category=$2,unit=$3,cost_price=$4,resale_price=$5,
     final_price=$6,margin_percent=$7,active=$8,updated_at=NOW()
     WHERE id=$9 RETURNING *`,
    [
      name     ?? prod.name,
      category ?? prod.category,
      unit     ?? prod.unit,
      newCost, newResale, newFinal, margin,
      active !== undefined ? active : prod.active,
      req.params.id,
    ]
  );
  res.json(result.rows[0]);
});

module.exports = router;
