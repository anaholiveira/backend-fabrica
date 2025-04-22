import pool from './conexao.js';

const tiposValidos = ['tamanho', 'recheio', 'cobertura', 'cor_cobertura'];

export async function listarIngredientesPorTipo(tipo) {
  if (!tiposValidos.includes(tipo)) throw new Error('Tipo inválido.');

  const [rows] = await pool.query(
    'SELECT id_ingrediente, nome, valor FROM ingredientes WHERE tipo = ?',
    [tipo]
  );
  return rows;
}

export async function adicionarIngrediente({ nome, tipo, valor }) {
  if (!tiposValidos.includes(tipo)) throw new Error('Tipo inválido.');

  const [result] = await pool.query(
    'INSERT INTO ingredientes (nome, tipo, valor) VALUES (?, ?, ?)',
    [nome, tipo, valor]
  );
  return { id: result.insertId, nome, tipo, valor };
}

export async function excluirIngrediente(id) {
  const [result] = await pool.query(
    'DELETE FROM ingredientes WHERE id_ingrediente = ?',
    [id]
  );
  return result.affectedRows > 0;
}