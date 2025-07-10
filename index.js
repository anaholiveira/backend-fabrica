import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cadastrarCliente } from './servico/cadastrarClientes.js';
import { listarClientes } from './servico/listarClientes.js';
import { loginCliente } from './servico/loginClientes.js';
import { listarPedidosAdmin } from './servico/listarPedidos.js';
import { atualizarStatusPedido } from './servico/atualizarStatus.js';
import { buscarIngredientes } from './servico/buscarIngredientes.js';
import { adicionarAoCarrinho } from './servico/adicionarAoCarrinho.js';
import { listarCarrinho } from './servico/listarCarrinho.js';
import { excluirPedidoCarrinho } from './servico/excluirPedidoCarrinho.js';
import { finalizarPedido } from './servico/finalizarPedido.js';
import { fazerPedidoDireto } from './servico/fazerPedidoDireto.js';
import { getResumoPedido, apagarPedidosAguardando, registrarResumoPedido } from './servico/resumo.js';
import { adicionarEndereco, listarEnderecos } from './servico/endereco.js';
import { listarIngredientesPorTipo, adicionarIngrediente, excluirIngrediente } from './servico/ingredienteServico.js';
import { listarFeedbacks, adicionarFeedback, excluirFeedback } from './servico/feedbackServico.js';
import { relatorioPedidos } from './servico/relatorio.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/cadastrarCliente', cadastrarCliente);
app.get('/clientes', listarClientes);
app.post('/login', loginCliente);

app.get('/admin/pedidos', listarPedidosAdmin);
app.put('/admin/pedidos/:id', atualizarStatusPedido);

app.get('/buscarIngredientes', buscarIngredientes);
app.post('/adicionarAoCarrinho', adicionarAoCarrinho);
app.get('/carrinho/:id_cliente', listarCarrinho);
app.delete('/excluirPedidoCarrinho/:id', excluirPedidoCarrinho);
app.post('/finalizarPedido', finalizarPedido);
app.post('/fazerPedidoDireto', fazerPedidoDireto);

app.get('/relatorio', relatorioPedidos);

app.get('/resumo/:idCliente', async (req, res) => {
  const { idCliente } = req.params;

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
  }

  try {
    const resumo = await getResumoPedido(idCliente);
    res.json(resumo);
  } catch (error) {
    console.error('Erro ao buscar resumo do pedido:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar resumo do pedido.' });
  }
});

app.post('/resumo', async (req, res) => {
  try {
    const { id_cliente, valor_total, forma_pagamento } = req.body;

    if (!id_cliente || !valor_total || !forma_pagamento) {
      return res.status(400).json({ erro: 'Dados do pedido incompletos.' });
    }

    const resposta = await registrarResumoPedido(id_cliente, valor_total, forma_pagamento);

    if (resposta.status === 'erro') {
      return res.status(500).json({ erro: resposta.erro });
    }

    res.status(201).json(resposta);
  } catch (error) {
    console.error('Erro ao registrar pedido:', error);
    res.status(500).json({ erro: 'Erro interno ao registrar pedido.' });
  }
});

app.delete('/pedidos/aguardando/:idCliente', async (req, res) => {
  const { idCliente } = req.params;

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
  }

  try {

    const resultado = await apagarPedidosAguardando(idCliente);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao apagar pedidos aguardando:', error);
    res.status(500).json({ erro: 'Erro interno ao apagar pedidos aguardando.' });
  }
});

app.post('/endereco', async (req, res) => {
  try {
    const novoEndereco = req.body;
    const id = await adicionarEndereco(novoEndereco);
    res.status(201).send({ id, mensagem: 'Endereço adicionado com sucesso!' });
  } catch (error) {
    res.status(400).send({ erro: error.message });
  }
});

app.get('/enderecos', async (req, res) => {
  try {
    const enderecos = await listarEnderecos();
    res.send(enderecos);
  } catch (error) {
    res.status(500).send({ erro: error.message });
  }
});

function formatarDataHora(data) {
  const options = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false
  };
  const novaData = new Date(data); 
  return novaData.toLocaleString('pt-BR', options); 
}

app.get('/ingredientes/:tipo', async (req, res) => {
  const { tipo } = req.params;
  try {
    const ingredientes = await listarIngredientesPorTipo(tipo);
    res.json(ingredientes);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.post('/ingredientes', async (req, res) => {
  const { nome, tipo, valor } = req.body;
  try {
    const novo = await adicionarIngrediente({ nome, tipo, valor });
    res.status(201).json(novo);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.delete('/ingredientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sucesso = await excluirIngrediente(id);
    if (sucesso) {
      res.json({ mensagem: 'Ingrediente excluído com sucesso' });
    } else {
      res.status(404).json({ erro: 'Ingrediente não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir ingrediente' });
  }
});

app.get('/feedbacks', async (req, res) => {
  try {
    const feedbacks = await listarFeedbacks();
    const feedbacksFormatados = feedbacks.map(feedback => {
      const dataFormatada = formatarDataHora(feedback.data_criacao); 
      return {
        ...feedback,
        data_criacao: dataFormatada 
      };
    });
    res.json(feedbacksFormatados);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

app.post('/feedbacks', async (req, res) => {
  const { id_cliente, estrelas, comentario, foto } = req.body;
  try {
    const novoFeedback = await adicionarFeedback({ id_cliente, estrelas, comentario, foto });
    res.status(201).json({ id: novoFeedback.id || novoFeedback, mensagem: 'Feedback adicionado com sucesso' });
  } catch (error) {
    res.status(400).json({ erro: 'Não foi possível cadastrar o feedback' });
  }
});

app.delete('/feedbacks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sucesso = await excluirFeedback(id);
    if (sucesso) {
      res.json({ mensagem: 'Feedback excluído com sucesso' });
    } else {
      res.status(404).json({ erro: 'Feedback não encontrado' });
    }
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir feedback' });
  }
});

app.listen(9000, () => {
  console.log(`Servidor rodando em http://localhost:9000`);
});