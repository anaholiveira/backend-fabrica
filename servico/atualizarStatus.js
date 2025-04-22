import pool from './conexao.js';

export async function atualizarStatusPedido(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['aguardando', 'finalizado'].includes(status)) {
            return res.status(400).json({ mensagem: 'Status inválido. Use "aguardando" ou "finalizado".' });
        }

        const [result] = await pool.query(`UPDATE pedidos SET status = ? WHERE id_pedido = ?`, [status, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ mensagem: 'Pedido não encontrado' });
        }

        res.json({ mensagem: 'Status atualizado com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ mensagem: 'Erro ao atualizar status do pedido' });
    }
}