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
        pi.id_cupcake,
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
      ORDER BY p.id_pedido, pi.id_cupcake, i.tipo
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
          cupcakes: new Map()
        });
      }

      const pedido = pedidosMap.get(id);

      const idCupcake = row.id_cupcake;
      if (!pedido.cupcakes.has(idCupcake)) {
        pedido.cupcakes.set(idCupcake, {
          tamanho: 'Não especificado',
          recheio: 'Não especificado',
          cobertura: 'Não especificado',
          cor_cobertura: 'Não especificado',
          quantidade: 1
        });
      }

      const cupcake = pedido.cupcakes.get(idCupcake);

      if (row.tipo === 'tamanho') cupcake.tamanho = row.nome_ingrediente;
      else if (row.tipo === 'recheio') cupcake.recheio = row.nome_ingrediente;
      else if (row.tipo === 'cobertura') cupcake.cobertura = row.nome_ingrediente;
      else if (row.tipo === 'cor_cobertura') cupcake.cor_cobertura = row.nome_ingrediente;
    }

    const pedidosFinal = [];

    for (const pedido of pedidosMap.values()) {
      pedido.cupcakes = Array.from(pedido.cupcakes.values());
      pedidosFinal.push(pedido);
    }

    res.json(pedidosFinal);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar pedidos.' });
  }
}