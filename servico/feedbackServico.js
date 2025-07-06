import pool from './conexao.js';

async function listarFeedbacks() {
    const query = `
        SELECT
            f.id_feedback,
            f.id_cliente,
            f.estrelas,
            f.comentario,
            f.foto,
            f.data_criacao,
            c.nome AS nome_cliente,
            c.email AS email_cliente
        FROM
            feedbacks AS f
        JOIN
            clientes AS c ON f.id_cliente = c.id_cliente
        ORDER BY
            f.data_criacao DESC; -- Opcional: para listar os mais recentes primeiro
    `;
    const [linhas] = await pool.execute(query);
    return linhas;
}

async function adicionarFeedback({ id_cliente, estrelas, comentario, foto }) {
    const comando = `
        INSERT INTO feedbacks (id_cliente, estrelas, comentario, foto)
        VALUES (?, ?, ?, ?)
    `;
    const [resultado] = await pool.execute(comando, [
        id_cliente,
        estrelas,
        comentario,
        foto
    ]);
    return resultado.insertId;
}

async function excluirFeedback(id_feedback) {
    const comando = 'DELETE FROM feedbacks WHERE id_feedback = ?';
    const [resultado] = await pool.execute(comando, [id_feedback]);
    return resultado.affectedRows > 0;
}

export { listarFeedbacks, adicionarFeedback, excluirFeedback };