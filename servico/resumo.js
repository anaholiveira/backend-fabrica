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
        SUM(i.valor * pi.quantidade) AS subtotal_calculado,
        -- Contar a quantidade total de cupcakes com base nos ingredientes 'tamanho'
        SUM(CASE WHEN i.tipo = 'tamanho' THEN pi.quantidade ELSE 0 END) AS quantidade_cupcakes_total
      FROM pedidos p
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.id_cliente = ?
        AND p.status = 'aguardando'
    `, [idCliente]);

    const subtotal = parseFloat(rows[0].subtotal_calculado) || 0;
    const quantidade = parseInt(rows[0].quantidade_cupcakes_total) || 0;

    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    return { quantidade, subtotal, taxaServico, taxaEntrega, total };

  } catch (error) {
    console.error('Erro ao obter resumo do pedido:', error);
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
    console.error('Erro ao apagar pedidos aguardando:', error);
    throw error;
  }
}

export async function registrarResumoPedido(resumo) {
    const { id_cliente, forma_pagamento, valor_total } = resumo; 

    if (!id_cliente || !forma_pagamento || valor_total === undefined || valor_total === null) {
        throw new Error('Dados incompletos. Verifique os campos enviados (id_cliente, forma_pagamento, valor_total).');
    }

    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [pedidosAguardando] = await conn.query(
            'SELECT id_pedido, valor_total FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
            [id_cliente]
        );

        if (pedidosAguardando.length === 0) {
            await conn.rollback();
            return { mensagem: 'Nenhum pedido "aguardando" encontrado para este cliente para ser finalizado.' };
        }

        const idsPedidosAguardando = pedidosAguardando.map(p => p.id_pedido);

        await conn.query(
            'UPDATE pedidos SET forma_pagamento = ?, status = ? WHERE id_pedido IN (?)',
            [forma_pagamento, 'aguardando', idsPedidosAguardando]
        );

        await conn.query(
            'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho IN (SELECT id_pedido_carrinho FROM pedidosCarrinho WHERE id_cliente = ?)',
            [id_cliente]
        );
        await conn.query('DELETE FROM pedidosCarrinho WHERE id_cliente = ?', [id_cliente]);

        await conn.commit();

        return { mensagem: 'Pedidos registrados e finalizados com sucesso.', ids_pedidos: idsPedidosAguardando };

    } catch (error) {
        await conn.rollback();
        console.error('Erro ao registrar resumo do pedido:', error);
        throw error;
    } finally {
        conn.release();
    }
}