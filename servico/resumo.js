import pool from './conexao.js';

export async function criarPedidoCheckout({ idCliente, formaPagamento, quantidade, valorTotal }) {
  try {
    if (!idCliente || isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido.');
    }
    if (!['pix', 'cartao', 'dinheiro', 'maquina'].includes(formaPagamento)) {
      throw new Error('Forma de pagamento inválida.');
    }
    if (isNaN(quantidade) || quantidade <= 0) {
      throw new Error('Quantidade inválida.');
    }
    if (isNaN(valorTotal) || valorTotal <= 0) {
      throw new Error('Valor total inválido.');
    }

    const [result] = await pool.query(
      'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, "aguardando")',
      [idCliente, valorTotal, formaPagamento]
    );

    const idPedido = result.insertId;

    const [pedidoIngredientes] = await pool.query(
      `SELECT pi.id_ingrediente, pi.quantidade
       FROM pedidos p
       JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
       WHERE p.id_cliente = ? AND p.status = 'aguardando'`,
      [idCliente]
    );

    for (const item of pedidoIngredientes) {
      await pool.query(
        'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
        [idPedido, item.id_ingrediente, item.quantidade]
      );
    }

    await pool.query(
      'DELETE FROM pedido_ingredientes WHERE id_pedido IN (SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando" AND id_pedido <> ?)',
      [idCliente, idPedido]
    );
    await pool.query(
      'DELETE FROM pedidos WHERE id_cliente = ? AND status = "aguardando" AND id_pedido <> ?',
      [idCliente, idPedido]
    );

    return { idPedido, mensagem: 'Pedido registrado com sucesso!' };
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    throw error;
  }
}
