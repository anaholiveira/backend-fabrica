import pool from './conexao.js';

export async function listarCarrinho(req, res) {
    const { id_cliente } = req.params;

    try {
        const [pedidos] = await pool.query(`
            SELECT 
                pc.id_pedido_carrinho,
                pc.valor_total,
                pc.quantidade,
                GROUP_CONCAT(i.nome) AS ingredientes
            FROM pedidosCarrinho pc
            JOIN pedidosCarrinho_ingredientes pci ON pc.id_pedido_carrinho = pci.id_pedido_carrinho
            JOIN ingredientes i ON pci.id_ingrediente = i.id_ingrediente
            WHERE pc.id_cliente = ?
            GROUP BY pc.id_pedido_carrinho
        `, [id_cliente]);

        res.json(pedidos);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar carrinho.' });
    }
}