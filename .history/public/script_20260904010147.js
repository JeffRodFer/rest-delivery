// Configurações do Restaurante
const NUMERO_RESTAURANTE = "55819920036280"; // WhatsApp do restaurante (padrão)
let PRECO_MARMITA = 20.00;
let TAXA_ENTREGA = 5.00;

// Estado Global do Pedido
let clienteInfo = { nome: '', telefone: '', endereco: '', quantidade: 1 };
let pedidoAtualIndex = 0;
let listaPedidos = [];
let cardapioCompleto = [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    atualizarDataHora();
    setInterval(atualizarDataHora, 1000);
    carregarCardapio();
});

// 1. Atualizar Data e Hora (Horário de Brasília)
function atualizarDataHora() {
    const el = document.getElementById('data-hora-brasilia');
    if (!el) return;
    const agora = new Date();
    const opcoes = { timeZone: 'America/Recife', dateStyle: 'short', timeStyle: 'medium' };
    el.innerText = agora.toLocaleString('pt-BR', opcoes);
}

// 2. Buscar Produtos do Backend (Apenas Disponíveis)
async function carregarCardapio() {
    try {
        const resposta = await fetch('/api/produtos/publicos');
        cardapioCompleto = await resposta.json();
        renderizarCardapioVitrine(cardapioCompleto);
    } catch (erro) {
        console.error('Erro ao carregar cardápio:', erro);
    }
}

