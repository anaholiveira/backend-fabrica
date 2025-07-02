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

import { getResumoPedido, apagarPedidosAguardando, fazerPedido } from './servico/resumo.js';

import { adicionarEndereco, listarEnderecos } from './servico/endereco.js';
import { listarIngredientesPorTipo, adicionarIngrediente, excluirIngrediente } from './servico/ingredienteServico.js';
import { listarFeedbacks, adicionarFeedback, excluirFeedback } from './servico/feedbackServico.js';
import { relatorioPedidos } from './servico/relatorio.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rotas Clientes
app.post('/cadastrarCliente', cadastrarCliente);
app.get('/clientes', listarClientes);
app.post('/login', loginCliente);

// Rotas Administração
app.get('/admin/pedidos', listarPedidosAdmin);
app.put('/admin/pedidos/:id', atualizarStatusPedido);

// Rotas Ingredientes e Carrinho
app.get('/buscarIngredientes', buscarIngredientes);
app.post('/adicionarAoCarrinho', adicionarAoCarrinho);
app.get('/carrinho/:id_cliente', listarCarrinho);
app.delete('/excluirPedidoCarrinho/:id', excluirPedidoCarrinho);

// Rotas Pedidos
app.post('/finalizarPedido', finalizarPedido);
app.post('/fazerPedidoDireto', fazerPedidoDireto);

// Rotas resumo, apagar e fazer pedido (nova API)
app.get('/resumo/:idCliente', async (req, res) => {
  const { idCliente } = req.params;

  if (isNaN(idCliente) || idCliente <= 0) {
    return res.status(400).json({ erro: 'ID de cliente inválido. Deve ser um número maior que 0.' });
  }

  try {
    const resumo = await getResumoPedido(idCliente);
    res.json(resumo);
  } catch (error) {
    res.status(400).json({ erro: error.message });
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
    res.status(400).json({ erro: error.message });
  }
});

app.post('/fazerPedido', async (req, res) => {
  const { id_cliente, forma_pagamento, total, quantidade } = req.body;

  if (
    !id_cliente ||
    !forma_pagamento ||
    isNaN(total) ||
    isNaN(quantidade) ||
    total <= 0 ||
    quantidade <= 0
  ) {
    return res.status(400).json({ erro: 'Dados inválidos para fazer o pedido.' });
  }

  try {
    const resultado = await fazerPedido(id_cliente, forma_pagamento, total, quantidade);
    res.json(resultado);
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

// Rotas Endereços
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

// Rotas ingredientes por tipo e gerenciamento
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

// Rotas Feedbacks
app.get('/feedbacks', async (req, res) => {
  try {
    const feedbacks = await listarFeedbacks();
    // Se quiser formatar datas, faça aqui
    res.json(feedbacks);
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

// Relatórios
app.get('/relatorio', relatorioPedidos);

app.listen(9000, () => {
  console.log(`Servidor rodando em http://localhost:9000`);
});