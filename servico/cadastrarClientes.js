import bcrypt from 'bcryptjs';
import pool from './conexao.js';

export async function cadastrarCliente(req, res) {
    try {
        const { nome_completo, email, senha, cpf } = req.body;

        if (!nome_completo || !email || !senha || !cpf) {
            return res.status(400).json({ mensagem: 'Preencha todos os campos obrigatórios!' });
        }

        const regexCPF = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
        if (!regexCPF.test(cpf)) {
            return res.status(400).json({ mensagem: 'Formato de CPF inválido. Use XXX.XXX.XXX-XX' });
        }

        const [emailExistente] = await pool.query('SELECT * FROM clientes WHERE email = ?', [email]);
        if (emailExistente.length > 0) {
            return res.status(400).json({ mensagem: 'Esse e-mail já foi cadastrado, tente outro ou faça o login!' });
        }

        const [cpfExistente] = await pool.query('SELECT * FROM clientes WHERE cpf = ?', [cpf]);
        if (cpfExistente.length > 0) {
            return res.status(400).json({ mensagem: 'Esse CPF já foi cadastrado, tente outro!' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        await pool.query(
            'INSERT INTO clientes (nome_completo, email, senha, cpf) VALUES (?, ?, ?, ?)',
            [nome_completo, email, senhaHash, cpf]
        );

        res.status(201).json({ mensagem: 'Conta criada com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensagem: 'Erro ao criar a conta!' });
    }
}