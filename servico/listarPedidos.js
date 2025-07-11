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
        pi.id_pedido_ingrediente,
        i.tipo,
        i.nome AS nome_ingrediente,
        pi.quantidade AS quantidade_item,
        e.rua,
        e.numero,
        e.bairro,
        e.cep,
        e.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      LEFT JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      -- ATENÇÃO: A junção de endereço é feita pelo id_cliente.
      -- Isso significa que ele sempre pegará o endereço ATUAL do cliente,
      -- não necessariamente o endereço usado na hora do pedido.
      -- Para uma solução definitiva, a tabela 'pedidos' deveria ter um 'id_endereco'.
      LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
      WHERE p.status = ?
      ORDER BY p.id_pedido, pi.id_pedido_ingrediente
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    const pedidosAgrupados = new Map();

    for (const row of rows) {
      const pedidoId = row.id_pedido;
      if (!pedidosAgrupados.has(pedidoId)) {
        pedidosAgrupados.set(pedidoId, {
          id_pedido: pedidoId,
          data_criacao: row.data_criacao,
          id_cliente: row.id_cliente,
          email_cliente: row.email_cliente,
          nome_completo: row.nome_completo,
          valor_total: parseFloat(row.valor_total || 0),
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

      const pedido = pedidosAgrupados.get(pedidoId);
      if (row.id_pedido_ingrediente) {
        let cupcakeAtual = pedido.cupcakes.length > 0 ? pedido.cupcakes[pedido.cupcakes.length - 1] : null;
        if (row.tipo === 'tamanho' || !cupcakeAtual) {
          cupcakeAtual = {
            tamanho: null,
            recheio: null,
            cobertura: null,
            cor_cobertura: null,
            quantidade: row.quantidade_item || 1,
          };
          pedido.cupcakes.push(cupcakeAtual);
        }

        if (row.tipo && typeof cupcakeAtual[row.tipo] !== 'undefined') {
          cupcakeAtual[row.tipo] = row.nome_ingrediente;
        }
      }
    }

    const pedidosFormatados = Array.from(pedidosAgrupados.values()).map(pedido => {
      const data = new Date(pedido.data_criacao);
      return {
        ...pedido,
        data_criacao: data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cupcakes: pedido.cupcakes.filter(cp => cp.tamanho || cp.recheio || cp.cobertura)
      };
    });

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar pedidos.' });
  }
}