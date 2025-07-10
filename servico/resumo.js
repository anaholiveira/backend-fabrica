import pool from './conexao.js';

export async function getResumoPedido(req, res) {
  try {
    const idCliente = parseInt(req.params.idCliente);
    if (isNaN(idCliente) || idCliente <= 0) {
      return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
    }

    const [cliente] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [idCliente]);
    if (cliente.length === 0) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }

    const [rows] = await pool.query(`
      SELECT
        COALESCE(SUM(i.valor * pi.quantidade), 0) AS subtotal,
        COALESCE(SUM(pi.quantidade), 0) AS quantidade
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

    return res.json({ quantidade, subtotal, taxaServico, taxaEntrega, total });
  } catch (error) {
    console.error('Erro no getResumoPedido:', error);
    return res.status(500).json({ erro: 'Erro interno ao buscar resumo do pedido.' });
  }
}

export async function apagarPedidosAguardando(req, res) {
  const idCliente = parseInt(req.params.idCliente, 10);

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido.' });
  }

  try {
    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      return res.status(404).json({ mensagem: 'Nenhum pedido aguardando encontrado para este cliente.' });
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
    await pool.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);

    return res.status(200).json({ mensagem: 'Pedidos aguardando apagados com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: 'Erro interno ao apagar pedidos aguardando.' });
  }
}

export async function registrarResumoPedido(req, res) {
  const { id_cliente, forma_pagamento, quantidade, valor_total, taxaServico, taxaEntrega } = req.body;

  if (!id_cliente || !forma_pagamento || !quantidade || !valor_total) {
    return res.status(400).json({ erro: 'Dados incompletos para registrar o pedido.' });
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO pedidos (id_cliente, forma_pagamento, valor_total) VALUES (?, ?, ?)`,
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

    for (const ingrediente of ingredientesCarrinho) {
      await pool.query(
        `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
        [id_pedido, ingrediente.id_ingrediente, ingrediente.quantidade || 1]
      );
    }

    await pool.query(`DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)`, [id_cliente]);
    await pool.query(`DELETE FROM pedidosCarrinho WHERE id_cliente = ?`, [id_cliente]);

    return res.status(200).json({ mensagem: 'Pedido registrado com sucesso!' });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro ao registrar o pedido.' });
  }
}