require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const cron    = require('node-cron');
const path    = require('path');
const { initDB } = require('./database/database');

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight para todas as rotas
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth',           require('./routes/auth'));
app.use('/api/receitas',       require('./routes/receitas'));
app.use('/api/despesas',       require('./routes/despesas'));
app.use('/api/dashboard',      require('./routes/dashboard'));
app.use('/api/orcamentos',     require('./routes/orcamentos'));
app.use('/api/despesas-fixas', require('./routes/despesas-fixas'));
app.use('/api/products',       require('./routes/products'));
app.use('/api/ai-quote',       require('./routes/ai-quote'));
app.use('/api/caixa',          require('./routes/caixa'));

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Global error handler for unhandled async errors
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);

      const { inicializarLancamentos, gerarLancamentosHoje } = require('./jobs/despesasFixas');
      inicializarLancamentos().catch(console.error);

      cron.schedule('0 0 * * *', () => {
        console.log('[CronJob] Verificando despesas fixas...');
        gerarLancamentosHoje().catch(console.error);
      });
    });
  })
  .catch(err => {
    console.error('[DB] Falha ao inicializar banco de dados:', err.message || err);
    process.exit(1);
  });
