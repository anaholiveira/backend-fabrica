import pool from './conexao.js';

export async function getResumoPedido(req, res) {
  const idCliente = parseInt(req.params.idCliente);

  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }

    const [cliente] = await pool.query(
      'SELECT id_cliente FROM clientes WHERE id_cliente = ?',
      [idCliente]
    );

    if (cliente.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    const [rows] = await pool.query(
      `SELECT
         SUM(i.valor * pi.quantidade) AS subtotal,
         SUM(CASE WHEN i.tipo = 'tamanho' THEN pi.quantidade ELSE 0 END) AS quantidade
       FROM pedidos p
       JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
       JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
       WHERE p.id_cliente = ? AND p.status = 'aguardando' AND p.forma_pagamento IS NULL`,
      [idCliente]
    );

    const subtotal = parseFloat(rows[0].subtotal) || 0;
    const quantidade = parseInt(rows[0].quantidade) || 0;
    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    res.json({ quantidade, subtotal, taxaServico, taxaEntrega, total });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function apagarPedidosAguardando(req, res) {
  const idCliente = parseInt(req.params.idCliente);
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }

    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      return res.json({ mensagem: 'Nenhum pedido com status "aguardando" encontrado para este cliente.' });
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
    await pool.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);

    res.json({ mensagem: 'Pedidos com status "aguardando" apagados com sucesso.' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
}

export async function registrarResumoPedido(req, res) {
  const {
    id_cliente,
    forma_pagamento,
    valor_total,
    quantidade,
    taxaServico,
    taxaEntrega,
    id_endereco
  } = req.body;

  if (!id_cliente || !forma_pagamento || !valor_total || !quantidade || !id_endereco) {
    return res.status(400).json({ erro: 'Dados do pedido incompletos.' });
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [pedidosAguardando] = await conn.query(
      `SELECT id_pedido FROM pedidos
       WHERE id_cliente = ? AND status = 'aguardando' AND forma_pagamento IS NULL
       ORDER BY id_pedido DESC`,
      [id_cliente]
    );

    if (pedidosAguardando.length === 0) {
      throw new Error('Nenhum pedido aguardando encontrado para finalizar.');
    }

    const novoPedidoId = pedidosAguardando[0].id_pedido;
    const pedidosAntigos = pedidosAguardando.slice(1);

    await conn.query(
      `UPDATE pedidos
       SET forma_pagamento = ?, valor_total = ?, id_endereco = ?
       WHERE id_pedido = ?`,
      [forma_pagamento, valor_total, id_endereco, novoPedidoId]
    );

    const [carrinhos] = await conn.query(
      `SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?`,
      [id_cliente]
    );

    for (const carrinho of carrinhos) {
      const [ingredientes] = await conn.query(
        `SELECT id_ingrediente FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?`,
        [carrinho.id_pedido_carrinho]
      );

      for (const ing of ingredientes) {
        await conn.query(
          `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
          [novoPedidoId, ing.id_ingrediente, 1]
        );
      }
    }

    for (const pedido of pedidosAntigos) {
      const [ingredientesAntigos] = await conn.query(
        `SELECT id_ingrediente, quantidade FROM pedido_ingredientes WHERE id_pedido = ?`,
        [pedido.id_pedido]
      );

      for (const ing of ingredientesAntigos) {
        await conn.query(
          `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
          [novoPedidoId, ing.id_ingrediente, ing.quantidade]
        );
      }
    }

    if (pedidosAntigos.length > 0) {
      const idsAntigos = pedidosAntigos.map(p => p.id_pedido);
      await conn.query(`DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)`, [idsAntigos]);
      await conn.query(`DELETE FROM pedidos WHERE id_pedido IN (?)`, [idsAntigos]);
    }

    await conn.query(
      `DELETE FROM pedidosCarrinho_ingredientes
       WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)`,

      [id_cliente]
    );

    await conn.query(`DELETE FROM pedidosCarrinho WHERE id_cliente = ?`, [id_cliente]);

    await conn.commit();

    res.status(201).json({ mensagem: 'Resumo do pedido registrado com sucesso.', id_pedido: novoPedidoId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ erro: error.message });
  } finally {
    conn.release();
  }
}