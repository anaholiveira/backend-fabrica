import pool from './conexao.js';

export async function getResumoPedido(idCliente) {
  try {
    if (isNaN(idCliente) || idCliente <= 0) {
      throw new Error('ID de cliente inválido. Deve ser um número maior que 0.');
    }

    const [cliente] = await pool.query('SELECT id_cliente FROM clientes WHERE id_cliente = ?', [idCliente]);
    if (cliente.length === 0) {
      return { erro: 'Cliente não encontrado.' };
    }

    const [rows] = await pool.query(`
      SELECT
        SUM(i.valor * pi.quantidade) AS subtotal,
        SUM(CASE WHEN i.tipo = 'tamanho' THEN pi.quantidade ELSE 0 END) AS quantidade
      FROM pedidos p
      JOIN pedido_ingredientes pi ON p.id_pedido = pi.id_pedido
      JOIN ingredientes i ON pi.id_ingrediente = i.id_ingrediente
      WHERE p.id_cliente = ? 
        AND p.status = 'aguardando'
    `, [idCliente]);

    const subtotal = parseFloat(rows[0].subtotal) || 0;
    const quantidade = parseInt(rows[0].quantidade) || 0;

    const taxaServico = 2.50;
    const taxaEntrega = 5.00;
    const total = parseFloat((subtotal + taxaServico + taxaEntrega).toFixed(2));

    return { quantidade, subtotal, taxaServico, taxaEntrega, total };
    
  } catch (error) {
    console.error('Erro inesperado:', error);
    throw error;
  }
}