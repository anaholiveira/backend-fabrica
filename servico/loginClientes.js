import bcrypt from 'bcryptjs';
import pool from './conexao.js';

export async function loginCliente(req, res) {
    try {
        const { email, senha } = req.body;

        const [clientes] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
        if (clientes.length === 0) {
            return res.status(400).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        const cliente = clientes[0];

        const senhaCorreta = await bcrypt.compare(senha, cliente.senha);
        if (!senhaCorreta) {
            return res.status(400).json({ mensagem: 'E-mail ou senha incorretos!' });
        }

        res.status(200).json({ mensagem: 'Login realizado com sucesso!', clienteId: cliente.id_cliente });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao realizar login!' });
    }
}