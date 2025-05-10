import pool from './conexao.js';

export async function relatorioPedidos(req, res) {
    try {
        const { dataInicio, dataFim } = req.query;

        if (!dataInicio || !dataFim) {
            return res.status(400).json({ erro: 'As datas de início e fim são obrigatórias.' });
        }

        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);

        if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
            return res.status(400).json({ erro: 'Formato de data inválido. Use o formato YYYY-MM-DD.' });
        }

        if (inicio > fim) {
            return res.status(400).json({ erro: 'A data de início não pode ser maior que a data de fim.' });
        }

        const conexao = await pool.getConnection();

        const [linhas] = await conexao.query(
            `SELECT * FROM detalhes_pedido 
             WHERE DATE(data_criacao) BETWEEN ? AND ?`,
            [dataInicio, dataFim]
        );

        conexao.release();

        if (linhas.length === 0) {
            return res.status(404).json({ mensagem: 'Nenhum pedido encontrado no intervalo informado.' });
        }

        const pedidosFormatados = linhas.map(pedido => {
            return {
                ...pedido,
                data_criacao: new Date(pedido.data_criacao).toISOString().split('T')[0]
            };
        });

        res.status(200).json(pedidosFormatados);

    } catch (erro) {
        console.error('Erro ao gerar relatório:', erro);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
}