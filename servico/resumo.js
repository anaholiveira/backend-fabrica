import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido. Deve ser um número maior que 0.');
    }

    let quantidadeTotal = 0;
    let subtotal = 0;

    const [diretos] = await pool.query(`
      SELECT pi.quantidade, i.valor, i.tipo
      FROM pedidos p
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.id_cliente = ? AND p.status = 'aguardando'
    `, [idCliente]);

    for (const item of diretos) {
      subtotal += item.valor * item.quantidade;
      if (item.tipo === 'tamanho') {
        quantidadeTotal += item.quantidade;
      }
    }

    const [carrinho] = await pool.query(`
      SELECT pci.id_ingrediente, pc.quantidade, i.valor, i.tipo
      FROM pedidosCarrinho pc
      JOIN pedidosCarrinho_ingredientes pci ON pc.id_pedido_carrinho = pci.id_pedido_carrinho
      JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
      WHERE pc.id_cliente = ?
    `, [idCliente]);

    for (const item of carrinho) {
      subtotal += item.valor * item.quantidade;
      if (item.tipo === 'tamanho') {
        quantidadeTotal += item.quantidade;
      }
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