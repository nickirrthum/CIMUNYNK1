const express  = require('express');
const router   = express.Router();
const { pool } = require('../database/database');
const auth     = require('../middleware/auth');
const { criarReceitas } = require('../helpers/receitas');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');

// ── Upload setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `arte_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf', '.ai', '.eps', '.psd', '.cdr', '.svg', '.zip', '.webp', '.tif', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── Public route (sem auth) ───────────────────────────────────────────────────
router.get('/public/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM ai_quotes WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const q = result.rows[0];
  const items = JSON.parse(q.items_json).map(item => ({
    name:       item.name,
    quantity:   item.quantity,
    unit:       item.unit,
    unit_price: item.unit_price,
    total:      item.total,
  }));
  res.json({
    id:                q.id,
    client_name:       q.client_name,
    client_type:       q.client_type,
    items,
    total_value:       q.total_value,
    forma_pagamento:   q.forma_pagamento,
    momento_pagamento: q.momento_pagamento,
    num_parcelas:      q.num_parcelas,
    valor_entrada:     q.valor_entrada,
    data_restante:     q.data_restante,
    status:            q.status,
    created_at:        q.created_at,
  });
});

// ── All routes below require auth ─────────────────────────────────────────────
router.use(auth);

function getClient() {
  const Anthropic = require('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function buildSystemPrompt() {
  const result = await pool.query('SELECT * FROM products WHERE active = 1 ORDER BY category, name');
  return `Você é o assistente de orçamentos da Comunynk Gráfica. Sua missão é coletar informações e montar orçamentos precisos.

CATÁLOGO DE PRODUTOS:
${JSON.stringify(result.rows, null, 2)}

CAMPOS DO PRODUTO:
- resale_price: preço para revenda (pode ser null — nesse caso use final_price)
- final_price: preço para cliente final
- cost_price: custo interno de produção
- unit: unidade (m² ou 1000 un ou un)

FLUXO DE ATENDIMENTO:
1. Pergunte o que o cliente precisa (produto, material, dimensões, quantidade)
2. Pergunte se é revenda ou cliente final (para usar o preço correto)
3. Para produtos em m²: multiplique o preço pela área total (largura × altura × quantidade)
4. Para impressos (1000 un): o preço já é por 1000 unidades
5. Confirme o orçamento antes de finalizar
6. Quando tiver todos os dados, inclua o bloco JSON abaixo no final da sua mensagem

FORMATO OBRIGATÓRIO AO FINALIZAR O ORÇAMENTO — inclua exatamente assim ao final da mensagem:

##ORÇAMENTO##
{
  "items": [
    {
      "product_id": <id do produto ou null se não existir no catálogo>,
      "name": "<nome do produto>",
      "quantity": <quantidade numérica>,
      "unit": "<unidade: m², 1000 un, ou un>",
      "unit_price": <preço unitário usado>,
      "total": <total do item>,
      "cost_unit": <custo unitário>,
      "cost_total": <custo total do item>
    }
  ],
  "total_value": <soma de todos os totais>,
  "cost_total": <soma de todos os custos>,
  "margin_percent": <(total_value - cost_total) / total_value * 100, arredondado a 1 decimal>,
  "client_type": "<revenda ou final>"
}
##FIM##

Seja cordial e profissional. Responda sempre em português.`;
}

// POST /api/ai-quote
router.post('/', async (req, res) => {
  const { conversation } = req.body;
  if (!Array.isArray(conversation) || conversation.length === 0)
    return res.status(400).json({ erro: 'Conversa inválida' });
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'sua_chave_aqui')
    return res.status(503).json({ erro: 'ANTHROPIC_API_KEY não configurada no servidor' });

  const client = getClient();
  const response = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    system:     await buildSystemPrompt(),
    messages:   conversation,
  });
  res.json({ message: response.content[0].text });
});

