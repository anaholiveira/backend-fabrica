import pool from './conexao.js';

export async function listarClientes(req, res) {
    try {
        const [clientes] = await pool.query('SELECT id_cliente, nome_completo, email, cpf FROM clientes');
        res.status(200).json(clientes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao buscar clientes' });
    }
}