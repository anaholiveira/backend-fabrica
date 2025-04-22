import pool from './conexao.js';

export async function buscarIngredientes(req, res) {
    try {
        const [ingredientes] = await pool.query('SELECT * FROM ingredientes');
        res.json(ingredientes);
    } catch (err) {
        res.status(500).json({ mensagem: 'Erro ao buscar ingredientes.' });
    }
}