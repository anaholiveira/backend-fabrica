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

    const pedidosMap = new Map();

    for (const row of rows) {
      if (!pedidosMap.has(row.id_pedido)) {
        pedidosMap.set(row.id_pedido, {
          id_pedido: row.id_pedido,
          data_criacao: row.data_criacao,
          id_cliente: row.id_cliente,
          email_cliente: row.email_cliente,
          nome_completo: row.nome_completo,
          valor_total: parseFloat(row.valor_total || 0),
          forma_pagamento: row.forma_pagamento || null,
          status: row.status,
          rua: row.rua,
          numero: row.numero,
          bairro: row.bairro,
          cep: row.cep,
          complemento: row.complemento,
          cupcakes: [],
        });
      }

      const pedido = pedidosMap.get(row.id_pedido);

      let cupcake = pedido.cupcakes.find(cup => 
        cup.tamanho === (row.tipo === 'tamanho' ? row.nome_ingrediente : cup.tamanho) &&
        cup.recheio === (row.tipo === 'recheio' ? row.nome_ingrediente : cup.recheio) &&
        cup.cobertura === (row.tipo === 'cobertura' ? row.nome_ingrediente : cup.cobertura) &&
        cup.cor_cobertura === (row.tipo === 'cor_cobertura' ? row.nome_ingrediente : cup.cor_cobertura)
      );

      if (!cupcake) {
        cupcake = {
          tamanho: null,
          recheio: null,
          cobertura: null,
          cor_cobertura: null,
          quantidade: 0
        };
        pedido.cupcakes.push(cupcake);
      }

      cupcake[row.tipo] = row.nome_ingrediente;
      cupcake.quantidade += row.quantidade;
    }

    const clientesMap = new Map();

    for (const pedido of pedidosMap.values()) {
      if (!clientesMap.has(pedido.id_cliente)) {
        clientesMap.set(pedido.id_cliente, {
          id_cliente: pedido.id_cliente,
          email_cliente: pedido.email_cliente,
          nome_completo: pedido.nome_completo,
          valor_total: 0,
          forma_pagamento: null,
          status: pedido.status,
          pedidos: [],
          rua: pedido.rua,
          numero: pedido.numero,
          bairro: pedido.bairro,
          cep: pedido.cep,
          complemento: pedido.complemento,
        });
      }

      const cliente = clientesMap.get(pedido.id_cliente);

      cliente.pedidos.push(pedido);
      cliente.valor_total += pedido.valor_total;
      if (!cliente.forma_pagamento && pedido.forma_pagamento) {
        cliente.forma_pagamento = pedido.forma_pagamento;
      }
    }

    const resultado = Array.from(clientesMap.values()).map(cliente => {
      cliente.pedidos = cliente.pedidos.map(pedido => {
        pedido.data_criacao = new Date(pedido.data_criacao).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return pedido;
      });
      return cliente;
    });

    res.json(resultado);

  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
}