import pool from './conexao.js';

async function listarFeedbacks() {
    const [linhas] = await pool.execute('SELECT * FROM feedbacks');
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