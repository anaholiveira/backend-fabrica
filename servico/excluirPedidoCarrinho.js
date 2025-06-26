import pool from './conexao.js';

export async function excluirPedidoCarrinho(req, res) {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ erro: 'ID do pedido do carrinho é obrigatório' });
    }

    const conn = await pool.getConnection();

    try {
        const [pedidoExistente] = await conn.query(
            'SELECT * FROM pedidosCarrinho WHERE id_pedido_carrinho = ?',
            [id]
        );

        if (pedidoExistente.length === 0) {
            return res.status(404).json({ erro: 'Pedido do carrinho não encontrado' });
        }

        await conn.query(
            'DELETE FROM pedidosCarrinho_ingredientes WHERE id_pedido_carrinho = ?',
            [id]
        );

        await conn.query(
            'DELETE FROM pedidosCarrinho WHERE id_pedido_carrinho = ?',
            [id]
        );

        res.status(200).json({ mensagem: 'Pedido do carrinho excluído com sucesso' });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: 'Erro ao excluir pedido do carrinho' });
    } finally {
        conn.release();
    }
}