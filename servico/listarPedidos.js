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
        pi.quantidade AS quantidade_cupcake_desejada, 
        p.rua,     
        p.numero,  
        p.bairro,  
        p.cep,     
        p.complemento
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      LEFT JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.status = ?
      ORDER BY p.id_pedido, pi.id_pedido_ingrediente, i.tipo
    `;

    const [rows] = await pool.query(query, [filtro || 'aguardando']);

    console.log('Dados brutos da query:', rows);

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

      if (row.tipo && row.nome_ingrediente && row.quantidade_cupcake_desejada !== null && row.quantidade_cupcake_desejada > 0) {
          
          let cupcakeEncontrado = null;
          
          for (let i = 0; i < pedido.cupcakes.length; i++) {
              const currentCupcake = pedido.cupcakes[i];
              if (currentCupcake.quantidade === row.quantidade_cupcake_desejada && !currentCupcake[row.tipo]) {
                  cupcakeEncontrado = currentCupcake;
                  break;
              }
          }

          if (!cupcakeEncontrado) {
              cupcakeEncontrado = {
                  tamanho: null,
                  recheio: null,
                  cobertura: null,
                  cor_cobertura: null,
                  quantidade: row.quantidade_cupcake_desejada, 
              };
              pedido.cupcakes.push(cupcakeEncontrado);
          }

          if (['tamanho', 'recheio', 'cobertura', 'cor_cobertura'].includes(row.tipo)) {
              cupcakeEncontrado[row.tipo] = row.nome_ingrediente;
          }
      } else {
        console.warn(`Ingrediente ignorado por ser inválido para o Pedido ${pedidoId}:`, row);
      }
    }

    const pedidosFormatados = Array.from(pedidosAgrupados.values()).map(pedido => {
      const data = new Date(pedido.data_criacao);

      const cupcakesValidos = pedido.cupcakes.filter(cp =>
        (cp.tamanho || cp.recheio || cp.cobertura || cp.cor_cobertura) && cp.quantidade > 0
      );

      return {
        ...pedido,
        data_criacao: data.toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        cupcakes: cupcakesValidos.length > 0 ? cupcakesValidos : [] 
      };
    });

    console.log('Pedidos formatados para resposta:', pedidosFormatados);

    res.json(pedidosFormatados);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ mensagem: 'Erro interno no servidor ao buscar pedidos.' });
  }
}