import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido. Deve ser um número maior que 0.');
    }

    const [cliente] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [idCliente]);
    if (cliente.length === 0) {
      return { erro: 'Cliente não encontrado.' };
    }

    const [resumoPedidos] = await pool.query(`
      SELECT 
        COUNT(*) AS quantidade,
        COALESCE(SUM(valor_total), 0) AS subtotal
      FROM pedidos
      WHERE id_cliente = ? AND status = 'aguardando'
    `, [idCliente]);

    const quantidade = resumoPedidos[0].quantidade || 0;
    const subtotal = parseFloat(resumoPedidos[0].subtotal) || 0;

    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    return { quantidade, subtotal, taxaServico, taxaEntrega, total };
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
  const { id_cliente, forma_pagamento, valor_total, quantidade, taxaServico, taxaEntrega } = resumo;

  if (!id_cliente || !forma_pagamento || !valor_total || !quantidade) {
    throw new Error('Dados incompletos. Verifique os campos enviados.');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE pedidos SET forma_pagamento = ? WHERE id_cliente = ? AND status = "aguardando"',
      [forma_pagamento, id_cliente]
    );

    const [carrinhos] = await conn.query(
      'SELECT * FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    for (const pedidoCarrinho of carrinhos) {
      const [pedidoResult] = await conn.query(
        'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, ?)',
        [id_cliente, pedidoCarrinho.valor_total, forma_pagamento, 'aguardando']
      );

      const novoPedidoId = pedidoResult.insertId;

      const [ingredientes] = await conn.query(
        'SELECT id_ingrediente, quantidade FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
        [pedidoCarrinho.id_pedido_carrinho]
      );

      for (const ing of ingredientes) {
        await conn.query(
          'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
          [novoPedidoId, ing.id_ingrediente, ing.quantidade]
        );
      }
    }

    await conn.query(
      'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
      [id_cliente]
    );
    await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);

    await conn.commit();

    return { mensagem: 'Resumo do pedido registrado com sucesso!' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}