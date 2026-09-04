async function carregarCardapio() {
  try {
    const resposta = await fetch('/api/produtos/publicos');
    const produtos = await resposta.json();

    const conteiner = document.getElementById('cardapio');
    if (!conteiner) return;

    conteiner.innerHTML = '';

    if (produtos.length === 0) {
      conteiner.innerHTML = '<p>Nenhum item disponível no momento.</p>';
      return;
    }

    produtos.forEach(item => {
      conteiner.innerHTML += `
        <div class="prato-card">
          <h3>${item.nome}</h3>
          <p class="categoria">${item.categoria}</p>
          <p class="preco">R$ ${item.preco.toFixed(2)}</p>
        </div>
      `;
    });
  } catch (erro) {
    console.error('Erro ao carregar cardápio:', erro);
  }
}

document.addEventListener('DOMContentLoaded', carregarCardapio);