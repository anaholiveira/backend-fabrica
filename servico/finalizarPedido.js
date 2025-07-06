import pool from './conexao.js';

export async function finalizarPedido(req, res) {
    const { id_cliente } = req.body;
        try {
            const [pedidosCarrinho] = await pool.query(
            `SELECT * FROM pedidosCarrinho WHERE id_cliente = ?`,
            [id_cliente]
        );

        const listaPedidos = [];
        for (const pedido of pedidosCarrinho) {
            const [pedidoResult] = await pool.query(
            `INSERT INTO pedidos (id_cliente, valor_total, status) VALUES (?, ?, 'aguardando')`,
            [id_cliente, pedido.valor_total]
        );
        
        const id_novo_pedido = pedidoResult.insertId;
        const [ingredientes] = await pool.query(
            `SELECT ci.id_ingrediente, p.quantidade
            FROM pedidosCarrinho_ingredientes ci
            JOIN pedidosCarrinho p ON ci.id_pedido_carrinho = p.id_pedido_carrinho
            WHERE ci.id_pedido_carrinho = ?`,
            [pedido.id_pedido_carrinho]
        );
        
        for (const item of ingredientes) {
        await pool.query(
            `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
            [id_novo_pedido, item.id_ingrediente, item.quantidade]
        );
    }

        await pool.query(`DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?`, [pedido.id_pedido_carrinho]);

        await pool.query(`DELETE FROM pedidosCarrinho WHERE id_pedido_carrinho = ?`, [pedido.id_pedido_carrinho]);

        listaPedidos.push({
        id_pedido: id_novo_pedido,
        valor_total: pedido.valor_total
    });
} res.json({
    mensagem: 'Pedidos enviados para pagamento!',
    pedidos: listaPedidos
}); 
} catch (err) {
    res.status(500).json({ mensagem: 'Erro ao finalizar pedidos.' });
}}