// Exibe a vitrine estática no descanso da página
function renderizarCardapioVitrine(produtos) {
    const conteiner = document.getElementById('cardapio-vitrine');
    if (!conteiner) return;

    if (!produtos || produtos.length === 0) {
        conteiner.innerHTML = '<p style="text-align:center;">Nenhum item disponível no momento.</p>';
        return;
    }

    const proteinas = produtos.filter(p => p.categoria === 'Proteína');
    const guarnicoes = produtos.filter(p => p.categoria === 'Guarnição');
    const bebidas = produtos.filter(p => p.categoria === 'Bebida');
    const sobremesas = produtos.filter(p => p.categoria === 'Sobremesa');

    let html = '';

    // 3. Proteínas (Horizontal com 8 itens por linha)
    if (proteinas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Proteínas</h2>
            <div class="grid-proteinas">`;
        proteinas.forEach(p => {
            html += `<div class="item-card">${p.nome}</div>`;
        });
        html += `</div></section>`;
    }

    // 4. Guarnições (Horizontal com 5 itens por linha)
    if (guarnicoes.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Guarnições</h2>
            <div class="grid-guarnicoes">`;
        guarnicoes.forEach(g => {
            html += `<div class="item-card">${g.nome}</div>`;
        });
        html += `</div></section>`;
    }

    // 5. Bebidas (Horizontal com 6 itens por linha)
    if (bebidas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Bebidas</h2>
            <div class="grid-bebidas">`;
        bebidas.forEach(b => {
            const precoStr = b.preco ? ` - R$ ${b.preco.toFixed(2)}` : '';
            html += `<div class="item-card">${b.nome}${precoStr}</div>`;
        });
        html += `</div></section>`;
    }

    // 6. Sobremesas (Horizontal com 6 itens por linha)
    if (sobremesas.length > 0) {
        html += `<section class="secao-cardapio">
            <h2>Sobremesas</h2>
            <div class="grid-sobremesas">`;
        sobremesas.forEach(s => {
            const precoStr = s.preco ? ` - R$ ${s.preco.toFixed(2)}` : '';
            html += `<div class="item-card">${s.nome}${precoStr}</div>`;
        });
        html += `</div></section>`;
    }

    conteiner.innerHTML = html;
}

// 3. Fluxo do Formulário do Cliente
function abrirModalPedido() {
    document.getElementById('modal-pedido').style.display = 'block';
    document.getElementById('passo-cliente').style.display = 'block';
    document.getElementById('passo-itens').style.display = 'none';
    document.getElementById('passo-resumo').style.display = 'none';
}

function fecharModalPedido() {
    document.getElementById('modal-pedido').style.display = 'none';
}

function iniciarSelecaoItens() {
    const nome = document.getElementById('cliente-nome').value.trim();
    const telefone = document.getElementById('cliente-telefone').value.trim();
    const endereco = document.getElementById('cliente-endereco').value.trim();
    const quantidade = parseInt(document.getElementById('cliente-qtd').value) || 1;

    if (!nome || !telefone || !endereco) {
        alert('Por favor, preencha todos os campos do endereço e contato.');
        return;
    }

    clienteInfo = { nome, telefone, endereco, quantidade };
    pedidoAtualIndex = 0;
    listaPedidos = [];

    document.getElementById('passo-cliente').style.display = 'none';
    document.getElementById('passo-itens').style.display = 'block';

    montarFormularioPedido(pedidoAtualIndex);
}

// Monta a seleção de 1 pedido por vez
function montarFormularioPedido(index) {
    const conteiner = document.getElementById('conteudo-pedido-atual');
    document.getElementById('titulo-pedido-num').innerText = `Pedido ${index + 1} de ${clienteInfo.quantidade}`;

    const guarnicoes = cardapioCompleto.filter(p => p.categoria === 'Guarnição').sort((a,b) => a.nome.localeCompare(b.nome));
    const proteinas = cardapioCompleto.filter(p => p.categoria === 'Proteína').sort((a,b) => a.nome.localeCompare(b.nome));
    const bebidas = cardapioCompleto.filter(p => p.categoria === 'Bebida');
    const sobremesas = cardapioCompleto.filter(p => p.categoria === 'Sobremesa').sort((a,b) => a.nome.localeCompare(b.nome));

    let html = `
        <h3>Guarnições (Escolha até 04)</h3>
        <div class="grupo-checkbox">
            ${guarnicoes.map(g => `<label><input type="checkbox" name="guarnicao" value="${g.nome}" onchange="validarLimites('guarnicao', 4)"> ${g.nome}</label>`).join('')}
        </div>

        <h3>Proteínas (Escolha até 02)</h3>
        <div class="grupo-checkbox">
            ${proteinas.map(p => `<label><input type="checkbox" name="proteina" value="${p.nome}" onchange="validarLimites('proteina', 2)"> ${p.nome}</label>`).join('')}
        </div>

        <h3>Bebidas</h3>
        <div class="grupo-quantidades">
            ${bebidas.map(b => `
                <div class="item-qtd">
                    <span>${b.nome} (R$ ${b.preco.toFixed(2)})</span>
                    <input type="number" id="bebida-${b._id}" data-nome="${b.nome}" data-preco="${b.preco}" value="0" min="0">
                </div>
            `).join('')}
        </div>

        <h3>Sobremesas</h3>
        <div class="grupo-quantidades">
            ${sobremesas.map(s => `
                <div class="item-qtd">
                    <span>${s.nome} (R$ ${s.preco.toFixed(2)})</span>
                    <input type="number" id="sobremesa-${s._id}" data-nome="${s.nome}" data-preco="${s.preco}" value="0" min="0">
                </div>
            `).join('')}
        </div>

        <h3>Observação (Até 90 caracteres):</h3>
        <textarea id="pedido-obs" maxlength="90" placeholder="Ex: Bastante molho, sem cebola..."></textarea>
    `;

    conteiner.innerHTML = html;
}

function validarLimites(nomeCampo, limiteMax) {
    const selecionados = document.querySelectorAll(`input[name="${nomeCampo}"]:checked`);
    if (selecionados.length > limiteMax) {
        alert(`Você só pode escolher até ${limiteMax} opções de ${nomeCampo}.`);
        event.target.checked = false;
    }
}

function salvarPedidoAtual() {
    const guarnicoes = Array.from(document.querySelectorAll('input[name="guarnicao"]:checked')).map(cb => cb.value);
    const proteinas = Array.from(document.querySelectorAll('input[name="proteina"]:checked')).map(cb => cb.value);

    if (guarnicoes.length === 0 || proteinas.length === 0) {
        alert('Selecione pelo menos 1 guarnição e 1 proteína.');
        return;
    }

    // Coleta bebidas e sobremesas selecionadas
    let bebidas = [];
    document.querySelectorAll('[id^="bebida-"]').forEach(input => {
        const qtd = parseInt(input.value) || 0;
        if (qtd > 0) {
            bebidas.push({ nome: input.dataset.nome, preco: parseFloat(input.dataset.preco), qtd });
        }
    });

    let sobremesas = [];
    document.querySelectorAll('[id^="sobremesa-"]').forEach(input => {
        const qtd = parseInt(input.value) || 0;
        if (qtd > 0) {
            sobremesas.push({ nome: input.dataset.nome, preco: parseFloat(input.dataset.preco), qtd });
        }
    });

    const obs = document.getElementById('pedido-obs').value.trim();

    listaPedidos.push({ guarnicoes, proteinas, bebidas, sobremesas, obs });

    pedidoAtualIndex++;
    if (pedidoAtualIndex < clienteInfo.quantidade) {
        montarFormularioPedido(pedidoAtualIndex);
    } else {
        exibirResumoFinal();
    }
}

// 4. Exibir Resumo do Pedido e Botões do WhatsApp
function exibirResumoFinal() {
    document.getElementById('passo-itens').style.display = 'none';
    document.getElementById('passo-resumo').style.display = 'block';

    const textoFormatado = gerarTextoWhatsApp();
    document.getElementById('resumo-texto').innerText = textoFormatado;
}

function gerarTextoWhatsApp() {
    let msg = `${clienteInfo.nome}\n${clienteInfo.telefone}\n${clienteInfo.endereco}\n--------------------------------------------------------------------------------------------------\n`;
    
    let subtotalMarmitas = 0;

    listaPedidos.forEach((ped, idx) => {
        let valorMarmita = PRECO_MARMITA;
        let subtotalPedido = valorMarmita;

        msg += `Pedido 0${idx + 1}:\n`;
        ped.proteinas.forEach(p => msg += `01 ${p}\n`);
        ped.guarnicoes.forEach(g => msg += `${g}\n`);
        msg += `R$${valorMarmita.toFixed(2)}\n`;

        ped.bebidas.forEach(b => {
            const totalItem = b.preco * b.qtd;
            subtotalPedido += totalItem;
            msg += `0${b.qtd} ${b.nome}\nR$${totalItem.toFixed(2)}\n`;
        });

        ped.sobremesas.forEach(s => {
            const totalItem = s.preco * s.qtd;
            subtotalPedido += totalItem;
            msg += `0${s.qtd} ${s.nome}\nR$${totalItem.toFixed(2)}\n`;
        });

        if (ped.obs) {
            msg += `Obs: ${ped.obs}\n`;
        }

        msg += `----------------------------------------------------------------------------------------------------\n`;
        msg += `Sub-total 0${idx + 1} = R$${subtotalPedido.toFixed(2)}\n`;
        msg += `----------------------------------------------------------------------------------------------------\n\n`;

        subtotalMarmitas += subtotalPedido;
    });

    listaPedidos.forEach((_, idx) => {
        msg += `Marmita 0${idx + 1} = R$ ${listaPedidos[idx] ? PRECO_MARMITA.toFixed(2) : '0.00'}\n`;
    });

    const totalFinal = subtotalMarmitas + TAXA_ENTREGA;
    msg += `Taxa de entrega R$ ${TAXA_ENTREGA.toFixed(2)}\n`;
    msg += `Total final R$ ${totalFinal.toFixed(2)}\n`;
    msg += `-------------------------------------------------------------------------------------------------------`;

    return msg;
}

// Envio 1: Para o WhatsApp do Restaurante
function enviarParaRestaurante() {
    const texto = encodeURIComponent(gerarTextoWhatsApp());
    window.open(`https://wa.me/${NUMERO_RESTAURANTE}?text=${texto}`, '_blank');
}

// Envio 2: Cópias para o WhatsApp do Cliente
function enviarParaCliente() {
    let telLimpo = clienteInfo.telefone.replace(/\D/g, '');
    if (!telLimpo.startsWith('55')) {
        telLimpo = '55' + telLimpo;
    }
    const texto = encodeURIComponent(gerarTextoWhatsApp());
    window.open(`https://wa.me/${telLimpo}?text=${texto}`, '_blank');
    
    alert('Pedido concluído!');
    fecharModalPedido();
}