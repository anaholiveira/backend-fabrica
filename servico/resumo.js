import express from 'express';
import pool from './conexao.js';

const app = express();
app.use(express.json());

async function getResumoPedido(idCliente) {
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
    console.error('Erro ao obter resumo:', error);
    throw error;
  }
}

async function apagarPedidosAguardando(idCliente) {
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

async function fazerPedido(idCliente, forma_pagamento, total, quantidade) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido.');
    }
    if (!['pix', 'dinheiro', 'cartao', 'maquina'].includes(forma_pagamento)) {
      throw new Error('Forma de pagamento inválida.');
    }
    if (typeof total !== 'number' || total <= 0) {
      throw new Error('Total inválido.');
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error('Quantidade inválida.');
    }

    const [pedidos] = await pool.query(
      'SELECT id_pedido FROM pedidos WHERE id_cliente = ? AND status = "aguardando"',
      [idCliente]
    );

    if (pedidos.length === 0) {
      throw new Error('Nenhum pedido aguardando para este cliente.');
    }

    const ids = pedidos.map(p => p.id_pedido);

    await pool.query(
      `
      UPDATE pedidos
      SET status = 'pendente', forma_pagamento = ?, valor_total = ?, quantidade = ?
      WHERE id_pedido IN (?)
      `,
      [forma_pagamento, total, quantidade, [ids]]
    );

    return { mensagem: 'Pedido realizado com sucesso.' };
  } catch (error) {
    console.error('Erro ao fazer pedido:', error);
    throw error;
  }
}

app.get('/resumo/:idCliente', async (req, res) => {
  const { idCliente } = req.params;

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
  }

  try {
    const resumo = await getResumoPedido(idCliente);
    res.json(resumo);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.delete('/pedidos/aguardando/:idCliente', async (req, res) => {
  const { idCliente } = req.params;

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
  }

  try {
    const resultado = await apagarPedidosAguardando(idCliente);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.post('/fazerPedido', async (req, res) => {
  const { id_cliente, forma_pagamento, total, quantidade } = req.body;

  if (!id_cliente || isNaN(id_cliente) || id_cliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido.' });
  }
  if (!forma_pagamento || !['pix', 'dinheiro', 'cartao', 'maquina'].includes(forma_pagamento)) {
    return res.status(400).json({ erro: 'Forma de pagamento inválida.' });
  }
  if (!total || typeof total !== 'number' || total <= 0) {
    return res.status(400).json({ erro: 'Total inválido.' });
  }
  if (!quantidade || !Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ erro: 'Quantidade inválida.' });
  }

  try {
    const resultado = await fazerPedido(id_cliente, forma_pagamento, total, quantidade);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

export default app;