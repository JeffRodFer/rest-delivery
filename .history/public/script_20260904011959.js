// Variáveis Globais de Estado
let produtosGlobais = [];
let configuracoesGlobais = {};
let pedidoCliente = {
    nome: '',
    telefone: '',
    endereco: '',
    marmitasQtd: 1,
    marmitasItens: []
};
let marmitaAtualIndex = 0;

// Inicialização da Aplicação
document.addEventListener('DOMContentLoaded', () => {
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
    carregarDadosIniciais();
});

// Atualiza o relógio no topo
function atualizarDataHora() {
    const el = document.getElementById('data-hora-brasilia');
    if (el) {
        const agora = new Date();
        const opcoes = { timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'medium' };
        el.innerText = agora.toLocaleString('pt-BR', opcoes);
    }
}

// Busca os dados da API Express / MongoDB
async function carregarDadosIniciais() {
    try {
        const resConfig = await fetch('/api/configuracoes');
        if (resConfig.ok) {
            configuracoesGlobais = await resConfig.json();
            const pixEl = document.getElementById('pix-exibicao');
            if (pixEl) pixEl.innerText = `Chave PIX: ${configuracoesGlobais.chavePix || 'Não informada'}`;
        }

        const resProdutos = await fetch('/api/produtos');
        if (resProdutos.ok) {
            produtosGlobais = await resProdutos.json();
            renderizarCardapioVitrine(produtosGlobais);
        }
    } catch (err) {
        console.error('Erro ao carregar dados:', err);
    }
}

