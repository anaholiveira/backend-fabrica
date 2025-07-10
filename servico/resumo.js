import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  let conn;
  try {
    conn = await pool.getConnection();

    const [resumo] = await conn.query(
      `SELECT * FROM pedidos WHERE id_cliente = ?`,
      [idCliente]
    );

    return resumo;

  } catch (error) {
    console.error('Erro em getResumoPedido:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
}

export async function registrarResumoPedido(id_cliente, valor_total, forma_pagamento) {
  let conn;

  try {
    console.log("Iniciando registro do pedido:", { id_cliente, valor_total, forma_pagamento });

    conn = await pool.getConnection();

    const [pedidoResult] = await conn.query(
      'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, ?)',
      [id_cliente, valor_total, forma_pagamento, 'aguardando']
    );

    const novoPedidoId = pedidoResult.insertId;
    console.log("Pedido criado com ID:", novoPedidoId);

    const [carrinhos] = await conn.query(
      'SELECT * FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    if (carrinhos.length === 0) {
      throw new Error('Carrinho vazio. Nada para registrar.');
    }

    for (const carrinho of carrinhos) {
      await conn.query(
        'INSERT INTO pedido_cupcakes (id_pedido, id_cupcake, quantidade, observacao) VALUES (?, ?, ?, ?)',
        [novoPedidoId, carrinho.id_cupcake, carrinho.quantidade, carrinho.observacao]
      );

      const [ingredientes] = await conn.query(
        'SELECT id_ingrediente FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
        [carrinho.id_pedido_carrinho]
      );

      for (const ing of ingredientes) {
        await conn.query(
          'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
          [novoPedidoId, ing.id_ingrediente, 1]
        );
      }

      await conn.query(
        'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
        [carrinho.id_pedido_carrinho]
      );
    }

    await conn.query(
      'DELETE FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    console.log('Pedido registrado com sucesso');
    return { status: 'ok', id_pedido: novoPedidoId };

  } catch (error) {
    console.error('Erro em registrarResumoPedido:', error);
    return { status: 'erro', erro: error.message };
  } finally {
    if (conn) conn.release();
  }
}

export async function apagarPedidosAguardando(idCliente) {
  let conn;
  try {
    conn = await pool.getConnection();

    const [resultado] = await conn.query(
      'DELETE FROM pedidos WHERE id_cliente = ? AND status = ?',
      [idCliente, 'aguardando']
    );

    return { status: 'ok', afetados: resultado.affectedRows };

  } catch (error) {
    console.error('Erro em apagarPedidosAguardando:', error);
    return { status: 'erro', erro: error.message };
  } finally {
    if (conn) conn.release();
  }
}