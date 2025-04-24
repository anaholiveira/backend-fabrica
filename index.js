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
import { finalizarPedido } from './servico/finalizarPedido.js';
import { fazerPedidoDireto } from './servico/fazerPedidoDireto.js';
import { getResumoPedido } from './servico/resumo.js';
import { adicionarEndereco, listarEnderecos } from './servico/endereco.js';
import { listarIngredientesPorTipo, adicionarIngrediente, excluirIngrediente } from './servico/ingredienteServico.js';
import { listarFeedbacks, adicionarFeedback, excluirFeedback } from './servico/feedbackServico.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

//Priscila clientes
app.post('/cadastrarCliente', cadastrarCliente);
app.get('/clientes', listarClientes);
app.post('/login', loginCliente);

//Priscila admin
app.get('/admin/pedidos', listarPedidosAdmin);
app.put('/admin/pedidos/:id', atualizarStatusPedido);

//Ana Gabriely Pedido
app.get('/buscarIngredientes', buscarIngredientes);
app.post('/adicionarAoCarrinho', adicionarAoCarrinho);
app.get('/carrinho/:id_cliente', listarCarrinho);
app.post('/finalizarPedido', finalizarPedido);
app.post('/fazerPedidoDireto', fazerPedidoDireto);


//Leticia Chekout
app.get('/resumo/:idCliente', async (req, res) => {
    const { idCliente } = req.params;

    try {
        const resumo = await getResumoPedido(idCliente);
        res.json(resumo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ erro: 'Erro ao buscar resumo do pedido' });
    }
});


//Isabella Endereço
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


//Rotas para Ingredientes - Thamylla e Isabella
//Listar ingredientes por tipo
app.get('/ingredientes/:tipo', async (req, res) => {
    const { tipo } = req.params;
    try {
      const ingredientes = await listarIngredientesPorTipo(tipo);
      res.json(ingredientes);
    } catch (error) {
      res.status(400).json({ erro: error.message });
    }
});
  
  //Adicionar novo ingrediente
app.post('/ingredientes', async (req, res) => {
    const { nome, tipo, valor } = req.body;
    try {
      const novo = await adicionarIngrediente({ nome, tipo, valor });
      res.status(201).json(novo);
    } catch (error) {
      res.status(400).json({ erro: error.message });
    }
});
  
//Excluir ingrediente por id
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
  

//Thamylla Feedback
//Listar feedbacks
app.get('/feedbacks', async (req, res) => {
    try {
    const feedbacks = await listarFeedbacks();
    res.json(feedbacks);
    } catch (error) {
    res.status(400).json({ erro: error.message });
    }
});

//Adicionar feedback
app.post('/feedbacks', async (req, res) => {
    const { id_cliente, estrelas, comentario, foto } = req.body;
    try {
    const novoFeedback = await adicionarFeedback({ id_cliente, estrelas, comentario, foto });
    res.status(201).json({ id_feedback: novoFeedback });
    } catch (error) {
    res.status(400).json({ erro: error.message });
    }
});

//Excluir feedback
app.delete('/feedbacks/:id', async (req, res) => {
    const { id } = req.params;
    try {
    await excluirFeedback(id);
    res.json({ mensagem: 'Feedback excluído com sucesso' });
    } catch (error) {
    res.status(500).json({ erro: 'Erro ao excluir feedback' });
    }
});



app.listen(9000, () => {
    console.log(`Servidor rodando em http://localhost:9000`);
});