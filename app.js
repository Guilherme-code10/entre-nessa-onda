import { validarLogin, obterStatusDisponibilidade } from './regras.js';

(() => {
  const screens = ['login', 'cadastro', 'escala', 'resultado', 'admin'];
  const el = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const STOCK_KEY = 'entre_nessa_onda_stock_demo_v1';
  const PEOPLE_KEY = 'entre_nessa_onda_volunteers_demo_v1';
  const defaultStock = [
    { id: 'demo-1', name: 'Bolas e materiais recreativos', category: 'Recreação', qty: 12, min: 5 },
    { id: 'demo-2', name: 'Lápis de cor e canetinhas', category: 'Papelaria', qty: 8, min: 10 },
    { id: 'demo-3', name: 'Brinquedos educativos', category: 'Recreação', qty: 6, min: 4 },
    { id: 'demo-4', name: 'Copos descartáveis (pacotes)', category: 'Alimentação', qty: 3, min: 5 }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  let stock = readStore(STOCK_KEY, defaultStock);
  let people = readStore(PEOPLE_KEY, []);
  if (!Array.isArray(stock)) stock = clone(defaultStock);
  if (!Array.isArray(people)) people = [];
  let status = 'pendente';

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? clone(fallback) : JSON.parse(raw);
    } catch (_) {
      return clone(fallback);
    }
  }

  function saveStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { return false; }
  }

  function go(screen) {
    screens.forEach(x => el('screen-' + x).classList.toggle('active', x === screen));
    try { history.replaceState(null, '', '?tela=' + screen); } catch (_) {}
    if (typeof scrollTo === 'function') scrollTo(0, 0);
    document.title = 'Entre Nessa Onda — ' + ({
      login: 'Entrada', cadastro: 'Cadastro demonstrativo',
      escala: 'Minhas escalas', resultado: 'Resultado',
      admin: 'Administração demonstrativa'
    }[screen]);
    if (screen === 'admin') renderAdmin();
  }

  function view(tab) {
    const calendar = tab === 'calendar';
    el('calendar-view').hidden = !calendar;
    el('participations-view').hidden = calendar;
    el('tab-calendar').classList.toggle('selected', calendar);
    el('btn-my-scales').classList.toggle('selected', !calendar);
    el('tab-calendar').setAttribute('aria-pressed', String(calendar));
    el('btn-my-scales').setAttribute('aria-pressed', String(!calendar));
    el('side-calendar').classList.toggle('active', calendar);
    el('side-participations').classList.toggle('active', !calendar);
    el('nav-calendar').classList.toggle('current', calendar);
    el('nav-my').classList.toggle('current', !calendar);
    go('escala');
  }

  function selectDay(day) {
    document.querySelectorAll('.day[data-day]').forEach(button => {
      const selected = Number(button.dataset.day) === day;
      button.classList.toggle('selected', selected);
      if (selected) button.setAttribute('aria-current', 'date');
      else button.removeAttribute('aria-current');
    });
    el('activity-panel').hidden = day !== 14;
    el('empty-day').hidden = day === 14;
    if (day !== 14)
      el('empty-day-message').textContent = 'Nenhuma atividade cadastrada para ' + day + ' de novembro nesta demonstração.';
  }

  function updateResult(confirmed) {
    status = obterStatusDisponibilidade(confirmed);
    const name = confirmed ? 'Confirmada' : 'Recusada';
    const klass = 'pill ' + (confirmed ? 'confirmed' : 'no');
    el('escala-status').className = klass;
    el('escala-status').textContent = confirmed ? '✓ Confirmada' : '✕ Recusada';
    el('participation-status').className = klass;
    el('participation-status').textContent = confirmed ? '✓ Confirmada' : '✕ Recusada';
    el('result-title').textContent = confirmed ? 'Disponibilidade confirmada!' : 'Resposta registrada';
    el('result-description').textContent = confirmed
      ? 'Sua resposta foi registrada nesta demonstração. A equipe poderá considerar a confirmação no planejamento futuro.'
      : 'Você informou que não poderá participar desta ação. Na versão completa, a coordenação poderá reorganizar a escala.';
    el('result-pill').className = klass;
    el('result-pill').textContent = (confirmed ? '✓ ' : '✕ ') + 'Status: ' + name;
    el('result-status').textContent = name;
    el('result-status').style.color = confirmed ? '#146544' : '#A13F3F';
    go('resultado');
    el('result-title').focus();
  }

  function feedback(id, message, error = false) {
    const target = el(id);
    target.textContent = message;
    target.hidden = false;
    target.classList.toggle('error', error);
  }

  function create(tag, klass, text) {
    const node = document.createElement(tag);
    if (klass) node.className = klass;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function safeInteger(input) {
    const value = Number(input);
    return Number.isSafeInteger(value) && value >= 0 && value <= 99999 ? value : null;
  }

  function renderInventory() {
    const list = el('inventory-list');
    list.replaceChildren();
    stock.forEach(item => {
      const qty = safeInteger(item.qty);
      const min = safeInteger(item.min);
      if (qty === null || min === null) return;
      const row = create('div', 'inventory-row');
      const details = create('div');
      details.append(create('strong', '', item.name), create('small', '', item.category + ' • Mínimo: ' + min));
      const number = create('span', 'stock-number' + (qty <= min ? ' low' : ''), qty);
      number.setAttribute('aria-label', qty + ' unidades');
      const actions = create('div', 'stock-stepper');
      const minus = create('button', '', '−');
      minus.type = 'button'; minus.setAttribute('aria-label', 'Retirar uma unidade de ' + item.name);
      minus.disabled = qty === 0;
      minus.addEventListener('click', () => changeQuantity(item.id, -1));
      const plus = create('button', '', '+');
      plus.type = 'button'; plus.setAttribute('aria-label', 'Adicionar uma unidade de ' + item.name);
      plus.disabled = qty >= 99999;
      plus.addEventListener('click', () => changeQuantity(item.id, 1));
      const remove = create('button', 'stock-delete', '×');
      remove.type = 'button'; remove.setAttribute('aria-label', 'Remover ' + item.name + ' do estoque');
      remove.addEventListener('click', () => {
        if (typeof confirm === 'function' && !confirm('Remover o material "' + item.name + '" desta demonstração?')) return;
        stock = stock.filter(x => x.id !== item.id);
        saveStore(STOCK_KEY, stock); renderAdmin();
      });
      actions.append(minus, plus, remove);
      row.append(details, number, actions);
      list.append(row);
    });
    if (!list.children.length) list.append(create('p', 'inventory-empty', 'Ainda não existem materiais cadastrados nesta demonstração.'));
    el('stat-products').textContent = String(stock.length);
    el('stat-units').textContent = String(stock.reduce((sum, x) => sum + (safeInteger(x.qty) || 0), 0));
    el('stat-low').textContent = String(stock.filter(x => x.qty <= x.min).length);
  }

  function changeQuantity(id, change) {
    const item = stock.find(x => x.id === id);
    if (!item) return;
    const quantity = safeInteger(Number(item.qty) + change);
    if (quantity === null) return;
    item.qty = quantity;
    saveStore(STOCK_KEY, stock);
    renderInventory();
  }

  function renderPeople() {
    const list = el('volunteer-list');
    list.replaceChildren();
    people.forEach(person => {
      const row = create('div', 'volunteer-row');
      const detail = create('div');
      detail.append(create('strong', '', person.name), create('small', '', (person.area || 'Apoio geral') + ' • ' + person.email));
      const remove = create('button', '', 'Excluir');
      remove.type = 'button'; remove.setAttribute('aria-label', 'Excluir cadastro de teste de ' + person.name);
      remove.addEventListener('click', () => {
        people = people.filter(x => x.id !== person.id);
        saveStore(PEOPLE_KEY, people);
        renderAdmin();
      });
      row.append(detail, remove);
      list.append(row);
    });
    if (!people.length) list.append(create('p', 'volunteer-empty', 'Nenhum cadastro de teste neste navegador. Use a página Cadastro para experimentar.'));
    el('stat-volunteers').textContent = String(people.length);
  }

  function renderAdmin() {
    renderInventory();
    renderPeople();
  }

  el('login-form').addEventListener('submit', event => {
    event.preventDefault();
    const valid = validarLogin(el('email').checkValidity(), el('password').value);
    el('login-error').classList.toggle('show', !valid);
    if (valid) view('calendar');
    else (el('email').checkValidity() ? el('password') : el('email')).focus();
  });

  el('toggle-password').addEventListener('click', () => {
    const input = el('password');
    input.type = input.type === 'password' ? 'text' : 'password';
    el('toggle-password').textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
    el('toggle-password').setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  });
  el('btn-confirm').addEventListener('click', () => updateResult(true));
  el('btn-decline').addEventListener('click', () => updateResult(false));
  ['result-back', 'btn-back-calendar', 'btn-view-scales'].forEach(id =>
    el(id).addEventListener('click', () => view('calendar')));
  ['btn-my-scales', 'side-participations', 'nav-my'].forEach(id =>
    el(id).addEventListener('click', () => view('participations')));
  ['tab-calendar', 'side-calendar', 'nav-calendar', 'participations-back'].forEach(id =>
    el(id).addEventListener('click', () => view('calendar')));
  ['nav-exit', 'side-logout', 'register-back', 'admin-back'].forEach(id =>
    el(id).addEventListener('click', () => go('login')));
  ['go-register', 'side-register', 'admin-new-volunteer'].forEach(id =>
    el(id).addEventListener('click', () => go('cadastro')));
  ['go-admin', 'side-admin'].forEach(id =>
    el(id).addEventListener('click', () => go('admin')));
  ['prev-month', 'next-month'].forEach(id =>
    el(id).addEventListener('click', () => alert('Esta demonstração apresenta somente novembro de 2026.')));
  document.querySelectorAll('.day[data-day]').forEach(button =>
    button.addEventListener('click', () => selectDay(Number(button.dataset.day))));
  el('back-to-event').addEventListener('click', () => selectDay(14));

  el('volunteer-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = el('volunteer-form');
    if (!form.reportValidity()) return;
    const name = el('reg-name').value.trim();
    const email = el('reg-email').value.trim().toLowerCase();
    const phone = el('reg-phone').value.trim();
    const area = el('reg-area').value;
    if (name.length < 3 || !email || !area || !el('reg-consent').checked) {
      feedback('register-feedback', 'Preencha os campos obrigatórios e confirme que entendeu a demonstração.', true);
      return;
    }
    if (people.some(p => p.email === email)) {
      feedback('register-feedback', 'Já existe um cadastro de teste com este e-mail neste navegador.', true);
      return;
    }
    const next = [...people, { id: String(Date.now()) + '-' + String(Math.random()).slice(2), name, email, phone, area }];
    if (!saveStore(PEOPLE_KEY, next)) {
      feedback('register-feedback', 'Não foi possível salvar neste navegador. Confira se o armazenamento local está habilitado.', true);
      return;
    }
    people = next;
    form.reset();
    feedback('register-feedback', 'Cadastro de TESTE salvo apenas neste navegador. A coordenação do projeto não recebeu estes dados.');
  });

  el('stock-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = el('stock-form');
    if (!form.reportValidity()) return;
    const name = el('stock-name').value.trim();
    const qty = safeInteger(el('stock-qty').value);
    const min = safeInteger(el('stock-min').value);
    if (name.length < 2 || qty === null || min === null) {
      feedback('stock-feedback', 'Confira o nome e as quantidades informadas.', true);
      return;
    }
    if (stock.some(x => x.name.toLowerCase() === name.toLowerCase())) {
      feedback('stock-feedback', 'Já existe um material com este nome.', true);
      return;
    }
    const next = [...stock, { id: 'item-' + Date.now() + '-' + Math.random(), name, category: el('stock-category').value, qty, min }];
    if (!saveStore(STOCK_KEY, next)) {
      feedback('stock-feedback', 'Não foi possível salvar o estoque neste navegador.', true);
      return;
    }
    stock = next;
    form.reset();
    feedback('stock-feedback', 'Material de teste adicionado neste navegador.');
    renderAdmin();
  });

  el('reset-demo-stock').addEventListener('click', () => {
    if (typeof confirm === 'function' && !confirm('Restaurar os materiais fictícios? Isso substitui os itens cadastrados neste navegador.')) return;
    stock = clone(defaultStock);
    saveStore(STOCK_KEY, stock);
    renderAdmin();
  });
  el('clear-demo-people').addEventListener('click', () => {
    if (!people.length) return;
    if (typeof confirm === 'function' && !confirm('Apagar todos os cadastros de teste deste navegador?')) return;
    people = [];
    saveStore(PEOPLE_KEY, people);
    renderAdmin();
  });

  const entry = params.get('tela');
  go(screens.includes(entry) ? entry : 'login');
})();
