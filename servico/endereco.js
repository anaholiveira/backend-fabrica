import pool from './conexao.js';

export async function adicionarEndereco(endereco) {
    const { id_cliente, rua, numero, cep, bairro, complemento } = endereco;

    if (!id_cliente || !rua || !numero || !cep || !bairro) {
        throw new Error('Campos obrigatórios estão faltando.');
    }

    const sql = `
        INSERT INTO enderecos (id_cliente, rua, numero, cep, bairro, complemento)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    const valores = [id_cliente, rua, numero, cep, bairro, complemento || null];

    const [resultado] = await pool.query(sql, valores);
    return resultado.insertId;
}

export async function listarEnderecos() {
    const sql = `SELECT * FROM enderecos`;
    const [linhas] = await pool.query(sql);
    return linhas;
}