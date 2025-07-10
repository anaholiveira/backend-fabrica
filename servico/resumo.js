export async function registrarResumoPedido(resumo) {
  const { id_cliente, forma_pagamento, quantidade, taxaServico = 2.50, taxaEntrega = 5.00 } = resumo;

  if (!id_cliente || !forma_pagamento || !quantidade) {
    throw new Error('Dados incompletos. Verifique os campos enviados.');
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(`
      SELECT SUM(i.valor * 1) AS subtotal
      FROM pedidosCarrinho pc
      JOIN pedidosCarrinho_ingredientes pci ON pc.id_pedido_carrinho = pci.id_pedido_carrinho
      JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
      WHERE pc.id_cliente = ?
    `, [id_cliente]);

    const subtotal = parseFloat(rows[0].subtotal) || 0;
    const valor_total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    const [pedidoResult] = await conn.query(
      'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, ?)',
      [id_cliente, valor_total, forma_pagamento, 'aguardando']
    );

    const novoPedidoId = pedidoResult.insertId;

    const [carrinhos] = await conn.query(
      'SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    for (const carrinho of carrinhos) {
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
    }

    await conn.query(
      'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
      [id_cliente]
    );
    await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);

    await conn.commit();

    return {
      mensagem: 'Resumo do pedido registrado com sucesso.',
      id_pedido: novoPedidoId,
      valor_total
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}