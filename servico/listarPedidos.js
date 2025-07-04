import pool from './conexao.js';

export async function listarPedidosAdmin(req, res) {
  try {
    const { filtro } = req.query;

    const query = `
      SELECT 
        p.id_pedido,
        p.data_criacao,
        p.valor_total,
        p.forma_pagamento,
        p.status,
        c.id_cliente,
        c.nome_completo,
        c.email AS email_cliente,
        e.rua,
        e.numero,
        e.bairro,
        e.cep,
        e.complemento,
        pi.quantidade,
        i.tipo,
        i.nome AS nome_ingrediente
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.status = ?
      ORDER BY p.id_pedido, pi.id_pedido_ingrediente
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const pedidosMap = new Map();

    for (const row of rows) {
      const idPedido = row.id_pedido;

      if (!pedidosMap.has(idPedido)) {
        pedidosMap.set(idPedido, {
          id_pedido: idPedido,
          data_criacao: new Date(row.data_criacao).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }),
          valor_total: parseFloat(row.valor_total || 0),
          forma_pagamento: row.forma_pagamento,
          status: row.status,
          nome_completo: row.nome_completo,
          email_cliente: row.email_cliente,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          cupcakes: []
        });
      }

      const pedido = pedidosMap.get(idPedido);

      let cupcake = pedido.cupcakes.find(c => 
        c.quantidade === row.quantidade &&
        (!c.tamanho || !c.recheio || !c.cobertura || !c.cor_cobertura)
      );

      if (!cupcake) {
        cupcake = {
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null,
          quantidade: row.quantidade
        };
        pedido.cupcakes.push(cupcake);
      }

      cupcake[row.tipo] = row.nome_ingrediente;
    }

    const pedidosArray = Array.from(pedidosMap.values());
    res.json(pedidosArray);

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}