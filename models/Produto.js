const mongoose = require('mongoose');

const ProdutoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  categoria: { type: String, required: true },
  preco: { type: Number, required: true },
  disponivel: { type: Boolean, default: true }
});

module.exports = mongoose.model('Produto', ProdutoSchema);