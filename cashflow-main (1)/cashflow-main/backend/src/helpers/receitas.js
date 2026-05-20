const { pool } = require('../database/database');

// Adds N months to a date string 'YYYY-MM-DD', clamping to last day of month
function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const day = Math.min(d, lastDay);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Creates one or more receitas based on payment type.
 * Returns the created row (single) or { tipo, parcelas, ids } (multi).
 */
async function criarReceitas({
  cliente, servico, valor, status, data,
  forma_pagamento, momento_pagamento, observacoes,
  num_parcelas, valor_entrada, data_restante,
}) {
  const n = parseInt(num_parcelas) || 0;

  // ── Parcelado ────────────────────────────────────────────────────────────
  if (momento_pagamento === 'parcelado' && n >= 2) {
    const total = Number(valor);
    // Divide evenly; remainder goes to last parcel
    const base = Math.floor((total / n) * 100) / 100;
    const ids  = [];

    for (let i = 1; i <= n; i++) {
      const dataParcela  = addMonths(data, i - 1);
      const valorParcela = i === n ? Math.round((total - base * (n - 1)) * 100) / 100 : base;
      const obs          = `Parcela ${i}/${n}${observacoes ? ' — ' + observacoes : ''}`;
      const paiId        = i === 1 ? null : ids[0];

      const result = await pool.query(
        `INSERT INTO receitas
           (cliente,servico,valor,status,data,forma_pagamento,momento_pagamento,
            observacoes,parcela_numero,parcela_total,receita_pai_id)
         VALUES ($1,$2,$3,$4,$5,$6,'parcelado',$7,$8,$9,$10) RETURNING id`,
        [cliente, servico, valorParcela,
         i === 1 ? (status || 'pendente') : 'pendente',
         dataParcela, forma_pagamento, obs, i, n, paiId],
      );
      const id = result.rows[0].id;
      if (i === 1) {
        // self-reference so pai always points to first instalment
        await pool.query('UPDATE receitas SET receita_pai_id = $1 WHERE id = $1', [id]);
      }
      ids.push(id);
    }
    return { tipo: 'parcelado', parcelas: n, ids };
  }

  // ── Entrada + Restante ───────────────────────────────────────────────────
  if (momento_pagamento === 'entrada_restante') {
    const total   = Number(valor);
    const entrada = Math.round(Number(valor_entrada) * 100) / 100;
    const restante = Math.round((total - entrada) * 100) / 100;

    if (!entrada || !data_restante || entrada >= total)
      throw new Error('Informe valor_entrada (menor que o total) e data_restante');

    const r1 = await pool.query(
      `INSERT INTO receitas
         (cliente,servico,valor,status,data,forma_pagamento,momento_pagamento,
          observacoes,parcela_numero,parcela_total)
       VALUES ($1,$2,$3,$4,$5,$6,'entrada_restante',$7,1,2) RETURNING id`,
      [cliente, servico, entrada, status || 'pendente', data, forma_pagamento,
       `Entrada${observacoes ? ' — ' + observacoes : ''}`],
    );
    const entradaId = r1.rows[0].id;
    await pool.query('UPDATE receitas SET receita_pai_id = $1 WHERE id = $1', [entradaId]);

    await pool.query(
      `INSERT INTO receitas
         (cliente,servico,valor,status,data,forma_pagamento,momento_pagamento,
          observacoes,parcela_numero,parcela_total,receita_pai_id)
       VALUES ($1,$2,$3,'pendente',$4,$5,'entrada_restante',$6,2,2,$7)`,
      [cliente, servico, restante, data_restante, forma_pagamento,
       `Restante${observacoes ? ' — ' + observacoes : ''}`, entradaId],
    );
    return { tipo: 'entrada_restante', parcelas: 2, ids: [entradaId] };
  }

  // ── Pagamento único (à vista / recorrente / etc.) ────────────────────────
  const result = await pool.query(
    `INSERT INTO receitas
       (cliente,servico,valor,status,data,forma_pagamento,momento_pagamento,observacoes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [cliente, servico, Number(valor), status || 'pendente', data,
     forma_pagamento, momento_pagamento, observacoes || null],
  );
  return result.rows[0];
}

module.exports = { criarReceitas };
