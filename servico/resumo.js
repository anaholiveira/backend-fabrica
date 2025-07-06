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

export async function registrarResumoPedido(pedido) {
  const {
    id_cliente,
    forma_pagamento,
    quantidade,
    valor_total,
    taxaServico,
    taxaEntrega,
  } = pedido;

  if (!id_cliente || !forma_pagamento || !quantidade || !valor_total) {
    throw new Error('Campos obrigatórios faltando');
  }

  const qtd = Number(quantidade);
  const total = Number(valor_total);
  const taxaServ = Number(taxaServico || 0);
  const taxaEnt = Number(taxaEntrega || 0);

  if (isNaN(qtd) || isNaN(total)) {
    throw new Error('Quantidade e valor total devem ser números válidos');
  }

  const sql =
    'INSERT INTO pedidos (id_cliente, forma_pagamento, quantidade, valor_total, taxaServico, taxaEntrega, status) VALUES (?, ?, ?, ?, ?, ?, ?)';

  const valores = [id_cliente, forma_pagamento, qtd, total, taxaServ, taxaEnt, 'aguardando'];

  try {
    const [resultado] = await pool.query(sql, valores);
    return { id: resultado.insertId, mensagem: 'Resumo do pedido registrado com sucesso!' };
  } catch (error) {
    throw new Error('Erro ao registrar resumo do pedido: ' + error.message);
  }
}