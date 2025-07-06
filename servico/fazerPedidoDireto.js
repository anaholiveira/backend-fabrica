import pool from './conexao.js';

export async function fazerPedidoDireto(req, res) {
    const { id_cliente, ingredientes, quantidade } = req.body;

    try {
        if (!id_cliente || !ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0 || !quantidade || quantidade <= 0) {
            return res.status(400).json({ mensagem: 'Dados incompletos ou inválidos para o pedido direto.' });
        }

        const [dadosIngredientes] = await pool.query(
            `SELECT id_ingrediente, valor FROM ingredientes WHERE id_ingrediente IN (?)`,
            [ingredientes]
        );

        if (dadosIngredientes.length !== ingredientes.length) {
            return res.status(400).json({ mensagem: 'Um ou mais ingredientes fornecidos não são válidos.' });
        }

        const valor_total_unitario = dadosIngredientes.reduce((total, item) => total + Number(item.valor), 0);
        const valor_total = valor_total_unitario * quantidade;

        const [pedidoResult] = await pool.query(
            "INSERT INTO pedidos (id_cliente, valor_total, status) VALUES (?, ?, ?)",
            [id_cliente, valor_total, 'aguardando']
        );

        const id_pedido = pedidoResult.insertId;

        for (const id_ingrediente of ingredientes) {
            await pool.query(
                `INSERT INTO pedido_ingredientes (id_pedido, id_ingrediente, quantidade) VALUES (?, ?, ?)`,
                [id_pedido, id_ingrediente, quantidade] 
            );
        }

        res.status(201).json({
            mensagem: 'Pedido direto enviado para pagamento.',
            valor_total: valor_total,
            id_pedido: id_pedido
        });
    } catch (err) {
        console.error('Erro ao fazer pedido direto:', err);
        res.status(500).json({ mensagem: 'Erro ao fazer pedido.' });
    }
}