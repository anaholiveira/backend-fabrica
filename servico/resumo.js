import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido.');
    }

    const [rows] = await pool.query(`
      SELECT 
        SUM(i.valor * pi.quantidade) AS subtotal,
        SUM(pi.quantidade) AS quantidade
      FROM pedidosCarrinho pc
      JOIN pedidosCarrinho_ingredientes pci ON pc.id_pedido_carrinho = pci.id_pedido_carrinho
      JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
      WHERE pc.id_cliente = ?
    `, [idCliente]);

    const subtotal = parseFloat(rows[0].subtotal) || 0;
    const quantidade = parseInt(rows[0].quantidade) || 0;
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
      return { mensagem: 'Nenhum pedido aguardando encontrado para este cliente.' };
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
    await pool.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);

    return { mensagem: 'Pedidos aguardando apagados com sucesso.' };

  } catch (error) {
    throw error;
  }
}

export async function registrarResumoPedido(req, res) {
  const { id_cliente, forma_pagamento, valor_total } = req.body;

  try {
    const [resultado] = await pool.query(
      `INSERT INTO pedidos (id_cliente, forma_pagamento, valor_total)
       VALUES (?, ?, ?)`,
      [id_cliente, forma_pagamento, valor_total]
    );

    const id_pedido = resultado.insertId;

    const [ingredientesCarrinho] = await pool.query(
      `SELECT pci.id_ingrediente, pc.quantidade
       FROM pedidosCarrinho_ingredientes pci
       JOIN pedidosCarrinho pc ON pci.id_pedido_carrinho = pc.id_pedido_carrinho
       WHERE pc.id_cliente = ?`,
      [id_cliente]
    );

    for (const item of ingredientesCarrinho) {
      await pool.query(
        `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade)
         VALUES (?, ?, ?)`,
        [id_pedido, item.id_ingrediente, item.quantidade || 1]
      );
    }

    await pool.query(
      `DELETE FROM pedidosCarrinho_ingredientes
       WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)`,
      [id_cliente]
    );

    await pool.query(
      `DELETE FROM pedidosCarrinho WHERE id_cliente = ?`,
      [id_cliente]
    );

    res.status(200).json({ mensagem: 'Pedido registrado com sucesso!' });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao registrar o pedido.' });
  }
}