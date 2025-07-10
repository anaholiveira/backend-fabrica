import pool from './conexao.js';

async function listarFeedbacks() {
  const [linhas] = await pool.execute('SELECT * FROM feedbacks ORDER BY data_criacao DESC');
  return linhas.map(feedback => ({
    ...feedback,
    fotos: [feedback.foto1, feedback.foto2, feedback.foto3].filter(Boolean), // pega só as fotos que existem
  }));
}

async function adicionarFeedback({ id_cliente, estrelas, comentario, fotos }) {
  const [foto1, foto2, foto3] = fotos || [];

  const comando = `
    INSERT INTO feedbacks (id_cliente, estrelas, comentario, foto1, foto2, foto3)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const [resultado] = await pool.execute(comando, [
    id_cliente,
    estrelas,
    comentario,
    foto1 || null,
    foto2 || null,
    foto3 || null,
  ]);

  return resultado.insertId;
}

async function excluirFeedback(id_feedback) {
  const [resultado] = await pool.execute('DELETE FROM feedbacks WHERE id_feedback = ?', [id_feedback]);
  return resultado.affectedRows > 0;
}

export { listarFeedbacks, adicionarFeedback, excluirFeedback };