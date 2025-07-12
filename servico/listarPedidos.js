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
        pc.id_pedido_carrinho,
        pc.quantidade,
        i.nome AS nome_ingrediente,
        i.tipo,
        e.rua,
        e.numero,
        e.bairro,
        e.cep,
        e.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN pedidosCarrinho pc ON p.id_pedido = pc.id_pedido
      LEFT JOIN pedidosCarrinho_ingredientes pci ON pc.id_pedido_carrinho = pci.id_pedido_carrinho
      LEFT JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      WHERE p.status = ?
      ORDER BY p.id_pedido, pc.id_pedido_carrinho
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
          cupcakes: []
        });
      }

      const pedido = pedidosMap.get(id);

      let cupcake = pedido.cupcakes.find(c => c.id_pedido_carrinho === row.id_pedido_carrinho);
      if (!cupcake) {
        cupcake = {
          id_pedido_carrinho: row.id_pedido_carrinho,
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null,
          quantidade: row.quantidade
        };
        pedido.cupcakes.push(cupcake);
      }

      if (row.tipo && row.nome_ingrediente) {
        cupcake[row.tipo] = row.nome_ingrediente;
      }
    }

    const pedidosFinal = Array.from(pedidosMap.values()).map(pedido => {
      pedido.cupcakes.forEach(c => delete c.id_pedido_carrinho);
      return pedido;
    });

    res.json(pedidosFinal);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar pedidos.' });
  }
}