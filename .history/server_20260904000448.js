require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const path = require('path');
const Produto = require('./models/Produto');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o Banco de Dados
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Middleware de Autenticação para proteger o Admin
function autenticar(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });

  try {
    const verificado = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.usuario = verificado;
    next();
  } catch (err) {
    res.status(400).json({ erro: 'Token inválido.' });
  }
}

// Rota de Login para o Admin
app.post('/api/login', (req, res) => {
  const { senha } = req.body;
  if (senha === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  }
  res.status(401).json({ erro: 'Senha incorreta.' });
});

// --- ROTAS DA API ---

// 1. Obter produtos para a página pública (somente os disponíveis)
app.get('/api/produtos/publicos', async (req, res) => {
  try {
    const produtos = await Produto.find({ disponivel: true });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// 2. Obter TODOS os produtos para o painel admin (protegido)
app.get('/api/produtos/admin', autenticar, async (req, res) => {
  try {
    const produtos = await Produto.find();
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// 3. Alternar visibilidade do item (protegido)
app.patch('/api/produtos/:id/toggle', autenticar, async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });

    produto.disponivel = !produto.disponivel;
    await produto.save();

    res.json({ mensagem: 'Status atualizado', disponivel: produto.disponivel });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// 4. Cadastrar novo produto (protegido)
app.post('/api/produtos', autenticar, async (req, res) => {
  try {
    const novo = new Produto(req.body);
    await novo.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ erro: 'Erro ao criar produto' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});