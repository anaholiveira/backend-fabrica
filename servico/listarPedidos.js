import pool from './conexao.js';

export async function listarPedidosAdmin(req, res) {
    try {
        const { filtro } = req.query;

        const query = `
            SELECT 
                p.id_pedido,
                p.data_criacao,
                c.email AS email_cliente,
                p.valor_total,
                p.forma_pagamento,
                p.status,
                i.tipo,
                i.nome AS nome_ingrediente,
                pi.quantidade,
                e.rua, 
                e.numero, 
                e.bairro, 
                e.cep, 
                e.complemento
            FROM pedidos p
            JOIN clientes c ON p.id_cliente = c.id_cliente
            JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
            JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
            LEFT JOIN enderecos e ON p.id_cliente = e.id_cliente
            WHERE p.status = ?
            ORDER BY p.id_pedido, pi.id_pedido_ingrediente
        `;

        const [rows] = await pool.query(query, [filtro || 'aguardando']);

        const pedidosMap = new Map();

        for (const row of rows) {
            const keyPedido = row.id_pedido;

            if (!pedidosMap.has(keyPedido)) {
                pedidosMap.set(keyPedido, {
                    id_pedido: row.id_pedido,
                    data_criacao: row.data_criacao,
                    email_cliente: row.email_cliente,
                    valor_total: row.valor_total,
                    forma_pagamento: row.forma_pagamento,
                    status: row.status,
                    rua: row.rua,
                    numero: row.numero,
                    bairro: row.bairro,
                    cep: row.cep,
                    complemento: row.complemento,
                    cupcakes: []
                });
            }

            const pedido = pedidosMap.get(keyPedido);

            let cupcake = pedido.cupcakes.find(c => 
                !c.tamanho || !c.recheio || !c.cobertura || !c.cor_cobertura
            );

            if (!cupcake) {
                cupcake = {
                    tamanho: null,
                    recheio: null,
                    cobertura: null,
                    cor_cobertura: null,
                    quantidade: row.quantidade
                };
                pedido.cupcakes.push(cupcake);
            }

            cupcake[row.tipo] = row.nome_ingrediente;
        }

        const pedidosFormatados = Array.from(pedidosMap.values()).map(pedido => {
            const data = new Date(pedido.data_criacao);
            const dataFormatada = data.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return {
                ...pedido,
                data_criacao: dataFormatada
            };
        });

        res.json(pedidosFormatados);
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
    }
}