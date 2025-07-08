import pool from './conexao.js';

export async function getResumoPedido(req, res) {
  const idCliente = req.params.id_cliente;

  try {
    const [rows] = await pool.query(`
      SELECT 
        SUM(i.valor * pi.quantidade) AS subtotal,
        SUM(CASE WHEN i.tipo = 'tamanho' THEN pi.quantidade ELSE 0 END) AS quantidade
      FROM pedidos p
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.id_cliente = ? AND p.status = 'aguardando'
    `, [idCliente]);

    const subtotal = parseFloat(rows[0].subtotal) || 0;
    const quantidade = parseInt(rows[0].quantidade) || 0;
    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    res.json({ quantidade, subtotal, taxaServico, taxaEntrega, total });
  } catch (error) {
    console.error("Erro ao buscar resumo:", error);
    res.status(500).json({ erro: 'Erro ao buscar resumo do pedido' });
  }
}

export async function apagarPedidosAguardando(req, res) {
  const idCliente = req.params.id_cliente;

  try {
    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      return res.json({ mensagem: 'Nenhum pedido para apagar.' });
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
    await pool.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);

    res.json({ mensagem: 'Pedidos apagados com sucesso.' });
  } catch (error) {
    console.error("Erro ao apagar pedidos:", error);
    res.status(500).json({ erro: 'Erro ao apagar pedidos' });
  }
}

export async function registrarResumoPedido(req, res) {
  const { id_cliente, forma_pagamento, valor_total, quantidade, taxaServico, taxaEntrega } = req.body;

  if (!id_cliente || !forma_pagamento || !valor_total || !quantidade) {
    return res.status(400).json({ erro: 'Dados incompletos.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE pedidos SET forma_pagamento = ? WHERE id_cliente = ? AND status = "aguardando"',
      [forma_pagamento, id_cliente]
    );

    const [carrinhos] = await conn.query(
      'SELECT id_pedido_carrinho, quantidade FROM pedidosCarrinho WHERE id_cliente = ?',
      [id_cliente]
    );

    if (carrinhos.length > 0) {
      const [novoPedido] = await conn.query(
        'INSERT INTO pedidos (id_cliente, valor_total, forma_pagamento, status) VALUES (?, ?, ?, ?)',
        [id_cliente, valor_total, forma_pagamento, 'aguardando']
      );

      const novoPedidoId = novoPedido.insertId;

      for (const carrinho of carrinhos) {
        const [ingredientes] = await conn.query(
          'SELECT id_ingrediente FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
          [carrinho.id_pedido_carrinho]
        );

        for (const ing of ingredientes) {
          await conn.query(
            'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
            [novoPedidoId, ing.id_ingrediente, carrinho.quantidade]
          );
        }
      }

      await conn.query(
        'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
        [id_cliente]
      );
      await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);
    }

    await conn.commit();
    res.status(201).json({ mensagem: 'Pedido finalizado com sucesso!' });
  } catch (error) {
    await conn.rollback();
    console.error("Erro ao registrar resumo:", error);
    res.status(500).json({ erro: 'Erro ao finalizar o pedido' });
  } finally {
    conn.release();
  }
}