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

    const [rows] = await pool.query(`
      SELECT
        SUM(i.valor * pi.quantidade) AS subtotal,
        SUM(CASE WHEN i.tipo = 'tamanho' THEN pi.quantidade ELSE 0 END) AS quantidade
      FROM pedidos p
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.id_cliente = ? 
        AND p.status = 'aguardando'
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

    const [pedidos] = await conn.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [id_cliente]
    );
    if (pedidos.length > 0) {
      const ids = pedidos.map(p => p.id_pedido);
      await conn.query('DELETE FROM pedido_ingredientes WHERE id_pedido IN (?)', [ids]);
      await conn.query('DELETE FROM pedidos WHERE id_pedido IN (?)', [ids]);
    }

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
        `SELECT i.id_ingrediente, i.tipo
         FROM pedidosCarrinho_ingredientes pci
         JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
         WHERE pci.id_pedido_carrinho = ?`,
        [carrinho.id_pedido_carrinho]
      );

      const agrupados = {
        tamanho: [],
        recheio: [],
        cobertura: [],
        cor_cobertura: []
      };

      for (const ing of ingredientes) {
        agrupados[ing.tipo].push(ing.id_ingrediente);
      }

      const totalCupcakes = Math.min(
        agrupados.tamanho.length,
        agrupados.recheio.length,
        agrupados.cobertura.length,
        agrupados.cor_cobertura.length
      );

      for (let i = 0; i < totalCupcakes; i++) {
        const tamanho = agrupados.tamanho[i];
        const recheio = agrupados.recheio[i];
        const cobertura = agrupados.cobertura[i];
        const cor = agrupados.cor_cobertura[i];

        const ingredientesCupcake = [tamanho, recheio, cobertura, cor];

        for (const idIngrediente of ingredientesCupcake) {
          await conn.query(
            'INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)',
            [novoPedidoId, idIngrediente, 1]
          );
        }
      }
    }

    await conn.query(
      'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
      [id_cliente]
    );
    await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);

    await conn.commit();

    return { mensagem: 'Resumo do pedido registrado com sucesso.', id_pedido: novoPedidoId };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}