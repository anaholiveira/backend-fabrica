import pool from './conexao.js';

export async function adicionarAoCarrinho(req, res) {
    const { id_cliente, ingredientes, quantidade } = req.body;

    try {
        const [dados] = await pool.query(
            `SELECT id_ingrediente, valor FROM ingredientes WHERE id_ingrediente IN (?)`,
            [ingredientes]
        );

        const valor_total_unitario = dados.reduce((total, item) => total + Number(item.valor), 0);
        const valor_total = valor_total_unitario * quantidade;

        const [result] = await pool.query(
            `INSERT INTO pedidosCarrinho (id_cliente, valor_total, quantidade) VALUES (?, ?, ?)`,
            [id_cliente, valor_total, quantidade]
        );

        const id_pedido = result.insertId;

        for (const id_ingrediente of ingredientes) {
            await pool.query(
                `INSERT INTO pedidosCarrinho_ingredientes (id_pedido_carrinho, id_ingrediente) VALUES (?, ?)`,
                [id_pedido, id_ingrediente]
            );
        }

        res.status(201).json({ mensagem: 'Pedido adicionado ao carrinho!', id_pedido });
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao adicionar ao carrinho.' });
    }
}