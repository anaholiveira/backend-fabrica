import express from 'express';
import pool from './conexao.js';

const router = express.Router();

router.get('/resumo/:id', async (req, res) => {
  const idCliente = parseInt(req.params.id);

  try {
    const resultado = await getResumoPedido(idCliente);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao obter resumo do pedido.' });
  }
});

router.delete('/pedidos/aguardando/:id', async (req, res) => {
  const idCliente = parseInt(req.params.id);

  try {
    const resultado = await apagarPedidosAguardando(idCliente);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao apagar pedidos.' });
  }
});

router.post('/fazerPedido', async (req, res) => {
  const { id_cliente, forma_pagamento, total, quantidade } = req.body;

  try {
    const resultado = await fazerPedido(id_cliente, forma_pagamento, total, quantidade);
    res.json(resultado);
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao fazer o pedido.' });
  }
});

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido.');
    }

    const [cliente] = await pool.query(
      'SELECT id_cliente FROM clientes WHERE id_cliente = ?',
      [idCliente]
    );

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
    console.error('Erro ao obter resumo:', error);
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
    console.error('Erro ao apagar pedidos:', error);
    throw error;
  }
}

export async function fazerPedido(idCliente, formaPagamento, total, quantidade) {
  try {
    if (!idCliente || !formaPagamento || isNaN(total) || isNaN(quantidade)) {
      throw new Error('Dados inválidos para fazer o pedido.');
    }

    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      return { erro: 'Nenhum pedido em andamento para confirmar.' };
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query(
      `UPDATE pedidos SET status = 'pendente', forma_pagamento = ?, total = ?, quantidade = ? WHERE id_pedido IN (?)`,
      [formaPagamento, total, quantidade, ids]
    );

    return { mensagem: 'Pedido realizado com sucesso.', pedidos: ids };
  } catch (error) {
    console.error('Erro ao fazer o pedido:', error);
    throw error;
  }
}

export default router;