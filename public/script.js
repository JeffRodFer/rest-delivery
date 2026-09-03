document.addEventListener('DOMContentLoaded', () => {
  // Estado Global do Cliente
  let appState = {
    config: {},
    menu: { sides: [], proteins: [], drinks: [], desserts: [] },
    userRole: null, // 'admin' | 'gerente' | null
    currentStep: 0,
    customerInfo: { name: '', phone: '', address: '', totalOrders: 1 },
    orders: [] // Array com as escolhas de cada marmita
  };

  // Inicialização
  initClock();
  fetchData();

  // Relógio BRT
  function initClock() {
    const clockEl = document.getElementById('brt-clock');
    const update = () => {
      const now = new Date();
      const options = { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium' };
      clockEl.textContent = new Intl.DateTimeFormat('pt-BR', options).format(now) + ' BRT';
    };
    update();
    setInterval(update, 1000);
  }

  // Carregar Dados Iniciais
  async function fetchData() {
    try {
      const res = await fetch('/api/public/data');
      const data = await res.json();
      appState.config = data.config;
      appState.menu = data.menu;

      document.getElementById('display-pix-key').textContent = data.config.pixKey;
      document.getElementById('btn-floating-whatsapp').href = `https://wa.me/${data.config.whatsappNumber}`;
      
      renderDrawerMenu();
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    }
  }

  // Drawer Lateral
  const drawer = document.getElementById('menu-drawer');
  document.getElementById('toggle-drawer-btn').addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  function renderDrawerMenu() {
    const container = document.getElementById('preview-content');
    
    const renderList = (items) => items
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(i => `<li class="${i.available ? '' : 'unavailable'}">${i.name} ${i.price ? `- R$ ${i.price.toFixed(2)}` : ''} ${i.available ? '' : '(Indisponível)'}</li>`)
      .join('');

    container.innerHTML = `
      <h4>Guarnições</h4><ul>${renderList(appState.menu.sides)}</ul>
      <h4>Proteínas</h4><ul>${renderList(appState.menu.proteins)}</ul>
      <h4>Bebidas</h4><ul>${renderList(appState.menu.drinks)}</ul>
      <h4>Sobremesas</h4><ul>${renderList(appState.menu.desserts)}</ul>
    `;
  }

  // --- GERENCIAMENTO DE MODAIS ---
  const modalOrder = document.getElementById('modal-order');
  const modalManage = document.getElementById('modal-manage');

  document.getElementById('btn-start-order').onclick = () => {
    startOrderWizard();
    modalOrder.style.display = 'flex';
  };
  document.getElementById('close-order-modal').onclick = () => modalOrder.style.display = 'none';

  document.getElementById('btn-open-manage').onclick = () => modalManage.style.display = 'flex';
  document.getElementById('close-manage-modal').onclick = () => modalManage.style.display = 'none';

  // --- FLUXO DO PEDIDO (WIZARD) ---
  function startOrderWizard() {
    appState.currentStep = 1;
    appState.orders = [];
    renderWizardStep();
  }

  function renderWizardStep() {
    const container = document.getElementById('order-wizard-container');
    const { currentStep, customerInfo } = appState;

    if (currentStep === 1) {
      // Passo 1: Informações Iniciais
      container.innerHTML = `
        <h3 class="wizard-step-title">Passo 1: Seus Dados</h3>
        <form id="form-step-1">
          <div class="form-group">
            <label>Nome Completo:</label>
            <input type="text" id="cust-name" value="${customerInfo.name}" required>
          </div>
          <div class="form-group">
            <label>Telefone / WhatsApp:</label>
            <input type="tel" id="cust-phone" value="${customerInfo.phone}" required>
          </div>
          <div class="form-group">
            <label>Endereço de Entrega:</label>
            <input type="text" id="cust-address" value="${customerInfo.address}" required>
          </div>
          <div class="form-group">
            <label>Quantidade de Pedidos (Marmitas):</label>
            <input type="number" id="cust-qty" min="1" max="10" value="${customerInfo.totalOrders}" required>
          </div>
          <button type="submit" class="btn-primary">Próximo ➔</button>
        </form>
      `;

      document.getElementById('form-step-1').onsubmit = (e) => {
        e.preventDefault();
        appState.customerInfo.name = sanitize(document.getElementById('cust-name').value);
        appState.customerInfo.phone = sanitize(document.getElementById('cust-phone').value);
        appState.customerInfo.address = sanitize(document.getElementById('cust-address').value);
        appState.customerInfo.totalOrders = parseInt(document.getElementById('cust-qty').value);
        
        // Inicializar estrutura de pedidos
        appState.orders = Array.from({ length: appState.customerInfo.totalOrders }, () => ({
          sides: [],
          proteins: [],
          drinks: {},
          desserts: {},
          obs: ''
        }));

        appState.currentStep = 2; // Inicia os pedidos sequenciais
        renderWizardStep();
      };
      return;
    }

    const totalOrders = appState.customerInfo.totalOrders;
    const orderIndex = currentStep - 2;

    if (orderIndex < totalOrders) {
      // Passos 2 a N: Seleção do Pedido X
      const currentOrder = appState.orders[orderIndex];
      const availSides = appState.menu.sides.filter(i => i.available).sort((a,b) => a.name.localeCompare(b.name));
      const availProteins = appState.menu.proteins.filter(i => i.available).sort((a,b) => a.name.localeCompare(b.name));
      const availDrinks = appState.menu.drinks.filter(i => i.available);
      const availDesserts = appState.menu.desserts.filter(i => i.available);

      container.innerHTML = `
        <h3 class="wizard-step-title">Marmita ${orderIndex + 1} de ${totalOrders}</h3>
        
        <p><strong>Guarnições (Até 04):</strong></p>
        <div class="checkbox-group" id="group-sides">
          ${availSides.map(s => `
            <label class="checkbox-item">
              <input type="checkbox" value="${s.name}" ${currentOrder.sides.includes(s.name) ? 'checked' : ''}>
              ${s.name}
            </label>
          `).join('')}
        </div>

        <p><strong>Proteínas (Até 02):</strong></p>
        <div class="checkbox-group" id="group-proteins">
          ${availProteins.map(p => `
            <label class="checkbox-item">
              <input type="checkbox" value="${p.name}" ${currentOrder.proteins.includes(p.name) ? 'checked' : ''}>
              ${p.name}
            </label>
          `).join('')}
        </div>

        <p><strong>Bebidas:</strong></p>
        <div class="counter-list">
          ${availDrinks.map(d => `
            <div class="counter-item">
              <span>${d.name} (R$ ${d.price.toFixed(2)})</span>
              <div class="counter-controls">
                <button type="button" class="btn-counter" onclick="adjustCount('drink', '${d.name}', -1, ${orderIndex})">-</button>
                <span id="cnt-drink-${orderIndex}-${d.name}">${currentOrder.drinks[d.name] || 0}</span>
                <button type="button" class="btn-counter" onclick="adjustCount('drink', '${d.name}', 1, ${orderIndex})">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <p style="margin-top:10px;"><strong>Sobremesas:</strong></p>
        <div class="counter-list">
          ${availDesserts.map(e => `
            <div class="counter-item">
              <span>${e.name} (R$ ${e.price.toFixed(2)})</span>
              <div class="counter-controls">
                <button type="button" class="btn-counter" onclick="adjustCount('dessert', '${e.name}', -1, ${orderIndex})">-</button>
                <span id="cnt-dessert-${orderIndex}-${e.name}">${currentOrder.desserts[e.name] || 0}</span>
                <button type="button" class="btn-counter" onclick="adjustCount('dessert', '${e.name}', 1, ${orderIndex})">+</button>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="form-group" style="margin-top: 15px;">
          <label>Observações (máx. 90 carac.):</label>
          <textarea id="order-obs" maxlength="90" rows="2">${currentOrder.obs}</textarea>
        </div>

        <button id="btn-next-order" class="btn-primary">
          ${orderIndex + 1 === totalOrders ? 'Ir para Resumo Final' : 'Próxima Marmita ➔'}
        </button>
      `;

      // Controle de Limites em tempo real para Checkboxes
      setupLimitCheckboxes('group-sides', 4);
      setupLimitCheckboxes('group-proteins', 2);

      document.getElementById('btn-next-order').onclick = () => {
        // Capturar Seleções
        const selectedSides = Array.from(document.querySelectorAll('#group-sides input:checked')).map(cb => cb.value);
        const selectedProteins = Array.from(document.querySelectorAll('#group-proteins input:checked')).map(cb => cb.value);
        
        if (selectedSides.length === 0 || selectedProteins.length === 0) {
          alert('Por favor, selecione ao menos 1 guarnição e 1 proteína.');
          return;
        }

        currentOrder.sides = selectedSides;
        currentOrder.proteins = selectedProteins;
        currentOrder.obs = sanitize(document.getElementById('order-obs').value);

        appState.currentStep++;
        renderWizardStep();
      };

      return;
    }

    // Passo Final: Resumo
    renderSummaryStep(container);
  }

  // Incremento / Decremento de Bebidas e Sobremesas
  window.adjustCount = (type, item, delta, orderIndex) => {
    const order = appState.orders[orderIndex];
    const target = type === 'drink' ? order.drinks : order.desserts;
    const current = target[item] || 0;
    const updated = Math.max(0, current + delta);
    
    if (updated === 0) delete target[item];
    else target[item] = updated;

    document.getElementById(`cnt-${type}-${orderIndex}-${item}`).textContent = updated;
  };

  function setupLimitCheckboxes(groupId, max) {
    const container = document.getElementById(groupId);
    container.addEventListener('change', () => {
      const checked = container.querySelectorAll('input:checked');
      if (checked.length > max) {
        alert(`Você pode selecionar no máximo ${max} itens.`);
        event.target.checked = false;
      }
    });
  }

  // Renderização e Formatação da Mensagem de Resumo
  function buildFormattedMessage() {
    const { customerInfo, orders, config } = appState;
    let message = `${customerInfo.name}\n${customerInfo.phone}\n${customerInfo.address}\n`;
    const separator = "--------------------------------------------------------------------------------------------------\n";
    
    let grandTotal = 0;
    let totalsList = [];

    orders.forEach((ord, idx) => {
      message += separator;
      message += `Pedido 0${idx + 1}:\n`;
      
      ord.proteins.forEach(p => message += `01 ${p}\n`);
      ord.sides.forEach(s => message += `${s}\n`);
      
      let subTotal = config.marmitaPrice;
      message += `R$${config.marmitaPrice.toFixed(2).replace('.', ',')}\n`;

      // Bebidas
      for (const [drink, qty] of Object.entries(ord.drinks)) {
        const itemObj = appState.menu.drinks.find(d => d.name === drink);
        const itemPrice = itemObj ? itemObj.price * qty : 0;
        subTotal += itemPrice;
        message += `0${qty} ${drink}\nR$${itemPrice.toFixed(2).replace('.', ',')}\n`;
      }

      // Sobremesas
      for (const [dessert, qty] of Object.entries(ord.desserts)) {
        const itemObj = appState.menu.desserts.find(e => e.name === dessert);
        const itemPrice = itemObj ? itemObj.price * qty : 0;
        subTotal += itemPrice;
        message += `0${qty} ${dessert}\nR$${itemPrice.toFixed(2).replace('.', ',')}\n`;
      }

      if (ord.obs) message += `Obs: ${ord.obs}\n`;
      
      message += "----------------------------------------------------------------------------------------------------\n";
      message += `Sub-total 0${idx + 1} = R$${subTotal.toFixed(2).replace('.', ',')}\n`;

      totalsList.push({ idx: idx + 1, val: subTotal });
      grandTotal += subTotal;
    });

    message += "-------------------------------------------------------------------------------------------------------\n";
    totalsList.forEach(t => {
      message += `Marmita 0${t.idx} = R$ ${t.val.toFixed(2).replace('.', ',')}\n`;
    });

    grandTotal += config.deliveryFee;
    message += `Taxa de entrega R$ ${config.deliveryFee.toFixed(2).replace('.', ',')}\n`;
    message += `Total final R$ ${grandTotal.toFixed(2).replace('.', ',')}\n`;
    message += "-------------------------------------------------------------------------------------------------------\n";

    return message;
  }

  function renderSummaryStep(container) {
    const message = buildFormattedMessage();

    container.innerHTML = `
      <h3 class="wizard-step-title">Resumo do Pedido</h3>
      <div class="summary-box">${message}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button id="btn-send-restaurant" class="btn-primary">1. Enviar Pedido ao Restaurante</button>
        <button id="btn-send-copy" class="btn-secondary">2. Enviar Cópia para o Meu WhatsApp</button>
        <button id="btn-restart" class="btn-secondary-sm" style="margin-top:10px;">Refazer Pedido</button>
      </div>
    `;

    const encodedMsg = encodeURIComponent(message);

    document.getElementById('btn-send-restaurant').onclick = () => {
      window.open(`https://wa.me/${appState.config.whatsappNumber}?text=${encodedMsg}`, '_blank');
    };

    document.getElementById('btn-send-copy').onclick = () => {
      const cleanPhone = appState.customerInfo.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}?text=${encodedMsg}`, '_blank');
    };

    document.getElementById('btn-restart').onclick = () => startOrderWizard();
  }

  // --- PAINEL DE GERENCIAMENTO & AUTENTICAÇÃO ---
  const formLogin = document.getElementById('form-login');
  
  formLogin.onsubmit = async (e) => {
    e.preventDefault();
    const username = sanitize(document.getElementById('login-user').value);
    const password = document.getElementById('login-pass').value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      appState.userRole = data.role;
      setupManagementPanel();
    } catch (err) {
      alert(err.message);
    }
  };

  document.getElementById('btn-logout').onclick = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    appState.userRole = null;
    document.getElementById('manage-panel-view').classList.add('hidden');
    document.getElementById('manage-login-view').classList.remove('hidden');
  };

  function setupManagementPanel() {
    document.getElementById('manage-login-view').classList.add('hidden');
    document.getElementById('manage-panel-view').classList.remove('hidden');
    document.getElementById('panel-role-title').textContent = `Painel (${appState.userRole.toUpperCase()})`;

    const adminSection = document.getElementById('admin-only-section');
    if (appState.userRole === 'admin') {
      adminSection.classList.remove('hidden');
      document.getElementById('cfg-marmita-price').value = appState.config.marmitaPrice;
      document.getElementById('cfg-delivery-fee').value = appState.config.deliveryFee;
      document.getElementById('cfg-pix-key').value = appState.config.pixKey;
      document.getElementById('cfg-whatsapp').value = appState.config.whatsappNumber;
    } else {
      adminSection.classList.add('hidden');
    }

    renderMenuManageTab('sides');
  }

  // Salvar Configurações Admin
  document.getElementById('form-admin-config').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      marmitaPrice: document.getElementById('cfg-marmita-price').value,
      deliveryFee: document.getElementById('cfg-delivery-fee').value,
      pixKey: document.getElementById('cfg-pix-key').value,
      whatsappNumber: document.getElementById('cfg-whatsapp').value
    };

    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      alert('Configurações salvas!');
      fetchData();
    }
  };

  // Alterar Senhas
  document.getElementById('form-change-pass').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('pass-user-select').value;
    const newPassword = document.getElementById('pass-new-val').value;

    const res = await fetch('/api/admin/users/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword })
    });

    const data = await res.json();
    alert(data.message || data.error);
  };

  // Tabs de Gestão do Cardápio
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const tabKey = e.target.dataset.tab.replace('tab-', '');
      renderMenuManageTab(tabKey);
    };
  });

  function renderMenuManageTab(category) {
    const container = document.getElementById('tab-menu-manage');
    const items = appState.menu[category] || [];
    const isAdmin = appState.userRole === 'admin';
    const isEditablePrice = ['drinks', 'desserts'].includes(category);

    container.innerHTML = items.map(item => `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #eee;">
        <span>${item.name}</span>
        <div style="display:flex; gap:10px; align-items:center;">
          ${isAdmin && isEditablePrice ? `
            <input type="number" step="0.5" value="${item.price}" style="width:70px;" onchange="updatePrice('${category}', '${item.id}', this.value)">
          ` : ''}
          <button class="${item.available ? 'btn-primary-sm' : 'btn-secondary-sm'}" onclick="toggleAvailability('${category}', '${item.id}', ${!item.available})">
            ${item.available ? 'Disponível' : 'Indisponível'}
          </button>
        </div>
      </div>
    `).join('');
  }

  window.toggleAvailability = async (category, id, available) => {
    const res = await fetch('/api/admin/menu/availability', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, id, available })
    });

    if (res.ok) {
      await fetchData();
      renderMenuManageTab(category);
    }
  };

  window.updatePrice = async (category, id, price) => {
    await fetch('/api/admin/menu/price', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, id, price })
    });
    await fetchData();
  };

  // Utilitário de Sanitização XSS
  function sanitize(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
  }
});