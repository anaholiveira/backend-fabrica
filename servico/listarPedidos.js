import pool from './conexao.js';

export async function listarPedidosAdmin(req, res) {
  try {
    const { filtro } = req.query;

    const query = `
      SELECT
        p.id_pedido,
        p.data_criacao,
        c.id_cliente,
        c.email AS email_cliente,
        c.nome_completo,
        p.valor_total,
        p.forma_pagamento,
        p.status,
        i.nome AS nome_ingrediente,
        i.tipo,
        pi.quantidade AS quantidade_ingrediente,
        e.rua,
        e.numero,
        e.bairro,
        e.cep,
        e.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      LEFT JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      WHERE p.status = ?
      ORDER BY p.id_pedido, p.data_criacao
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const pedidosMap = new Map();

    for (const row of rows) {
      const id = row.id_pedido;

      if (!pedidosMap.has(id)) {
        pedidosMap.set(id, {
          id_pedido: id,
          data_criacao: new Date(row.data_criacao).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          id_cliente: row.id_cliente,
          email_cliente: row.email_cliente,
          nome_completo: row.nome_completo,
          valor_total: parseFloat(row.valor_total),
          forma_pagamento: row.forma_pagamento,
          status: row.status,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          ingredientes: []
        });
      }

      const pedido = pedidosMap.get(id);

      if (row.tipo && row.nome_ingrediente) {
        pedido.ingredientes.push({
          tipo: row.tipo,
          nome: row.nome_ingrediente,
          quantidade: row.quantidade_ingrediente
        });
      }
    }

    const pedidosFinal = [];

    for (const pedido of pedidosMap.values()) {
      const cupcakesMap = new Map();

      const gruposCupcakeTemp = {};

      let cupcakeIndex = 0;

      const maxQuantidade = Math.max(...pedido.ingredientes.map(ing => ing.quantidade));

      for (let i = 0; i < maxQuantidade; i++) {
        gruposCupcakeTemp[i] = {
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null
        };
      }

      for (const ing of pedido.ingredientes) {
        for (let j = 0; j < ing.quantidade; j++) {
          if (!gruposCupcakeTemp[j]) {
            gruposCupcakeTemp[j] = {
              tamanho: null,
              recheio: null,
              cobertura: null,
              cor_cobertura: null
            };
          }
          gruposCupcakeTemp[j][ing.tipo] = ing.nome;
        }
      }

      for (let i = 0; i < maxQuantidade; i++) {
        const cupcake = gruposCupcakeTemp[i];

        if (!cupcake.tamanho) cupcake.tamanho = "Não especificado";
        if (!cupcake.recheio) cupcake.recheio = "Não especificado";
        if (!cupcake.cobertura) cupcake.cobertura = "Não especificado";
        if (!cupcake.cor_cobertura) cupcake.cor_cobertura = "Não especificado";

        cupcakesMap.set(i, { ...cupcake, quantidade: 1 });
      }

      pedido.cupcakes = Array.from(cupcakesMap.values());

      delete pedido.ingredientes;
      pedidosFinal.push(pedido);
    }

    res.json(pedidosFinal);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar pedidos.' });
  }
}