// Normalizador de Categoria (ignora acentos e maiúsculas/minúsculas)
function normalizarCat(str) {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// RENDERIZAÇÃO DO CARDÁPIO PRINCIPAL (Grids Horizontais)
function renderizarCardapioVitrine(produtos) {
    const conteiner = document.getElementById('cardapio-vitrine');
    if (!conteiner) return;

    if (!produtos || produtos.length === 0) {
        conteiner.innerHTML = '<p style="text-align:center; padding: 20px; font-weight: bold;">Nenhum item disponível no momento.</p>';
        return;
    }

    // Filtragem flexível considerando variações de nome
    const proteinas = produtos.filter(p => normalizarCat(p.categoria) === 'proteina' && p.disponivel !== false);
    const guarnicoes = produtos.filter(p => normalizarCat(p.categoria) === 'guarnicao' && p.disponivel !== false);
    const bebidas = produtos.filter(p => normalizarCat(p.categoria) === 'bebida' && p.disponivel !== false);
    const sobremesas = produtos.filter(p => normalizarCat(p.categoria) === 'sobremesa' && p.disponivel !== false);

    let html = '';

    // 1. Proteínas
    if (proteinas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Proteínas</h2>
            <div class="grid-proteinas">`;
        proteinas.forEach(p => {
            html += `<div class="item-card">${p.nome}</div>`;
        });
        html += `</div></section>`;
    }

    // 2. Guarnições
    if (guarnicoes.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Guarnições</h2>
            <div class="grid-guarnicoes">`;
        guarnicoes.forEach(g => {
            html += `<div class="item-card">${g.nome}</div>`;
        });
        html += `</div></section>`;
    }

    // 3. Bebidas
    if (bebidas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Bebidas</h2>
            <div class="grid-bebidas">`;
        bebidas.forEach(b => {
            const preco = b.preco ? ` - R$ ${Number(b.preco).toFixed(2)}` : '';
            html += `<div class="item-card">${b.nome}${preco}</div>`;
        });
        html += `</div></section>`;
    }

    // 4. Sobremesas
    if (sobremesas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Sobremesas</h2>
            <div class="grid-sobremesas">`;
        sobremesas.forEach(s => {
            const preco = s.preco ? ` - R$ ${Number(s.preco).toFixed(2)}` : '';
            html += `<div class="item-card">${s.nome}${preco}</div>`;
        });
        html += `</div></section>`;
    }

    conteiner.innerHTML = html;
}

// CONTROLE DOS MODAIS
function abrirModalPedido() {
    document.getElementById('modal-pedido').style.display = 'block';
    document.getElementById('passo-cliente').style.display = 'block';
    document.getElementById('passo-itens').style.display = 'none';
    document.getElementById('passo-resumo').style.display = 'none';
}

function fecharModalPedido() {
    document.getElementById('modal-pedido').style.display = 'none';
}

function abrirModalGerenciamento() {
    document.getElementById('modal-gerenciamento').style.display = 'block';
}

function fecharModalGerenciamento() {
    document.getElementById('modal-gerenciamento').style.display = 'none';
}

// FLUXO DO PEDIDO
function iniciarSelecaoItens() {
    const nome = document.getElementById('cliente-nome').value.trim();
    const tel = document.getElementById('cliente-telefone').value.trim();
    const end = document.getElementById('cliente-endereco').value.trim();
    const qtd = parseInt(document.getElementById('cliente-qtd').value) || 1;

    if (!nome || !tel || !end) {
        alert('Por favor, preencha todos os dados de entrega.');
        return;
    }

    pedidoCliente.nome = nome;
    pedidoCliente.telefone = tel;
    pedidoCliente.endereco = end;
    pedidoCliente.marmitasQtd = qtd;
    pedidoCliente.marmitasItens = [];
    marmitaAtualIndex = 0;

    document.getElementById('passo-cliente').style.display = 'none';
    document.getElementById('passo-itens').style.display = 'block';
    montarFormularioMarmita(marmitaAtualIndex);
}

function montarFormularioMarmita(index) {
    document.getElementById('titulo-pedido-num').innerText = `Pedido ${index + 1} de ${pedidoCliente.marmitasQtd}`;
    
    const divConteudo = document.getElementById('conteudo-pedido-atual');
    
    const guarnicoes = produtosGlobais.filter(p => normalizarCat(p.categoria) === 'guarnicao' && p.disponivel !== false);
    const proteinas = produtosGlobais.filter(p => normalizarCat(p.categoria) === 'proteina' && p.disponivel !== false);
    const bebidas = produtosGlobais.filter(p => normalizarCat(p.categoria) === 'bebida' && p.disponivel !== false);
    const sobremesas = produtosGlobais.filter(p => normalizarCat(p.categoria) === 'sobremesa' && p.disponivel !== false);

    let html = '';

    // Guarnições
    html += `<h3>Guarnições (Escolha até 4):</h3><div class="grupo-checkbox">`;
    guarnicoes.forEach(g => {
        html += `<label><input type="checkbox" name="guarnicao" value="${g.nome}"> ${g.nome}</label>`;
    });
    html += `</div>`;

    // Proteínas
    html += `<h3>Proteínas (Escolha até 2):</h3><div class="grupo-checkbox">`;
    proteinas.forEach(p => {
        html += `<label><input type="checkbox" name="proteina" value="${p.nome}"> ${p.nome}</label>`;
    });
    html += `</div>`;

    // Bebidas
    html += `<h3>Bebidas:</h3><div class="grupo-quantidades">`;
    bebidas.forEach(b => {
        html += `<div class="item-qtd"><span>${b.nome} (R$ ${Number(b.preco).toFixed(2)})</span><input type="number" data-nome="${b.nome}" data-preco="${b.preco}" class="qtd-bebida" min="0" value="0"></div>`;
    });
    html += `</div>`;

    // Sobremesas
    html += `<h3>Sobremesas:</h3><div class="grupo-quantidades">`;
    sobremesas.forEach(s => {
        html += `<div class="item-qtd"><span>${s.nome} (R$ ${Number(s.preco).toFixed(2)})</span><input type="number" data-nome="${s.nome}" data-preco="${s.preco}" class="qtd-sobremesa" min="0" value="0"></div>`;
    });
    html += `</div>`;

    // Observação
    html += `<h3>Observação (Até 90 caracteres):</h3><textarea id="marmita-obs" maxlength="90" placeholder="Ex: Pouco feijão, sem cebola..."></textarea>`;

    divConteudo.innerHTML = html;
}

function salvarPedidoAtual() {
    const guarnicoesSel = Array.from(document.querySelectorAll('input[name="guarnicao"]:checked')).map(el => el.value);
    const proteinasSel = Array.from(document.querySelectorAll('input[name="proteina"]:checked')).map(el => el.value);

    if (guarnicoesSel.length > 4) {
        alert('Por favor, selecione no máximo 4 guarnições.');
        return;
    }

    if (proteinasSel.length > 2) {
        alert('Por favor, selecione no máximo 2 proteínas.');
        return;
    }

    const bebidasSel = [];
    document.querySelectorAll('.qtd-bebida').forEach(el => {
        const qtd = parseInt(el.value) || 0;
        if (qtd > 0) {
            bebidasSel.push({ nome: el.dataset.nome, preco: parseFloat(el.dataset.preco), quantidade: qtd });
        }
    });

    const sobremesasSel = [];
    document.querySelectorAll('.qtd-sobremesa').forEach(el => {
        const qtd = parseInt(el.value) || 0;
        if (qtd > 0) {
            sobremesasSel.push({ nome: el.dataset.nome, preco: parseFloat(el.dataset.preco), quantidade: qtd });
        }
    });

    const obs = document.getElementById('marmita-obs').value.trim();

    pedidoCliente.marmitasItens.push({
        guarnicoes: guarnicoesSel,
        proteinas: proteinasSel,
        bebidas: bebidasSel,
        sobremesas: sobremesasSel,
        observacao: obs
    });

    marmitaAtualIndex++;

    if (marmitaAtualIndex < pedidoCliente.marmitasQtd) {
        montarFormularioMarmita(marmitaAtualIndex);
    } else {
        exibirResumoPedido();
    }
}

function exibirResumoPedido() {
    document.getElementById('passo-itens').style.display = 'none';
    document.getElementById('passo-resumo').style.display = 'block';

    const precoMarmita = parseFloat(configuracoesGlobais.precoMarmita) || 0;
    const taxaEntrega = parseFloat(configuracoesGlobais.taxaEntrega) || 0;

    let subtotalMarmitas = pedidoCliente.marmitasQtd * precoMarmita;
    let totalExtras = 0;

    let texto = `*NOVO PEDIDO - RESTAURANTE DO IRMÃO*\n`;
    texto += `------------------------------------\n`;
    texto += `*Cliente:* ${pedidoCliente.nome}\n`;
    texto += `*Telefone:* ${pedidoCliente.telefone}\n`;
    texto += `*Endereço:* ${pedidoCliente.endereco}\n`;
    texto += `------------------------------------\n`;

    pedidoCliente.marmitasItens.forEach((m, idx) => {
        texto += `\n*MARMITA ${idx + 1}*\n`;
        texto += `Guarnições: ${m.guarnicoes.join(', ') || 'Nenhuma'}\n`;
        texto += `Proteínas: ${m.proteinas.join(', ') || 'Nenhuma'}\n`;
        
        if (m.bebidas.length > 0) {
            texto += `Bebidas:\n`;
            m.bebidas.forEach(b => {
                const sub = b.preco * b.quantidade;
                totalExtras += sub;
                texto += `  - ${b.quantidade}x ${b.nome} (R$ ${sub.toFixed(2)})\n`;
            });
        }

        if (m.sobremesas.length > 0) {
            texto += `Sobremesas:\n`;
            m.sobremesas.forEach(s => {
                const sub = s.preco * s.quantidade;
                totalExtras += sub;
                texto += `  - ${s.quantidade}x ${s.nome} (R$ ${sub.toFixed(2)})\n`;
            });
        }

        if (m.observacao) {
            texto += `Obs: ${m.observacao}\n`;
        }
    });

    const totalGeral = subtotalMarmitas + totalExtras + taxaEntrega;

    texto += `\n------------------------------------\n`;
    texto += `Marmitas (${pedidoCliente.marmitasQtd}x): R$ ${subtotalMarmitas.toFixed(2)}\n`;
    if (totalExtras > 0) texto += `Extras (Bebidas/Sobremesas): R$ ${totalExtras.toFixed(2)}\n`;
    texto += `Taxa de Entrega: R$ ${taxaEntrega.toFixed(2)}\n`;
    texto += `*TOTAL A PAGAR: R$ ${totalGeral.toFixed(2)}*\n`;
    texto += `------------------------------------\n`;
    texto += `*Chave PIX:* ${configuracoesGlobais.chavePix || ''}`;

    document.getElementById('resumo-texto').innerText = texto;
}

function enviarParaRestaurante() {
    const whatsRestaurante = configuracoesGlobais.whatsappRestaurante || '55819920036280';
    const texto = encodeURIComponent(document.getElementById('resumo-texto').innerText);
    window.open(`https://wa.me/${whatsRestaurante}?text=${texto}`, '_blank');
}

function enviarParaCliente() {
    const texto = encodeURIComponent(document.getElementById('resumo-texto').innerText);
    window.open(`https://wa.me/?text=${texto}`, '_blank');
}