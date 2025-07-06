import pool from './conexao.js';

export async function fazerPedidoDireto(req, res) {
  const { id_cliente, ingredientes, quantidade } = req.body;

  try {
    const [dados] = await pool.query(
      `SELECT id_ingrediente, valor FROM ingredientes WHERE id_ingrediente IN (?)`,
      [ingredientes]
    );

    const valor_total_unitario = dados.reduce(
      (total, item) => total + Number(item.valor),
      0
    );

    const valor_total = valor_total_unitario * quantidade;

    const [pedido] = await pool.query(
      "INSERT INTO pedidos (id_cliente, valor_total, quantidade, status) VALUES (?, ?, ?, 'aguardando')",
      [id_cliente, valor_total, quantidade]
    );

    const id_pedido = pedido.insertId;

    for (const id_ingrediente of ingredientes) {
      await pool.query(
        `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
        [id_pedido, id_ingrediente, 1]
      );
    }

    res.status(201).json({
      mensagem: 'Pedido enviado para pagamento.',
      valor_total: valor_total,
      id_pedido: id_pedido,
    });
  } catch (err) {
    console.error('Erro ao fazer pedido direto:', err);
    res.status(500).json({ mensagem: 'Erro ao fazer pedido.' });
  }
}