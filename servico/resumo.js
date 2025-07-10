import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  let conn;
  try {
    conn = await pool.getConnection();

    const [result] = await conn.query(
      `
      SELECT
        COALESCE(SUM(c.quantidade), 0) AS quantidade,
        COALESCE(SUM(c.quantidade * cup.preco), 0) AS total,
        COALESCE(SUM(c.quantidade * cup.preco) * 0.1, 0) AS taxaServico,
        5.00 AS taxaEntrega
      FROM pedidosCarrinho c
      JOIN cupcakes cup ON cup.id_cupcake = c.id_cupcake
      WHERE c.id_cliente = ?
      `,
      [idCliente]
    );

    if (!result || !result[0]) throw new Error('Nenhum dado encontrado');

    const resumo = result[0];

    return {
      quantidade: Number(resumo.quantidade) || 0,
      total: Number(resumo.total) || 0,
      taxaServico: Number(resumo.taxaServico) || 0,
      taxaEntrega: Number(resumo.taxaEntrega) || 0,
    };
  } catch (error) {
    console.error('Erro em getResumoPedido:', error);
    throw error;
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (releaseError) {
        console.error('Erro ao liberar conexão:', releaseError);
      }
    }
  }
}

export async function registrarResumoPedido(id_cliente, valor_total, forma_pagamento) {
  let conn;

  try {
    conn = await pool.getConnection();

    const [pedidoResult] = await conn.query(
      'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, ?)',
      [id_cliente, valor_total, forma_pagamento, 'aguardando']
    );

    const novoPedidoId = pedidoResult.insertId;

    const [carrinhos] = await conn.query(
      'SELECT * FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    if (!carrinhos || carrinhos.length === 0) {
      throw new Error('Carrinho vazio. Nada para registrar.');
    }

    for (const carrinho of carrinhos) {
      await conn.query(
        'INSERT INTO pedido_cupcakes (id_pedido, id_cupcake, quantidade, observacao) VALUES (?, ?, ?, ?)',
        [novoPedidoId, carrinho.id_cupcake, carrinho.quantidade, carrinho.observacao || null]
      );

      const [ingredientes] = await conn.query(
        'SELECT id_ingrediente FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
        [carrinho.id_pedido_carrinho]
      );

      if (ingredientes && ingredientes.length > 0) {
        for (const ing of ingredientes) {
          await conn.query(
            'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
            [novoPedidoId, ing.id_ingrediente, 1]
          );
        }
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

    return { status: 'ok', id_pedido: novoPedidoId };

  } catch (error) {
    console.error('Erro em registrarResumoPedido:', error);
    return { status: 'erro', erro: error.message };
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch (releaseError) {
        console.error('Erro ao liberar conexão:', releaseError);
      }
    }
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
    if (conn) {
      try {
        conn.release();
      } catch (releaseError) {
        console.error('Erro ao liberar conexão:', releaseError);
      }
    }
  }
}