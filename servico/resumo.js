import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido. Deve ser um número maior que 0.');
    }

    const [pedidosDiretos] = await pool.query(
      `SELECT quantidade, valor_total FROM pedidos WHERE id_cliente = ? AND status = 'aguardando'`,
      [idCliente]
    );

    const [pedidosCarrinho] = await pool.query(
      `SELECT id_pedido_carrinho, quantidade, valor_total FROM pedidosCarrinho WHERE id_cliente = ?`,
      [idCliente]
    );

    let quantidadeTotal = 0;
    let subtotal = 0;

    for (const pedido of pedidosDiretos) {
      quantidadeTotal += pedido.quantidade || 0;
      subtotal += parseFloat(pedido.valor_total) || 0;
    }

    async function calcularValorPedidoCarrinho(idPedidoCarrinho) {
      const [ingredientes] = await pool.query(
        `SELECT i.valor, 1 AS quantidade 
         FROM pedidosCarrinho_ingredientes pci
         JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
         WHERE pci.id_pedido_carrinho = ?`,
        [idPedidoCarrinho]
      );
      let total = 0;
      for (const ing of ingredientes) {
        total += parseFloat(ing.valor) * (ing.quantidade || 1);
      }
      return total;
    }

    for (const pedidoCarrinho of pedidosCarrinho) {
      quantidadeTotal += pedidoCarrinho.quantidade || 0;

      let valorTotalCarrinho = parseFloat(pedidoCarrinho.valor_total);
      if (!valorTotalCarrinho || valorTotalCarrinho === 0) {
        valorTotalCarrinho = await calcularValorPedidoCarrinho(pedidoCarrinho.id_pedido_carrinho);
      }

      subtotal += valorTotalCarrinho;
    }

    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    return {
      quantidade: quantidadeTotal,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxaServico,
      taxaEntrega,
      total,
    };
  } catch (error) {
    throw error;
  }
}

export async function apagarPedidosAguardando(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido.');
    }

    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      return { mensagem: 'Nenhum pedido com status "aguardando" encontrado para este cliente.' };
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
    await pool.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);

    return { mensagem: 'Pedidos com status "aguardando" apagados com sucesso.' };
  } catch (error) {
    throw error;
  }
}

export async function registrarResumoPedido(resumo) {
  const { id_cliente, forma_pagamento, valor_total, quantidade } = resumo;

  if (!id_cliente || !forma_pagamento || !valor_total || !quantidade) {
    throw new Error('Dados incompletos. Verifique os campos enviados.');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [pedidoResult] = await conn.query(
      'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status, quantidade) VALUES (?, ?, ?, ?, ?)',
      [id_cliente, valor_total, forma_pagamento, 'aguardando', quantidade]
    );

    const novoPedidoId = pedidoResult.insertId;

    await conn.query(
      'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
      [id_cliente]
    );
    await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);

    await conn.commit();

    return { mensagem: 'Resumo do pedido registrado com sucesso.', id_pedido: novoPedidoId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}