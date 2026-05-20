const { Pool, types } = require('pg');
const bcrypt = require('bcryptjs');

// Retorna NUMERIC como número JS em vez de string
types.setTypeParser(1700, parseFloat);

if (!process.env.DATABASE_URL) {
  console.error('[DB] ERRO: variável DATABASE_URL não definida. Configure o plugin PostgreSQL no Railway.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL,
      nivel_acesso TEXT NOT NULL DEFAULT 'visualizador',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS receitas (
      id SERIAL PRIMARY KEY,
      cliente TEXT NOT NULL,
      servico TEXT NOT NULL,
      valor NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      data TEXT NOT NULL,
      forma_pagamento TEXT NOT NULL,
      momento_pagamento TEXT NOT NULL,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS despesas (
      id SERIAL PRIMARY KEY,
      descricao TEXT NOT NULL,
      valor NUMERIC NOT NULL,
      tipo TEXT NOT NULL,
      data TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      observacoes TEXT,
      despesa_fixa_id INTEGER,
      gerado_automaticamente INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      id SERIAL PRIMARY KEY,
      cliente TEXT NOT NULL,
      email_cliente TEXT NOT NULL,
      servicos TEXT NOT NULL,
      valor_total NUMERIC NOT NULL,
      validade TEXT NOT NULL,
      observacoes TEXT,
      status TEXT NOT NULL DEFAULT 'rascunho',
      token_publico TEXT UNIQUE NOT NULL,
      data_criacao TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS despesas_fixas (
      id SERIAL PRIMARY KEY,
      descricao TEXT NOT NULL,
      valor NUMERIC NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'fixa',
      dia_vencimento INTEGER NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'm²',
      cost_price NUMERIC NOT NULL,
      resale_price NUMERIC,
      final_price NUMERIC NOT NULL,
      margin_percent NUMERIC NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_quotes (
      id SERIAL PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_contact TEXT,
      items_json TEXT NOT NULL,
      total_value NUMERIC NOT NULL,
      cost_total NUMERIC NOT NULL,
      margin_percent NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      client_type TEXT NOT NULL DEFAULT 'final',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS caixa_sessoes (
      id SERIAL PRIMARY KEY,
      data TEXT NOT NULL UNIQUE,
      saldo_inicial NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Migrate: add installment/payment columns if missing
  await pool.query(`
    ALTER TABLE receitas ADD COLUMN IF NOT EXISTS parcela_numero INTEGER;
    ALTER TABLE receitas ADD COLUMN IF NOT EXISTS parcela_total INTEGER;
    ALTER TABLE receitas ADD COLUMN IF NOT EXISTS receita_pai_id INTEGER;

    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'transferencia';
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS momento_pagamento TEXT DEFAULT 'a_vista';
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS num_parcelas INTEGER;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC;
    ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS data_restante TEXT;

    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS forma_pagamento TEXT DEFAULT 'pix';
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS momento_pagamento TEXT DEFAULT 'a_vista';
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS num_parcelas INTEGER;
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS valor_entrada NUMERIC;
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS data_restante TEXT;
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS arte_filename TEXT;
    ALTER TABLE ai_quotes ADD COLUMN IF NOT EXISTS arte_originalname TEXT;
  `);

  // Seed admin user if not exists
  const adminCheck = await pool.query("SELECT id FROM usuarios WHERE email = 'admin@cashflow.com'");
  if (adminCheck.rows.length === 0) {
    const senhaAdmin  = bcrypt.hashSync('admin123', 10);
    const senhaViewer = bcrypt.hashSync('viewer123', 10);

    await pool.query(
      'INSERT INTO usuarios (nome, email, senha, nivel_acesso) VALUES ($1,$2,$3,$4)',
      ['Administrador', 'admin@cashflow.com', senhaAdmin, 'admin']
    );
    await pool.query(
      'INSERT INTO usuarios (nome, email, senha, nivel_acesso) VALUES ($1,$2,$3,$4)',
      ['Visualizador', 'viewer@cashflow.com', senhaViewer, 'visualizador']
    );

    const ir = (c,s,v,st,d,fp,mp,obs) => pool.query(
      `INSERT INTO receitas (cliente,servico,valor,status,data,forma_pagamento,momento_pagamento,observacoes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [c,s,v,st,d,fp,mp,obs]
    );
    await ir('João Silva','Consultoria',2000,'pago','2026-04-01','pix','a_vista',null);
    await ir('Maria Santos','Desenvolvimento Web',5000,'pago','2026-03-15','transferencia','parcelado','Parcela 1/3');
    await ir('Empresa XYZ','Suporte Mensal',1500,'pago','2026-03-01','pix','recorrente_mensal',null);
    await ir('Empresa XYZ','Suporte Mensal',1500,'pendente','2026-04-07','pix','recorrente_mensal',null);
    await ir('Pedro Oliveira','Design Gráfico',800,'atrasado','2026-03-20','boleto','a_vista',null);
    await ir('Tech Corp','Manutenção de Sistema',3000,'pago','2026-02-15','cartao','a_vista',null);
    await ir('Startup ABC','Consultoria Estratégica',4500,'pago','2026-02-01','transferencia','recorrente_mensal',null);
    await ir('Startup ABC','Consultoria Estratégica',4500,'pago','2026-03-01','transferencia','recorrente_mensal',null);

    const id = (d,v,t,dt,s,o) => pool.query(
      `INSERT INTO despesas (descricao,valor,tipo,data,status,observacoes) VALUES ($1,$2,$3,$4,$5,$6)`,
      [d,v,t,dt,s,o]
    );
    await id('Aluguel do Escritório',1200,'fixa','2026-04-01','pendente',null);
    await id('Internet Fibra',150,'fixa','2026-04-05','pago',null);
    await id('Honorários do Contador',400,'burocrática','2026-04-01','pago',null);
    await id('Material de Escritório',200,'operacional','2026-03-28','pago',null);
    await id('Licença Adobe',350,'operacional','2026-03-15','pago',null);
    await id('Energia Elétrica',180,'recorrente','2026-04-05','pendente',null);
    await id('Café e Lanches',120,'esporadica','2026-04-03','pago',null);
    await id('Aluguel do Escritório',1200,'fixa','2026-03-01','pago',null);
    await id('Internet Fibra',150,'fixa','2026-03-05','pago',null);
    await id('Energia Elétrica',165,'recorrente','2026-03-05','pago',null);
    await id('Registro de Marca',800,'burocrática','2026-02-10','pago',null);
    await id('Manutenção do Computador',300,'esporadica','2026-02-20','pago',null);

    const idf = (d,v,c,dv,o) => pool.query(
      'INSERT INTO despesas_fixas (descricao,valor,categoria,dia_vencimento,observacoes) VALUES ($1,$2,$3,$4,$5)',
      [d,v,c,dv,o]
    );
    await idf('Aluguel do Escritório',1200,'fixa',1,null);
    await idf('Internet Fibra',150,'fixa',5,'Operadora principal');
    await idf('Energia Elétrica',180,'recorrente',10,null);
    await idf('Honorários do Contador',400,'burocrática',1,'Pagamento mensal');

    console.log('Banco de dados inicializado com dados de exemplo');
    console.log('Admin: admin@cashflow.com / admin123');
    console.log('Viewer: viewer@cashflow.com / viewer123');
  }

  // Seed products if empty
  const prodCount = await pool.query('SELECT COUNT(*) as n FROM products');
  if (parseInt(prodCount.rows[0].n) === 0) {
    const m = (cost, final) => Math.round(((final - cost) / final) * 1000) / 10;
    const ip = (name, category, unit, cost_price, resale_price, final_price) => pool.query(
      'INSERT INTO products (name,category,unit,cost_price,resale_price,final_price,margin_percent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [name, category, unit, cost_price, resale_price, final_price, m(cost_price, final_price)]
    );

    await ip('Adesivo','Impressões','m²',13.50,70,90);
    await ip('Adesivo Imp. + Rec.','Impressões','m²',52.00,80,100);
    await ip('Adesivo Promocional','Impressões','m²',5.91,65,75);
    await ip('Adesivo Pro. Imp. + Rec.','Impressões','m²',48.75,75,85);
    await ip('Adesivo Rec. + Masc.','Impressões','m²',65.00,100,150);
    await ip('Lona','Impressões','m²',7.19,60,80);
    await ip('Banner / Lona com Ilhós','Impressões','m²',7.19,70,90);
    await ip('Tecido','Impressões','m²',14.00,120,135);
    await ip('Canvas','Impressões','m²',20.31,150,180);
    await ip('Fotográfico','Impressões','m²',78.00,120,150);
    await ip('Papel','Impressões','m²',26.00,40,50);
    await ip('Laminação','Impressões','m²',9.60,30,40);
    await ip('Jateado','Impressões','m²',13.00,90,120);
    await ip('Preto Fosco','Impressões','m²',45.50,70,90);
    await ip('Perfurado','Impressões','m²',78.00,120,140);
    await ip('Wind Banner','Impressões','un',227.50,null,350);
    await ip('Instalação Adesivo','Impressões','m²',19.50,30,30);
    await ip('Instalação Lona Ilhós','Impressões','m²',19.50,30,30);
    await ip('Cartão Visita 4x4 Simples','Impressos','1000 un',84.50,null,130);
    await ip('Cartão Visita 4x4 Lam. Fosca + Verniz','Impressos','1000 un',149.50,null,230);
    await ip('Flyer A5 4x4','Impressos','1000 un',218.40,null,336);
    await ip('Flyer A6 4x4','Impressos','1000 un',146.90,null,226);
    await ip('Placa 2mm + Adesivo','Placas','m²',33.66,170,220);
    await ip('Placa 3mm + Adesivo','Placas','m²',41.72,230,250);
    await ip('Placa 3mm Colméia + Adesivo','Placas','m²',41.72,230,250);
    await ip('Placa 5mm + Adesivo','Placas','m²',53.81,320,370);
    await ip('Placa 10mm CNC + Adesivo','Placas','m²',80.02,520,570);
    await ip('Placa 20mm CNC + Adesivo','Placas','m²',151.23,920,970);
    await ip('Placa ACM CNC + Adesivo','Placas','m²',80.71,350,400);
    await ip('Acrílico 2mm CNC + Adesivo','Placas','m²',106.00,500,550);
    await ip('Acrílico 3mm CNC + Adesivo','Placas','m²',163.50,600,650);
    await ip('Acrílico 3mm Leitoso CNC + Adesivo','Placas','m²',163.50,600,650);
    await ip('Acrílico 4mm CNC + Adesivo','Placas','m²',233.50,700,750);
    await ip('Acrílico 5mm CNC + Adesivo','Placas','m²',520.00,800,850);
    await ip('Acrílico 6mm CNC + Adesivo','Placas','m²',333.50,900,950);
    await ip('Acrílico 8mm CNC + Adesivo','Placas','m²',430.50,1000,1050);
    await ip('Acrílico 10mm CNC + Adesivo','Placas','m²',526.00,1100,1150);

    console.log('[DB] Catálogo de produtos inserido (37 produtos)');
  }

  console.log('[DB] Banco de dados pronto');
}

module.exports = { pool, initDB };