// POST /api/ai-quote/confirm
router.post('/confirm', async (req, res) => {
  const { client_name, client_contact, items, total_value, cost_total, margin_percent, client_type,
          forma_pagamento, momento_pagamento, num_parcelas, valor_entrada, data_restante } = req.body;
  if (!client_name || !items?.length || !total_value)
    return res.status(400).json({ erro: 'Dados incompletos: client_name, items e total_value são obrigatórios' });

  const result = await pool.query(
    `INSERT INTO ai_quotes
       (client_name,client_contact,items_json,total_value,cost_total,margin_percent,status,client_type,
        forma_pagamento,momento_pagamento,num_parcelas,valor_entrada,data_restante)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      client_name, client_contact || null,
      JSON.stringify(items),
      parseFloat(total_value), parseFloat(cost_total) || 0, parseFloat(margin_percent) || 0,
      client_type || 'final',
      forma_pagamento || 'pix', momento_pagamento || 'a_vista',
      num_parcelas || null, valor_entrada || null, data_restante || null,
    ]
  );
  const quoteId = result.rows[0].id;
  res.status(201).json({ quote_id: quoteId, mensagem: `Orçamento #${quoteId} criado e aguardando aprovação.` });
});

// PUT /api/ai-quote/history/:id
router.put('/history/:id', async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'sent', 'approved', 'rejected'].includes(status))
    return res.status(400).json({ erro: 'Status inválido. Use: pending, sent, approved ou rejected' });

  const check = await pool.query('SELECT * FROM ai_quotes WHERE id = $1', [req.params.id]);
  if (!check.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const q = check.rows[0];

  await pool.query('UPDATE ai_quotes SET status = $1 WHERE id = $2', [status, q.id]);

  if (status === 'approved') {
    const today = new Date().toISOString().split('T')[0];

    let receitaResult;
    try {
      receitaResult = await criarReceitas({
        cliente:           q.client_name,
        servico:           `Orçamento #${q.id} - Gráfica`,
        valor:             q.total_value,
        status:            'pendente',
        data:              today,
        forma_pagamento:   q.forma_pagamento   || 'pix',
        momento_pagamento: q.momento_pagamento || 'a_vista',
        observacoes:       null,
        num_parcelas:      q.num_parcelas,
        valor_entrada:     q.valor_entrada,
        data_restante:     q.data_restante,
      });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }

    const receitaId  = receitaResult.parcelas ? receitaResult.ids[0] : receitaResult.id;
    const receitaIds = receitaResult.parcelas ? receitaResult.ids : [receitaId];

    return res.json({
      quote_id:    q.id,
      receita_id:  receitaId,
      receita_ids: receitaIds,
      parcelas:    receitaResult.parcelas || 1,
      mensagem:    `Orçamento #${q.id} aprovado! ${receitaIds.length > 1 ? receitaIds.length + ' receitas parceladas' : 'Receita'} lançada.`,
    });
  }

  res.json({ quote_id: q.id, mensagem: `Orçamento #${q.id} atualizado para ${status}.` });
});

// GET /api/ai-quote/history
router.get('/history', async (req, res) => {
  const result = await pool.query('SELECT * FROM ai_quotes ORDER BY created_at DESC');
  res.json(result.rows.map(q => ({ ...q, items: JSON.parse(q.items_json) })));
});

// GET /api/ai-quote/history/:id
router.get('/history/:id', async (req, res) => {
  const result = await pool.query('SELECT * FROM ai_quotes WHERE id = $1', [req.params.id]);
  if (!result.rows[0]) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  const q = result.rows[0];
  res.json({ ...q, items: JSON.parse(q.items_json) });
});

// POST /api/ai-quote/history/:id/upload-arte
router.post('/history/:id/upload-arte', upload.single('arte'), async (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado ou formato não permitido' });

  // Remove arquivo anterior se existir
  const prev = await pool.query('SELECT arte_filename FROM ai_quotes WHERE id=$1', [req.params.id]);
  if (prev.rows[0]?.arte_filename) {
    const oldPath = path.join(uploadDir, prev.rows[0].arte_filename);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  await pool.query(
    'UPDATE ai_quotes SET arte_filename=$1, arte_originalname=$2 WHERE id=$3',
    [req.file.filename, req.file.originalname, req.params.id]
  );
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// DELETE /api/ai-quote/history/:id/arte
router.delete('/history/:id/arte', async (req, res) => {
  const q = await pool.query('SELECT arte_filename FROM ai_quotes WHERE id=$1', [req.params.id]);
  const filename = q.rows[0]?.arte_filename;
  if (filename) {
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await pool.query('UPDATE ai_quotes SET arte_filename=NULL, arte_originalname=NULL WHERE id=$1', [req.params.id]);
  }
  res.json({ ok: true });
});

module.exports = router;
