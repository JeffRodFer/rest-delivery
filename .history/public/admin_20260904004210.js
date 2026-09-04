const API_URL = '/api';

function obterToken() {
  return localStorage.getItem('token_admin');
}

async function fazerLogin() {
  const senha = document.getElementById('senha').value;
  const resposta = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senha })
  });

  const dados = await resposta.json();

  if (resposta.ok) {
    localStorage.setItem('token_admin', dados.token);
    carregarPainel();
  } else {
    alert(dados.erro || 'Erro ao fazer login');
  }
}

function sair() {
  localStorage.removeItem('token_admin');
  document.getElementById('tela-login').classList.remove('oculto');
  document.getElementById('tela-painel').classList.add('oculto');
}

async function carregarPainel() {
  const token = obterToken();
  if (!token) return;

  document.getElementById('tela-login').classList.add('oculto');
  document.getElementById('tela-painel').classList.remove('oculto');

  const resposta = await fetch(`${API_URL}/produtos/admin`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!resposta.ok) {
    sair();
    return;
  }

  const produtos = await resposta.json();
  const lista = document.getElementById('lista-itens');
  lista.innerHTML = '';

  produtos.forEach(item => {
    lista.innerHTML += `
      <div class="item-linha">
        <div>
          <strong>${item.nome}</strong><br>
          <small>R$ ${item.preco.toFixed(2)}</small>
        </div>
        <button 
          class="btn ${item.disponivel ? 'btn-on' : 'btn-off'}" 
          onclick="alternarStatus('${item._id}')">
          ${item.disponivel ? 'Visível' : 'Oculto'}
        </button>
      </div>
    `;
  });
}

async function alternarStatus(id) {
  const token = obterToken();
  await fetch(`${API_URL}/produtos/${id}/toggle`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  carregarPainel();
}

// Checa login ao carregar a página
if (obterToken()) {
  carregarPainel();
}