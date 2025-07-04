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
        i.tipo,
        i.nome AS nome_ingrediente,
        pi.quantidade,
        e.rua, 
        e.numero, 
        e.bairro, 
        e.cep, 
        e.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      WHERE p.status = ?
      ORDER BY c.id_cliente, p.id_pedido, pi.id_pedido_ingrediente
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const clientesMap = new Map();

    for (const row of rows) {
      const clienteId = row.id_cliente;

      if (!clientesMap.has(clienteId)) {
        clientesMap.set(clienteId, {
          id_cliente: row.id_cliente,
          email_cliente: row.email_cliente,
          nome_completo: row.nome_completo,
          valor_total: 0,
          forma_pagamento: row.forma_pagamento || null,
          status: row.status,
          data_criacao: row.data_criacao,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          cupcakes: [],
          ids: [row.id_pedido]
        });
      }

      const cliente = clientesMap.get(clienteId);

      if (!cliente.ids.includes(row.id_pedido)) {
        cliente.ids.push(row.id_pedido);
        cliente.valor_total += parseFloat(row.valor_total || 0);
      }

      if (!cliente.forma_pagamento && row.forma_pagamento) {
        cliente.forma_pagamento = row.forma_pagamento;
      }

      let cupcake = cliente.cupcakes.find(c =>
        !c.tamanho || !c.recheio || !c.cobertura || !c.cor_cobertura
      );

      if (!cupcake) {
        cupcake = {
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null,
          quantidade: row.quantidade
        };
        cliente.cupcakes.push(cupcake);
      }

      cupcake[row.tipo] = row.nome_ingrediente;
    }

    const pedidosFormatados = Array.from(clientesMap.values()).map(cliente => {
      const data = new Date(cliente.data_criacao);
      return {
        ...cliente,
        data_criacao: data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    });

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}