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
        pi.id_pedido,
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
          forma_pagamento: null,
          status: row.status,
          data_criacao: row.data_criacao,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          cupcakes: [],
          ids: []
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

      let cupcake = cliente.cupcakes.find(c => c.id_pedido === row.id_pedido && c.quantidade === row.quantidade && !c.completo);

      if (!cupcake) {
        cupcake = {
          id_pedido: row.id_pedido,
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null,
          quantidade: row.quantidade,
          completo: false
        };
        cliente.cupcakes.push(cupcake);
      }

      cupcake[row.tipo] = row.nome_ingrediente;

      if (cupcake.tamanho && cupcake.recheio && cupcake.cobertura && cupcake.cor_cobertura) {
        cupcake.completo = true;
      }
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
        }),
        cupcakes: cliente.cupcakes.map(c => {
          const { completo, id_pedido, ...resto } = c;
          return resto;
        })
      };
    });

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}