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
      `SELECT quantidade, valor_total FROM pedidosCarrinho WHERE id_cliente = ?`,
      [idCliente]
    );

    let quantidadeTotal = 0;
    let subtotal = 0;

    for (const pedido of pedidosDiretos) {
      quantidadeTotal += pedido.quantidade || 0;
      subtotal += parseFloat(pedido.valor_total) || 0;
    }

    for (const pedido of pedidosCarrinho) {
      quantidadeTotal += pedido.quantidade || 0;
      subtotal += parseFloat(pedido.valor_total) || 0;
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

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido. Deve ser um número maior que 0.');
    }

    let quantidadeTotal = 0;
    let subtotal = 0;

    const [pedidosDiretos] = await pool.query(`
      SELECT quantidade, valor_total
      FROM pedidos
      WHERE id_cliente = ? AND status = 'aguardando'
    `, [idCliente]);

    for (const pedido of pedidosDiretos) {
      quantidadeTotal += pedido.quantidade;
      subtotal += parseFloat(pedido.valor_total);
    }

    const [pedidosCarrinho] = await pool.query(`
      SELECT quantidade, valor_total
      FROM pedidosCarrinho
      WHERE id_cliente = ?
    `, [idCliente]);

    for (const carrinho of pedidosCarrinho) {
      quantidadeTotal += carrinho.quantidade;
      subtotal += parseFloat(carrinho.valor_total);
    }

    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    return {
      quantidade: quantidadeTotal,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxaServico,
      taxaEntrega,
      total
    };

  } catch (error) {
    throw error;
  }
}