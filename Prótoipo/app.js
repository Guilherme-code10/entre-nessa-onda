import { validarLogin, obterStatusDisponibilidade } from './regras.js';

(() => {
  const screens = ['login', 'cadastro', 'escala', 'resultado', 'admin'];
  const el = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const STOCK_KEY = 'entre_nessa_onda_stock_demo_v1';
  const PEOPLE_KEY = 'entre_nessa_onda_volunteers_demo_v1';
  const EVENT_KEY = 'entre_nessa_onda_events_demo_v1';
  const RESPONSE_KEY = 'entre_nessa_onda_event_responses_demo_v1';
  const DEMO_EVENT_ID = 'demo-event-14';
  const defaultEvents = [{
    id: DEMO_EVENT_ID,
    title: 'Tarde de Brincadeiras',
    date: '2026-11-14', start: '09:00', end: '13:00',
    place: 'Centro Comunitário Exemplo', sector: 'Recreação',
    role: 'Apoio às atividades',
    description: 'Uma tarde de acolhimento, jogos e muita alegria com as crianças da comunidade.',
    slots: null
  }];
  const defaultStock = [
    { id: 'demo-1', name: 'Bolas e materiais recreativos', category: 'Recreação', qty: 12, min: 5 },
    { id: 'demo-2', name: 'Lápis de cor e canetinhas', category: 'Papelaria', qty: 8, min: 10 },
    { id: 'demo-3', name: 'Brinquedos educativos', category: 'Recreação', qty: 6, min: 4 },
    { id: 'demo-4', name: 'Copos descartáveis (pacotes)', category: 'Alimentação', qty: 3, min: 5 }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  let stock = readStore(STOCK_KEY, defaultStock);
  let people = readStore(PEOPLE_KEY, []);
  let events = readStore(EVENT_KEY, defaultEvents);
  let responses = readStore(RESPONSE_KEY, {});
  if (!Array.isArray(stock)) stock = clone(defaultStock);
  if (!Array.isArray(people)) people = [];
  if (!Array.isArray(events)) events = clone(defaultEvents);
  events = events.filter(event => event && typeof event.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') && typeof event.title === 'string');
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) responses = {};
  let status = 'pendente';
  let viewYear = 2026, viewMonth = 10, selectedDate = '2026-11-14';

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
    renderCalendar();
    renderDay();
    renderParticipations();
    go('escala');
  }


  function dateParts(date) {
    const [y,m,d] = String(date).split('-').map(Number);
    return { y,m,d };
  }

  function dateFromParts(y,m,d) {
    return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const {y,m,d} = dateParts(value);
    const test = new Date(y,m-1,d);
    return test.getFullYear() === y && test.getMonth() === m-1 && test.getDate() === d;
  }

  function formatDate(date, options = {day:'2-digit',month:'short',year:'numeric'}) {
    const {y,m,d} = dateParts(date);
    return new Intl.DateTimeFormat('pt-BR',options).format(new Date(y,m-1,d));
  }

  function eventTime(event) {
    return (event.start || '09:00') + ' às ' + (event.end || '13:00');
  }

  function eventStatus(event) {
    const saved = responses[event.id];
    return saved === 'confirmada' || saved === 'recusada' ? saved : 'pendente';
  }

  function pillFor(event) {
    const selected = eventStatus(event);
    const classes = selected === 'confirmada' ? 'pill confirmed' : selected === 'recusada' ? 'pill no' : 'pill pending';
    const label = selected === 'confirmada' ? '✓ Confirmada' : selected === 'recusada' ? '✕ Recusada' : '● Pendente';
    return create('span', classes, label);
  }

  function renderCalendar() {
    const date = new Date(viewYear,viewMonth,1);
    const month = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(date);
    el('calendar-month-title').textContent = month.charAt(0).toUpperCase() + month.slice(1);
    const grid = el('calendar-day-grid');
    grid.replaceChildren();
    const firstDay = date.getDay();
    const total = new Date(viewYear,viewMonth+1,0).getDate();
    for(let i=0;i<firstDay;i++) grid.append(create('span','calendar-blank'));
    for(let day=1;day<=total;day++){
      const iso = dateFromParts(viewYear,viewMonth+1,day);
      const available = events.some(event => event.date === iso);
      const selected = iso === selectedDate;
      const btn = create('button','day' + (available?' event has-events':'') + (selected?' selected':''), day);
      btn.dataset.day = String(day);
      btn.type = 'button';
      btn.setAttribute('aria-label',formatDate(iso,{day:'numeric',month:'long',year:'numeric'}) + (available?', com atividade':''));
      if(selected)btn.setAttribute('aria-current','date');
      btn.addEventListener('click',()=>selectDay(day));
      grid.append(btn);
    }
    const count = events.filter(event=>{
      const p = dateParts(event.date);
      return p.y === viewYear && p.m === viewMonth + 1;
    }).length;
    el('calendar-legend').textContent = count + (count===1 ? ' atividade cadastrada neste mês' : ' atividades cadastradas neste mês') + ' • pontos amarelos indicam atividades';
  }

  function buildExtraEvent(event){
    const article = create('article','extra-event-card');
    article.dataset.eventId=event.id;
    const date = create('div','extra-event-date','📅 ' + formatDate(event.date,{weekday:'long',day:'numeric',month:'long'}));
    const head = create('div','extra-event-header');
    head.append(create('h2','',event.title),pillFor(event));
    const description = create('p','extra-event-description',event.description || 'Atividade comunitária demonstrativa.');
    const info = create('div','extra-event-info');
    const fields = [
      ['Horário',eventTime(event)],
      ['Local',event.place],
      ['Setor',event.sector],
      ['Função',event.role]
    ];
    if(event.slots)fields.push(['Vagas previstas',event.slots+' voluntários']);
    fields.forEach(([name,value])=>{
      const box=create('div');
      box.append(create('small','',name),create('strong','',value));
      info.append(box);
    });
    const actions=create('div','btn-stack');
    const yes=create('button','primary','✓ Confirmar participação');
    yes.type='button';yes.addEventListener('click',()=>updateResult(true,event));
    const no=create('button','secondary','Não poderei participar');
    no.type='button';no.addEventListener('click',()=>updateResult(false,event));
    actions.append(yes,no);
    article.append(date,head,description,info,actions);
    return article;
  }

  function renderDay() {
    const dayEvents = events.filter(e=>e.date===selectedDate)
      .sort((a,b)=>(a.start||'').localeCompare(b.start||''));
    const demo=dayEvents.find(e=>e.id===DEMO_EVENT_ID);
    el('activity-panel').hidden=!demo;
    const extras=el('extra-events');
    extras.replaceChildren();
    dayEvents.filter(e=>e.id!==DEMO_EVENT_ID).forEach(e=>extras.append(buildExtraEvent(e)));
    const none=dayEvents.length===0;
    el('empty-day').hidden=!none;
    if(none)el('empty-day-message').textContent=
      'Nenhuma atividade cadastrada para '+formatDate(selectedDate,{day:'numeric',month:'long',year:'numeric'})+' nesta demonstração.';
    if(demo){
      el('demo-event-date').textContent=formatDate(demo.date,{weekday:'long',day:'numeric',month:'long'});
      el('demo-event-count').textContent=dayEvents.length + (dayEvents.length===1?' atividade':' atividades');
      el('demo-event-title').textContent=demo.title;
      el('demo-event-description').textContent=demo.description||'Atividade demonstrativa.';
      el('demo-event-time').textContent=eventTime(demo);
      el('demo-event-place').textContent=demo.place;
      el('demo-event-sector').textContent=demo.sector;
      el('demo-event-role').textContent=demo.role;
      const pill=pillFor(demo);
      el('escala-status').className=pill.className;
      el('escala-status').textContent=pill.textContent;
    }
  }

  function renderParticipations(){
    const list=el('participation-records');
    list.replaceChildren();
    const ordered=[...events].sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    ordered.forEach(event=>{
      const row=create('div','participation-record');
      const details=create('div');
      details.append(create('strong','',event.title),create('small','',formatDate(event.date)+' • '+event.sector));
      const pill=pillFor(event);
      if(event.id===DEMO_EVENT_ID)pill.id='participation-status';
      row.append(details,pill);
      list.append(row);
    });
    if(!ordered.length)list.append(create('p','volunteer-empty','Nenhuma atividade cadastrada nesta demonstração.'));
  }

  function selectDay(day) {
    selectedDate=dateFromParts(viewYear,viewMonth+1,day);
    renderCalendar();
    renderDay();
  }

  function jumpToEvent(event){
    const p=dateParts(event.date);
    viewYear=p.y;viewMonth=p.m-1;selectedDate=event.date;
    view('calendar');
  }

  function navigateMonth(delta){
    const d=new Date(viewYear,viewMonth+delta,1);
    viewYear=d.getFullYear();viewMonth=d.getMonth();
    const first=events.find(e=>{const p=dateParts(e.date);return p.y===viewYear && p.m===viewMonth+1;});
    selectedDate=first?first.date:dateFromParts(viewYear,viewMonth+1,1);
    renderCalendar();renderDay();
  }

  function updateResult(confirmed, event=events.find(x=>x.id===DEMO_EVENT_ID)) {
    if(!event)return;
    status=obterStatusDisponibilidade(confirmed);
    responses[event.id]=status;
    saveStore(RESPONSE_KEY,responses);
    const name=confirmed?'Confirmada':'Recusada';
    const klass='pill '+(confirmed?'confirmed':'no');
    if(event.id===DEMO_EVENT_ID){
      el('escala-status').className=klass;
      el('escala-status').textContent=confirmed?'✓ Confirmada':'✕ Recusada';
    }
    el('result-title').textContent=confirmed?'Disponibilidade confirmada!':'Resposta registrada';
    el('result-description').textContent=confirmed
      ? 'Sua resposta foi registrada apenas neste navegador de demonstração, não foi enviada à coordenação.'
      : 'Sua indisponibilidade foi registrada apenas neste navegador de demonstração.';
    el('result-pill').className=klass;
    el('result-pill').textContent=(confirmed?'✓ ':'✕ ')+'Status: '+name;
    el('result-status').textContent=name;
    el('result-status').style.color=confirmed?'#146544':'#A13F3F';
    el('result-event-name').textContent=event.title;
    el('result-event-when').textContent=formatDate(event.date)+' • '+eventTime(event);
    el('result-event-place').textContent=event.place;
    el('result-event-sector').textContent=event.sector;
    el('result-event-role').textContent=event.role;
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

  function renderAdminEvents() {
    const list=el('admin-event-list');
    list.replaceChildren();
    const ordered=[...events].sort((a,b)=>a.date.localeCompare(b.date)||(a.start||'').localeCompare(b.start||''));
    ordered.forEach(event=>{
      const row=create('div','admin-event-row');
      row.dataset.eventId=event.id;
      const p=dateParts(event.date);
      const date=create('div','admin-event-date');
      date.append(create('strong','',p.d),create('span','',new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(new Date(p.y,p.m-1,p.d)).replace('.','').toUpperCase()));
      const info=create('div','admin-event-info');
      info.append(
        create('strong','',event.title),
        create('small','',formatDate(event.date)+' • '+eventTime(event)),
        create('small','',event.place+' • '+event.sector)
      );
      const buttons=create('div','admin-event-actions');
      const see=create('button','','Ver no calendário');
      see.type='button';see.addEventListener('click',()=>jumpToEvent(event));
      const edit=create('button','','Editar');
      edit.type='button';edit.addEventListener('click',()=>editEvent(event));
      const remove=create('button','danger','Excluir');
      remove.type='button';remove.addEventListener('click',()=>deleteEvent(event));
      buttons.append(see,edit,remove);
      info.append(buttons);
      row.append(date,info);
      list.append(row);
    });
    if(!ordered.length)list.append(create('p','volunteer-empty','Nenhum evento cadastrado. Utilize o formulário para criar a primeira ação de teste.'));
    el('stat-events').textContent=String(events.length);
  }

  function resetEventForm() {
    el('event-form').reset();
    el('event-edit-id').value='';
    el('event-form-heading').textContent='Cadastrar novo evento';
    el('event-submit').textContent='Cadastrar evento';
    el('event-cancel-edit').hidden=true;
  }

  function editEvent(event) {
    el('event-edit-id').value=event.id;
    el('event-name').value=event.title;
    el('event-date').value=event.date;
    el('event-start').value=event.start || '';
    el('event-end').value=event.end || '';
    el('event-place').value=event.place || '';
    el('event-sector').value=event.sector || '';
    el('event-role').value=event.role || '';
    el('event-description').value=event.description || '';
    el('event-slots').value=event.slots || '';
    el('event-form-heading').textContent='Editar evento';
    el('event-submit').textContent='Salvar alterações';
    el('event-cancel-edit').hidden=false;
    el('event-feedback').hidden=true;
    el('event-form-heading').scrollIntoView?.({behavior:'smooth',block:'center'});
  }

  function deleteEvent(event) {
    if(typeof confirm==='function' && !confirm('Excluir o evento "'+event.title+'"? Esta exclusão afeta apenas este navegador.')) return;
    const next=events.filter(x=>x.id!==event.id);
    if(!saveStore(EVENT_KEY,next)){
      feedback('event-feedback','Não foi possível salvar a exclusão neste navegador.',true);
      return;
    }
    events=next;
    delete responses[event.id];
    saveStore(RESPONSE_KEY,responses);
    if(el('event-edit-id').value===event.id)resetEventForm();
    renderAdmin();
    renderCalendar();
    renderDay();
    renderParticipations();
  }

  function renderAdmin() {
    renderInventory();
    renderPeople();
    renderAdminEvents();
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
  el('prev-month').addEventListener('click',()=>navigateMonth(-1));
  el('next-month').addEventListener('click',()=>navigateMonth(1));
  el('back-to-event').addEventListener('click',()=>{
    const event=events.find(x=>x.id===DEMO_EVENT_ID)||[...events].sort((a,b)=>a.date.localeCompare(b.date))[0];
    if(event)jumpToEvent(event);
  });

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

  el('event-form').addEventListener('submit', event => {
    event.preventDefault();
    const form=el('event-form');
    if(!form.reportValidity())return;
    const id=el('event-edit-id').value;
    const title=el('event-name').value.trim();
    const date=el('event-date').value;
    const start=el('event-start').value;
    const end=el('event-end').value;
    const place=el('event-place').value.trim();
    const sector=el('event-sector').value;
    const role=el('event-role').value.trim();
    const description=el('event-description').value.trim();
    const rawSlots=el('event-slots').value.trim();
    const slots=rawSlots?Number(rawSlots):null;
    if(title.length<3 || !validDate(date) || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)
      || end<=start || place.length<2 || !sector || role.length<2
      || (rawSlots && (!Number.isSafeInteger(slots) || slots<1 || slots>9999))){
      feedback('event-feedback','Confira os campos obrigatórios. O horário de término deve ser posterior ao início.',true);
      return;
    }
    const item={id: id || 'event-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      title,date,start,end,place,sector,role,description,slots};
    const next=id?events.map(e=>e.id===id?item:e):[...events,item];
    if(id && !events.some(e=>e.id===id)){
      feedback('event-feedback','Este evento não existe mais. Atualize a lista e tente novamente.',true);
      return;
    }
    if(!saveStore(EVENT_KEY,next)){
      feedback('event-feedback','Não foi possível salvar o evento neste navegador. Verifique o armazenamento local.',true);
      return;
    }
    events=next;
    resetEventForm();
    feedback('event-feedback',(id?'Alterações salvas':'Evento cadastrado')+' somente neste navegador. Selecione "Ver no calendário" para conferir.');
    renderAdmin();
    renderCalendar();
    renderDay();
    renderParticipations();
  });
  el('event-cancel-edit').addEventListener('click',()=>{resetEventForm();el('event-feedback').hidden=true;});
  el('admin-open-calendar').addEventListener('click',()=>view('calendar'));

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

  renderCalendar();
  renderDay();
  renderParticipations();
  const entry = params.get('tela');
  go(screens.includes(entry) ? entry : 'login');
})();
