import { validarLogin, obterStatusDisponibilidade } from './regras.js';

(() => {
  const screens = ['login', 'admin-login', 'cadastro', 'escala', 'resultado', 'admin'];
  const el = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const STOCK_KEY = 'entre_nessa_onda_stock_demo_v1';
  const PEOPLE_KEY = 'entre_nessa_onda_volunteers_demo_v1';
  const EVENT_KEY = 'entre_nessa_onda_events_demo_v1';
  const RESPONSE_KEY = 'entre_nessa_onda_event_responses_demo_v1';
  const ASSIGN_KEY = 'entre_nessa_onda_assignments_demo_v1';
  const EVENT_MATERIAL_KEY = 'entre_nessa_onda_event_materials_demo_v1';
  const SECTORS = ['Recreação','Acolhimento','Organização','Materiais','Apoio geral'];
  const DEMO_EVENT_ID = 'demo-event-14';
  const defaultEvents = [{
    id: DEMO_EVENT_ID,
    title: 'Tarde de Brincadeiras',
    date: '2026-11-14', start: '09:00', end: '13:00',
    place: 'Centro Comunitário Exemplo', sector: 'Recreação',
    role: 'Apoio às atividades',
    description: 'Uma tarde de acolhimento, jogos e muita alegria com as crianças da comunidade.',
    slots: null,
    slotsBySector: {'Recreação': 4, 'Acolhimento': 3, 'Organização': 2, 'Materiais': 1, 'Apoio geral': 2}
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
  let assignments = readStore(ASSIGN_KEY, []);
  let eventMaterials = readStore(EVENT_MATERIAL_KEY, []);
  if (!Array.isArray(stock)) stock = clone(defaultStock);
  if (!Array.isArray(people)) people = [];
  if (!Array.isArray(assignments)) assignments = [];
  if (!Array.isArray(eventMaterials)) eventMaterials = [];
  if (!Array.isArray(events)) events = clone(defaultEvents);
  events = events.filter(event => event && typeof event.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') && typeof event.title === 'string');
  if (!responses || typeof responses !== 'object' || Array.isArray(responses)) responses = {};
  let status = 'pendente';
  let currentRole = null;
  let activeVolunteerId = null;
  const batchSelected = new Set();
  const batchOpened = new Set();
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
    if (screen === 'admin' && currentRole !== 'admin') {
      screen = 'admin-login';
    }
    screens.forEach(x => el('screen-' + x).classList.toggle('active', x === screen));
    try { history.replaceState(null, '', '?tela=' + screen); } catch (_) {}
    if (typeof scrollTo === 'function') scrollTo(0, 0);
    document.title = 'Entre Nessa Onda — ' + ({
      login: 'Portal do voluntário', 'admin-login': 'Acesso da coordenação',
      cadastro: 'Cadastro demonstrativo', escala: 'Minhas escalas',
      resultado: 'Resultado', admin: 'Administração demonstrativa'
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
    if(activeVolunteerId){
      const row=assignments.find(a=>a.eventId===event.id&&a.volunteerId===activeVolunteerId);
      return row ? row.status : 'pendente';
    }
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
      const available = events.some(event => event.date === iso && (!activeVolunteerId || assignments.some(a=>a.eventId===event.id&&a.volunteerId===activeVolunteerId)));
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
      if(activeVolunteerId && !assignments.some(a=>a.eventId===event.id&&a.volunteerId===activeVolunteerId))return false;
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
    el('availability-warning').hidden=true;
    const dayEvents = events.filter(e=>e.date===selectedDate && (!activeVolunteerId || assignments.some(a=>a.eventId===e.id&&a.volunteerId===activeVolunteerId)))
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
    const ordered=[...events].filter(event=>!activeVolunteerId || assignments.some(a=>a.eventId===event.id && a.volunteerId===activeVolunteerId)).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
    el('participations-explainer').textContent=activeVolunteerId
      ? 'Estas são as atividades em que você foi escalado neste navegador. Confirme sua participação para ajudar a coordenação.'
      : 'Aqui estão as atividades demonstrativas. Para ver escalas associadas ao seu cadastro, use no login o mesmo e-mail que informou no formulário.';
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
    const assigned=activeVolunteerId && assignments.find(a=>a.eventId===event.id&&a.volunteerId===activeVolunteerId);
    const warning=el('availability-warning');
    warning.hidden=true;
    if(confirmed && assigned && assigned.status==='recusada'){
      const capacity=eventCapacity(event);
      const limit=capacity[assigned.sector];
      if(Object.keys(capacity).length && (!limit || staffingCount(event.id,assigned.sector)>=limit)){
        warning.textContent='Não foi possível reconfirmar: as vagas deste setor estão preenchidas. Fale com a coordenação para verificar uma nova vaga.';
        warning.hidden=false;
        return;
      }
    }
    if(assigned){
      assigned.status=status;
      assigned.attendance='pendente';
      saveStore(ASSIGN_KEY,assignments);
    }else{
      responses[event.id]=status;
      saveStore(RESPONSE_KEY,responses);
    }
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
    renderEventMaterials();
  }

  function whatsappPhone(raw) {
    const digits = String(raw || '').replace(/\D/g,'');
    const national = digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits;
    return /^[1-9]\d9\d{8}$/.test(national) ? '55' + national : null;
  }

  function renderMessageOptions() {
    const select = el('message-event');
    const old = select.value;
    select.replaceChildren();
    const sorted = [...events].sort((a,b)=>a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    sorted.forEach(event => {
      const option=create('option','',event.title+' • '+formatDate(event.date));
      option.value=event.id;
      select.append(option);
    });
    if (sorted.some(x=>x.id===old)) select.value=old;
    if(!sorted.length){
      const placeholder=create('option','','Nenhum evento cadastrado');
      placeholder.value='';
      select.append(placeholder);
    }
    el('message-event').disabled=el('message-kind').value==='general' || !sorted.length;
  }

  function volunteerMessage(person) {
    const firstName=String(person.name || 'voluntário').trim().split(/\s+/)[0];
    const kind=el('message-kind').value;
    if(kind==='general'){
      return 'Olá, '+firstName+'! 💙 Aqui é a equipe do Projeto Entre Nessa Onda. Gostaríamos de conversar com você sobre nossas próximas ações sociais. Podemos falar? 🌊';
    }
    const event=events.find(e=>e.id===el('message-event').value);
    if(!event)return null;
    const fullDate=formatDate(event.date,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const when=fullDate+', das '+event.start+' às '+event.end;
    if(kind==='reminder'){
      return 'Olá, '+firstName+'! 💙 Passando para lembrar da ação "'+event.title+'", que acontece '+when+', em '+event.place+'. Confirme sua disponibilidade com nossa equipe! 🌊 Projeto Entre Nessa Onda.';
    }
    return 'Olá, '+firstName+'! 💙 Aqui é a equipe do Projeto Entre Nessa Onda. Gostaríamos de convidar você para a ação "'+event.title+'", que acontece '+when+', em '+event.place+'. Você gostaria de participar? 🌊';
  }

  function eligibleVolunteers(){
    return people.filter(p => p.whatsappConsent === true && whatsappPhone(p.phone));
  }

  function renderBatchRecipientChoices(){
    const allowed=eligibleVolunteers();
    const permitted=new Set(allowed.map(p=>p.id));
    for(const id of batchSelected) if(!permitted.has(id))batchSelected.delete(id);
    const list=el('multi-recipient-list');
    list.replaceChildren();
    for(const person of allowed){
      const label=create('label','multi-recipient-option');
      const checkbox=create('input');
      checkbox.type='checkbox';
      checkbox.value=person.id;
      checkbox.checked=batchSelected.has(person.id);
      checkbox.setAttribute('aria-label','Selecionar '+person.name+' para preparar mensagem');
      checkbox.addEventListener('change',()=>{
        if(checkbox.checked)batchSelected.add(person.id);
        else {batchSelected.delete(person.id);batchOpened.delete(person.id);}
        renderBatchWhatsAppLinks();
      });
      const info=create('span');
      info.append(create('strong','',person.name),create('small','',person.area||'Voluntário'));
      label.append(checkbox,info);
      list.append(label);
    }
    if(!allowed.length)list.append(create('p','multi-recipient-empty','Nenhum voluntário tem número válido com autorização para receber mensagens. Cadastre um contato de teste com consentimento.'));
    renderBatchWhatsAppLinks();
  }

  function renderBatchWhatsAppLinks(){
    const list=el('batch-whatsapp-rows');
    list.replaceChildren();
    const selected=eligibleVolunteers().filter(p=>batchSelected.has(p.id));
    const message=el('message-preview').value.trim();
    const active=el('message-multi-mode').checked;
    el('multi-selected-count').textContent=selected.length+(selected.length===1?' voluntário selecionado':' voluntários selecionados');
    for(const person of selected){
      const row=create('div','batch-person-row');
      const info=create('div','batch-person-info');
      info.append(create('strong','',person.name),create('small','',person.area||'Voluntário'));
      const actions=create('div','batch-person-actions');
      const state=create('span','batch-person-opened',batchOpened.has(person.id)?'Conversa aberta (envio não confirmado)':'Ainda não aberta');
      const link=create('a','','Abrir conversa no WhatsApp ↗');
      const firstName=String(person.name).trim().split(/\s+/)[0];
      const individual=message.replaceAll('{nome}',firstName);
      link.href='https://wa.me/'+whatsappPhone(person.phone)+'?text='+encodeURIComponent(individual);
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.setAttribute('aria-label','Abrir conversa individual com '+person.name+'; envio manual');
      link.addEventListener('click',()=>{
        batchOpened.add(person.id);
        state.textContent='Conversa aberta (envio não confirmado)';
      });
      if(!message){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
      actions.append(state,link);
      row.append(info,actions);
      list.append(row);
    }
    el('message-send-hint').textContent=active
      ? !selected.length?'Marque os voluntários autorizados na lista acima.'
        : !message?'Escolha um evento válido ou escreva uma mensagem.'
        : 'Abra uma conversa de cada vez. Nenhuma mensagem é enviada pelo portal.'
      : el('message-send-hint').textContent;
  }

  function renderMessageRecipients() {
    const select=el('message-recipient');
    const previous=select.value;
    select.replaceChildren();
    const placeholder=create('option','', 'Selecione um voluntário autorizado');
    placeholder.value='';
    select.append(placeholder);
    eligibleVolunteers().forEach(person=>{
      const option=create('option','',person.name+' • '+person.phone);
      option.value=person.id;
      select.append(option);
    });
    select.value=eligibleVolunteers().some(p=>p.id===previous)?previous:'';
    renderBatchRecipientChoices();
    refreshMessageComposer();
  }

  function refreshMessageComposer() {
    const multi=el('message-multi-mode').checked;
    el('single-message-recipient').hidden=multi;
    el('multi-message-recipients').hidden=!multi;
    el('send-whatsapp').hidden=multi;
    el('batch-whatsapp-list').hidden=!multi;
    el('message-preview-label').textContent=multi
      ? 'Modelo de mensagem (use {nome} para personalizar)'
      : 'Mensagem pronta (você pode editar)';
    const preview=el('message-preview');
    if(multi){
      preview.disabled=false;
      preview.value=volunteerMessage({name:'{nome}'})||'';
      preview.placeholder='Escreva uma mensagem. Use {nome} para chamar cada voluntário pelo primeiro nome.';
    }else{
      const person=eligibleVolunteers().find(p=>p.id===el('message-recipient').value);
      preview.value=person?(volunteerMessage(person)||''):'';
      preview.disabled=!person;
      preview.placeholder=person
        ? 'Cadastre um evento ou escolha "Mensagem geral" para criar o texto.'
        : 'Selecione um voluntário autorizado para gerar a mensagem.';
    }
    updateMessageLink();
  }

  function updateMessageLink() {
    if(el('message-multi-mode').checked){
      renderBatchWhatsAppLinks();
      return;
    }
    const button=el('send-whatsapp');
    const hint=el('message-send-hint');
    const person=eligibleVolunteers().find(p=>p.id===el('message-recipient').value);
    const phone=person?whatsappPhone(person.phone):null;
    const message=el('message-preview').value.trim();
    const ready=Boolean(phone && message);
    button.setAttribute('aria-disabled',String(!ready));
    button.classList.toggle('disabled',!ready);
    button.href=ready?'https://wa.me/'+phone+'?text='+encodeURIComponent(message):'#';
    hint.textContent=!person
      ? 'Selecione um voluntário que tenha autorizado mensagens pelo WhatsApp.'
      : !message
        ? 'Escolha um evento válido ou selecione Mensagem geral.'
        : 'Conversa pronta para abrir. Confira o texto e envie no WhatsApp.';
  }

  function renderPeople() {
    const list=el('volunteer-list');
    list.replaceChildren();
    people.forEach(person => {
      const row=create('div','volunteer-row');
      const detail=create('div','volunteer-contact');
      detail.append(
        create('strong','',person.name),
        create('small','',((person.area||'Apoio geral')+' • '+person.email))
      );
      if(person.phone) detail.append(create('small','', '📱 '+person.phone));
      const phone=whatsappPhone(person.phone);
      const consent=person.whatsappConsent===true;
      detail.append(create('span','volunteer-consent-status'+(consent&&phone?' approved':''), consent&&phone
        ? '✓ Autorizou contato pelo WhatsApp (demonstração)'
        : 'Sem autorização para mensagens pelo WhatsApp'));
      const actions=create('div','volunteer-row-actions');
      const msg=consent&&phone?volunteerMessage(person):null;
      if(msg) {
        const link=create('a','whatsapp-link','Abrir WhatsApp ↗');
        link.href='https://wa.me/'+phone+'?text='+encodeURIComponent(msg);
        link.target='_blank';
        link.rel='noopener noreferrer';
        link.setAttribute('aria-label','Abrir WhatsApp para '+person.name+' com mensagem pronta, sem enviar automaticamente');
        actions.append(link);
        const choose=create('button','prepare-message','Preparar mensagem');
        choose.type='button';
        choose.addEventListener('click',()=>{
          el('message-multi-mode').checked=false;
          el('message-recipient').value=person.id;
          refreshMessageComposer();
          el('admin-messages').scrollIntoView?.({behavior:'smooth',block:'start'});
          el('message-preview').focus();
        });
        actions.append(choose);
      } else {
        actions.append(create('span','whatsapp-disabled',consent&&phone?'Cadastre um evento':'WhatsApp indisponível'));
      }
      if(consent){
        const optOut=create('button','','Revogar autorização');
        optOut.type='button';
        optOut.setAttribute('aria-label','Revogar autorização de contato de '+person.name);
        optOut.addEventListener('click',()=>{
          person.whatsappConsent=false;
          saveStore(PEOPLE_KEY,people);
          renderPeople();
          renderMessageRecipients();
        });
        actions.append(optOut);
      }
      const remove=create('button','','Excluir');
      remove.type='button';
      remove.setAttribute('aria-label','Excluir cadastro de teste de '+person.name);
      remove.addEventListener('click',()=>{
        people=people.filter(x=>x.id!==person.id);
        assignments=assignments.filter(a=>a.volunteerId!==person.id);
        saveStore(PEOPLE_KEY,people);
        saveStore(ASSIGN_KEY,assignments);
        renderAdmin();
      });
      actions.append(remove);
      row.append(detail,actions);
      list.append(row);
    });
    if(!people.length)list.append(create('p','volunteer-empty','Nenhum cadastro de teste neste navegador. Use a página Cadastro para experimentar.'));
    el('stat-volunteers').textContent=String(people.length);
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
      const scale=create('button','','Organizar escala');
      scale.type='button';
      scale.addEventListener('click',()=>{
        renderScales();
        el('scale-event').value=event.id;
        renderScales();
        el('admin-scales').scrollIntoView?.({behavior:'smooth',block:'start'});
      });
      const remove=create('button','danger','Excluir');
      remove.type='button';remove.addEventListener('click',()=>deleteEvent(event));
      buttons.append(see,edit,scale,remove);
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
    document.querySelectorAll('[data-cap-sector]').forEach(input=>input.value='');
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
    const cap=eventCapacity(event);
    document.querySelectorAll('[data-cap-sector]').forEach(input=>{
      input.value=cap[input.dataset.capSector] || '';
    });
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
    assignments=assignments.filter(a=>a.eventId!==event.id);
    eventMaterials=eventMaterials.filter(m=>m.eventId!==event.id);
    saveStore(ASSIGN_KEY,assignments);
    saveStore(EVENT_MATERIAL_KEY,eventMaterials);
    if(el('event-edit-id').value===event.id)resetEventForm();
    renderAdmin();
    renderCalendar();
    renderDay();
    renderParticipations();
  }


  function eventCapacity(event) {
    const stored=event.slotsBySector && typeof event.slotsBySector==='object' ? event.slotsBySector : {};
    const bySector={};
    for(const name of SECTORS){
      const number=Number(stored[name]);
      if(Number.isInteger(number)&&number>0&&number<=999)bySector[name]=number;
    }
    if(!Object.keys(bySector).length && Number.isInteger(Number(event.slots)) && Number(event.slots)>0)
      bySector[event.sector||'Apoio geral']=Number(event.slots);
    return bySector;
  }

  function selectedEvent(selectId) {
    return events.find(e=>e.id===el(selectId).value);
  }

  function populateSelect(id, items, textFor, emptyText) {
    const select=el(id);
    const previous=select.value;
    select.replaceChildren();
    if(!items.length){
      const option=create('option','',emptyText);
      option.value='';
      select.append(option);
      return;
    }
    items.forEach(item=>{
      const option=create('option','',textFor(item));
      option.value=item.id;
      select.append(option);
    });
    if(items.some(item=>item.id===previous))select.value=previous;
  }

  function saveAssignments() {
    return saveStore(ASSIGN_KEY,assignments);
  }

  function staffingCount(eventId,sector) {
    return assignments.filter(a=>a.eventId===eventId && a.sector===sector && a.status!=='recusada').length;
  }

  function renderScales() {
    const ordered=[...events].sort((a,b)=>a.date.localeCompare(b.date));
    populateSelect('scale-event',ordered,e=>e.title+' • '+formatDate(e.date),'Cadastre um evento primeiro');
    const volunteerOptions=[...people].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    populateSelect('scale-volunteer',volunteerOptions,p=>p.name+' • '+p.area,'Cadastre um voluntário primeiro');
    const event=selectedEvent('scale-event');
    const sector=el('scale-sector');
    if(event&&event.sector && !sector.value)sector.value=event.sector;
    const meters=el('sector-progress-list');
    meters.replaceChildren();
    const list=el('assignment-list');
    list.replaceChildren();
    if(!event){
      list.append(create('p','assignment-empty','Cadastre um evento para organizar a escala.'));
      meters.append(create('p','assignment-empty','As vagas por setor aparecerão aqui.'));
    }else{
      const limits=eventCapacity(event);
      const sectors=Object.keys(limits).length?Object.keys(limits):[event.sector||'Apoio geral'];
      sectors.forEach(name=>{
        const capacity=limits[name]||0;
        const filled=staffingCount(event.id,name);
        const box=create('div','sector-meter');
        const header=create('div','sector-meter-label');
        header.append(create('span','',name),create('span','',capacity?filled+' de '+capacity+' vagas':filled+' escalados • sem limite'));
        const track=create('div','sector-track');
        const fill=create('div','sector-fill'+(capacity&&filled>=capacity?' full':''));
        fill.style.width=(capacity?Math.min(100,100*filled/capacity):0)+'%';
        track.append(fill);
        box.append(header,track);
        meters.append(box);
      });
      const assigned=assignments.filter(a=>a.eventId===event.id);
      assigned.forEach(item=>{
        const person=people.find(p=>p.id===item.volunteerId);
        if(!person)return;
        const row=create('div','assignment-row');
        row.dataset.assignmentId=item.id;
        const main=create('div','assignment-main');
        const info=create('div');
        info.append(create('strong','',person.name),create('small','',item.sector+' • '+person.email));
        const label=create('span','assignment-status '+item.status,
          item.status==='confirmada'?'✓ Confirmado':item.status==='recusada'?'✕ Recusou':'● Pendente');
        main.append(info,label);
        const buttons=create('div','assignment-actions');
        const actions=[
          ['Confirmar','confirmada'],
          ['Recusar','recusada'],
          ['Presente','presente'],
          ['Ausente','ausente']
        ];
        actions.forEach(([title,action])=>{
          const button=create('button','',title);
          button.type='button';
          button.disabled=(action==='presente'||action==='ausente') && item.status!=='confirmada';
          button.addEventListener('click',()=>changeAssignment(item.id,action));
          buttons.append(button);
        });
        const remove=create('button','danger','Remover');
        remove.type='button';
        remove.addEventListener('click',()=>changeAssignment(item.id,'remover'));
        buttons.append(remove);
        const presence=create('div','assignment-presence','Presença: '+(item.attendance==='presente'?'✓ Presente':item.attendance==='ausente'?'✕ Ausente':'Aguardando registro'));
        row.append(main,buttons,presence);
        list.append(row);
      });
      if(!assigned.length)list.append(create('p','assignment-empty','Nenhum voluntário escalado para esta atividade. Utilize o formulário ao lado.'));
    }
    el('stat-assigned').textContent=String(assignments.filter(a=>a.status!=='recusada').length);
    el('stat-confirmed').textContent=String(assignments.filter(a=>a.status==='confirmada').length);
  }

  function changeAssignment(id,action) {
    const item=assignments.find(a=>a.id===id);
    if(!item)return;
    if(action==='remover'){
      assignments=assignments.filter(a=>a.id!==id);
    }else if(action==='presente'||action==='ausente'){
      if(item.status!=='confirmada')return;
      item.attendance=action;
    }else{
      if(action==='confirmada' && item.status==='recusada'){
        const event=events.find(e=>e.id===item.eventId);
        const limit=event && eventCapacity(event)[item.sector];
        if(limit && staffingCount(item.eventId,item.sector)>=limit){
          feedback('scale-feedback','O setor está com todas as vagas ocupadas.',true);return;
        }
      }
      item.status=action;
      item.attendance='pendente';
    }
    if(!saveAssignments()){
      feedback('scale-feedback','Não foi possível salvar esta alteração neste navegador.',true);
      return;
    }
    renderScales();
    renderReports();
    renderParticipations();
    renderCalendar();
    renderDay();
  }

  function eventMinutes(event) {
    if(!/^\d{2}:\d{2}$/.test(event.start||'')||!/^\d{2}:\d{2}$/.test(event.end||''))return 0;
    const from=Number(event.start.slice(0,2))*60+Number(event.start.slice(3));
    const to=Number(event.end.slice(0,2))*60+Number(event.end.slice(3));
    return Math.max(0,to-from);
  }

  function renderReports() {
    const active=assignments.filter(a=>a.status!=='recusada');
    const confirmed=assignments.filter(a=>a.status==='confirmada');
    const attended=confirmed.filter(a=>a.attendance==='presente');
    const minutes=attended.reduce((sum,a)=>sum+eventMinutes(events.find(e=>e.id===a.eventId)||{}),0);
    const consumed=eventMaterials.filter(m=>m.consumed).reduce((sum,m)=>sum+(Number(m.qty)||0),0);
    el('report-events').textContent=String(events.length);
    el('report-confirmed').textContent=String(confirmed.length);
    el('report-attended').textContent=String(attended.length);
    const hours=minutes/60;
    el('report-hours').textContent=(Number.isInteger(hours)?String(hours):hours.toFixed(1).replace('.',','))+'h';
    el('report-materials').textContent=String(consumed);
    el('stat-assigned').textContent=String(active.length);
    el('stat-confirmed').textContent=String(confirmed.length);
    const list=el('report-event-list');
    list.replaceChildren();
    events.forEach(event=>{
      const assigned=assignments.filter(a=>a.eventId===event.id);
      const row=create('div','report-event-row');
      const info=create('div');
      info.append(create('strong','',event.title),create('small','',formatDate(event.date)+' • '+eventTime(event)));
      const counters=create('div','report-badges');
      const values=[
        assigned.filter(a=>a.status!=='recusada').length+' escalados',
        assigned.filter(a=>a.status==='confirmada').length+' confirmados',
        assigned.filter(a=>a.attendance==='presente').length+' presentes'
      ];
      values.forEach(value=>counters.append(create('span','',value)));
      row.append(info,counters);
      list.append(row);
    });
    if(!events.length)list.append(create('p','assignment-empty','Ainda não há eventos para resumir.'));
  }

  function renderEventMaterials() {
    const sorted=[...events].sort((a,b)=>a.date.localeCompare(b.date));
    populateSelect('materials-event',sorted,e=>e.title+' • '+formatDate(e.date),'Cadastre um evento primeiro');
    populateSelect('materials-stock',stock,x=>x.name+' • '+x.qty+' un. em estoque','Cadastre materiais no estoque');
    const event=selectedEvent('materials-event');
    const list=el('event-material-list');
    list.replaceChildren();
    eventMaterials.filter(m=>event && m.eventId===event.id).forEach(item=>{
      const material=stock.find(s=>s.id===item.stockId);
      const available=material?Number(material.qty):0;
      const row=create('div','planned-row');
      row.dataset.materialPlanId=item.id;
      const info=create('div','planned-row-info');
      info.append(create('strong','',material?.name||'Material removido do estoque'),
        create('small','',item.qty+' unidades previstas • '+(item.consumed?'✓ Baixa realizada':available<item.qty?'⚠ Estoque insuficiente ('+available+' disponíveis)':'Disponível no estoque: '+available)));
      const actions=create('div','planned-actions');
      if(!item.consumed){
        const consume=create('button','','Registrar uso');
        consume.type='button';
        consume.disabled=!material || available<item.qty;
        consume.addEventListener('click',()=>consumeMaterial(item.id));
        actions.append(consume);
        const remove=create('button','danger','Remover');
        remove.type='button';
        remove.addEventListener('click',()=>{
          eventMaterials=eventMaterials.filter(x=>x.id!==item.id);
          saveStore(EVENT_MATERIAL_KEY,eventMaterials);
          renderEventMaterials();renderReports();
        });
        actions.append(remove);
      }
      row.append(info,actions);
      list.append(row);
    });
    if(!list.children.length)list.append(create('p','material-empty','Nenhum material vinculado a este evento.'));
  }

  function consumeMaterial(id) {
    const plan=eventMaterials.find(x=>x.id===id);
    if(!plan||plan.consumed)return;
    const item=stock.find(s=>s.id===plan.stockId);
    if(!item || !Number.isSafeInteger(Number(item.qty)) || Number(item.qty)<plan.qty){
      feedback('materials-feedback','Estoque insuficiente: revise as quantidades antes de registrar o uso.',true);return;
    }
    item.qty=Number(item.qty)-plan.qty;
    plan.consumed=true;
    if(!saveStore(STOCK_KEY,stock)||!saveStore(EVENT_MATERIAL_KEY,eventMaterials)){
      feedback('materials-feedback','Não foi possível salvar a baixa de estoque.',true);return;
    }
    feedback('materials-feedback','Baixa registrada neste navegador: '+plan.qty+' unidades utilizadas.');
    renderInventory();renderEventMaterials();renderReports();
  }

  function renderAdmin() {
    renderInventory();
    renderAdminEvents();
    renderMessageOptions();
    renderPeople();
    renderMessageRecipients();
    renderScales();
    renderEventMaterials();
    renderReports();
  }

  function logout() {
    const previousRole=currentRole;
    currentRole=null;
    activeVolunteerId=null;
    el('password').value='';
    el('admin-password').value='';
    go(previousRole==='admin'?'admin-login':'login');
  }

  el('login-form').addEventListener('submit', event => {
    event.preventDefault();
    const email=el('email');
    const password=el('password');
    const valid=validarLogin(email.checkValidity(),password.value);
    el('login-error').classList.toggle('show',!valid);
    el('login-error').textContent='Informe um e-mail válido e preencha a senha para continuar.';
    if(valid){
      currentRole='volunteer';
      activeVolunteerId=people.find(p=>p.email===email.value.trim().toLowerCase())?.id||null;
      view('calendar');
    }else (email.checkValidity()?password:email).focus();
  });

  el('admin-login-form').addEventListener('submit', event => {
    event.preventDefault();
    const email=el('admin-email');
    const password=el('admin-password');
    const valid=email.value.trim().toLowerCase()==='admin@entrenessaonda.demo'
      && password.value==='Onda2026!';
    el('admin-login-error').classList.toggle('show',!valid);
    if(valid){
      currentRole='admin';
      activeVolunteerId=null;
      go('admin');
    } else email.focus();
  });

  el('toggle-password').addEventListener('click', () => {
    const input = el('password');
    input.type = input.type === 'password' ? 'text' : 'password';
    el('toggle-password').textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
    el('toggle-password').setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  });
  el('admin-toggle-password').addEventListener('click', () => {
    const password=el('admin-password');
    password.type=password.type==='password'?'text':'password';
    el('admin-toggle-password').textContent=password.type==='password'?'Mostrar':'Ocultar';
    el('admin-toggle-password').setAttribute('aria-label',password.type==='password'?'Mostrar senha':'Ocultar senha');
  });
  el('admin-login-back').addEventListener('click',()=>go('login'));
  el('btn-confirm').addEventListener('click', () => updateResult(true));
  el('btn-decline').addEventListener('click', () => updateResult(false));
  ['result-back', 'btn-back-calendar', 'btn-view-scales'].forEach(id =>
    el(id).addEventListener('click', () => view('calendar')));
  ['btn-my-scales', 'side-participations', 'nav-my'].forEach(id =>
    el(id).addEventListener('click', () => view('participations')));
  ['tab-calendar', 'side-calendar', 'nav-calendar', 'participations-back'].forEach(id =>
    el(id).addEventListener('click', () => view('calendar')));
  ['nav-exit', 'side-logout', 'admin-back'].forEach(id =>
    el(id).addEventListener('click', logout));
  el('register-back').addEventListener('click',()=>go(currentRole==='admin'?'admin':'login'));
  ['go-register', 'side-register', 'admin-new-volunteer'].forEach(id =>
    el(id).addEventListener('click', () => go('cadastro')));
  el('go-admin').addEventListener('click', () => go(currentRole==='admin'?'admin':'admin-login'));
  el('prev-month').addEventListener('click',()=>navigateMonth(-1));
  el('next-month').addEventListener('click',()=>navigateMonth(1));
  el('back-to-event').addEventListener('click',()=>{
    const event=events.find(x=>x.id===DEMO_EVENT_ID)||[...events].sort((a,b)=>a.date.localeCompare(b.date))[0];
    if(event)jumpToEvent(event);
  });

  ['message-kind','message-event'].forEach(id => el(id).addEventListener('change',()=>{
    el('message-event').disabled=el('message-kind').value==='general';
    batchOpened.clear();
    renderPeople();
    refreshMessageComposer();
  }));
  el('message-recipient').addEventListener('change',()=>refreshMessageComposer());
  el('message-multi-mode').addEventListener('change',()=>refreshMessageComposer());
  el('multi-select-all').addEventListener('click',()=>{
    eligibleVolunteers().forEach(p=>batchSelected.add(p.id));
    renderBatchRecipientChoices();
  });
  el('multi-clear-all').addEventListener('click',()=>{
    batchSelected.clear();
    batchOpened.clear();
    renderBatchRecipientChoices();
  });
  el('message-preview').addEventListener('input',()=>{
    batchOpened.clear();
    updateMessageLink();
  });
  el('send-whatsapp').addEventListener('click',event=>{
    if(el('send-whatsapp').getAttribute('aria-disabled')==='true') event.preventDefault();
  });
  document.querySelectorAll('[data-admin-target]').forEach(button=>button.addEventListener('click',()=>{
    const target=el(button.dataset.adminTarget);
    if(target)target.scrollIntoView?.({behavior:'smooth',block:'start'});
  }));

  el('volunteer-form').addEventListener('submit', event => {
    event.preventDefault();
    const form = el('volunteer-form');
    if (!form.reportValidity()) return;
    const name = el('reg-name').value.trim();
    const email = el('reg-email').value.trim().toLowerCase();
    const phone = el('reg-phone').value.trim();
    const area = el('reg-area').value;
    const whatsappConsent=el('reg-whatsapp-consent').checked;
    if(phone && !whatsappPhone(phone)){
      feedback('register-feedback','Informe um celular com DDD no formato (11) 99999-9999, ou deixe o campo em branco.',true);
      return;
    }
    if(whatsappConsent && !phone){
      feedback('register-feedback','Para autorizar mensagens pelo WhatsApp, informe seu celular com DDD.',true);
      return;
    }
    if (name.length < 3 || !email || !area || !el('reg-consent').checked) {
      feedback('register-feedback', 'Preencha os campos obrigatórios e confirme que entendeu a demonstração.', true);
      return;
    }
    if (people.some(p => p.email === email)) {
      feedback('register-feedback', 'Já existe um cadastro de teste com este e-mail neste navegador.', true);
      return;
    }
    const next = [...people, { id: String(Date.now()) + '-' + String(Math.random()).slice(2), name, email, phone, area, whatsappConsent }];
    if (!saveStore(PEOPLE_KEY, next)) {
      feedback('register-feedback', 'Não foi possível salvar neste navegador. Confira se o armazenamento local está habilitado.', true);
      return;
    }
    people = next;
    form.reset();
    feedback('register-feedback', 'Cadastro de TESTE salvo apenas neste navegador. A coordenação do projeto não recebeu estes dados.'+(whatsappConsent?' Você autorizou mensagens nesta demonstração, mas nenhuma foi enviada.':''));
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
    const slotsBySector={};
    let capacityInvalid=false;
    document.querySelectorAll('[data-cap-sector]').forEach(input=>{
      if(!input.value.trim())return;
      const number=Number(input.value);
      if(!Number.isInteger(number)||number<0||number>999)capacityInvalid=true;
      else if(number>0)slotsBySector[input.dataset.capSector]=number;
    });
    if(capacityInvalid){
      feedback('event-feedback','Revise as vagas de cada setor: use números inteiros entre 0 e 999.',true);return;
    }
    if(!Object.keys(slotsBySector).length && slots)slotsBySector[sector]=slots;
    if(id && Object.keys(slotsBySector).length){
      const activeAssigned=assignments.filter(a=>a.eventId===id && a.status!=='recusada');
      for(const name of SECTORS){
        const count=activeAssigned.filter(a=>a.sector===name).length;
        const limit=slotsBySector[name] || 0;
        if(count && limit < count){
          feedback('event-feedback','Não é possível reduzir as vagas de '+name+': existem '+count+' voluntários escalados neste setor. Reorganize a escala antes de salvar.',true);
          return;
        }
      }
    }
    const item={id: id || 'event-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      title,date,start,end,place,sector,role,description,slots,slotsBySector};
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


  el('scale-event').addEventListener('change',()=>{
    renderScales();
  });
  el('scale-form').addEventListener('submit',event=>{
    event.preventDefault();
    const evt=selectedEvent('scale-event');
    const volunteer=people.find(p=>p.id===el('scale-volunteer').value);
    const sector=el('scale-sector').value;
    if(!evt || !volunteer || !SECTORS.includes(sector)){
      feedback('scale-feedback','Selecione um evento, um voluntário e o setor de atuação.',true);return;
    }
    if(assignments.some(a=>a.eventId===evt.id&&a.volunteerId===volunteer.id)){
      feedback('scale-feedback','Este voluntário já faz parte da escala do evento. Altere a situação na lista ao lado.',true);return;
    }
    const limits=eventCapacity(evt);
    if(Object.keys(limits).length && !limits[sector]){
      feedback('scale-feedback','Configure vagas para este setor no cadastro do evento antes de escalar.',true);return;
    }
    if(limits[sector] && staffingCount(evt.id,sector)>=limits[sector]){
      feedback('scale-feedback','As vagas deste setor já estão preenchidas. Escolha outro setor ou ajuste a capacidade do evento.',true);return;
    }
    const next={id:'escala-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      eventId:evt.id,volunteerId:volunteer.id,sector,status:'pendente',attendance:'pendente'};
    assignments.push(next);
    if(!saveAssignments()){
      assignments.pop();
      feedback('scale-feedback','Não foi possível salvar a escala neste navegador.',true);return;
    }
    feedback('scale-feedback',volunteer.name+' foi escalado(a) para '+sector+'. A confirmação fica pendente até a resposta.');
    renderScales();renderReports();renderParticipations();renderCalendar();renderDay();
  });
  el('materials-event').addEventListener('change',renderEventMaterials);
  el('event-material-form').addEventListener('submit',event=>{
    event.preventDefault();
    const evt=selectedEvent('materials-event');
    const material=stock.find(m=>m.id===el('materials-stock').value);
    const qty=Number(el('materials-qty').value);
    if(!evt || !material || !Number.isInteger(qty) || qty<1 || qty>99999){
      feedback('materials-feedback','Selecione um evento, um material e uma quantidade válida.',true);return;
    }
    if(eventMaterials.some(m=>m.eventId===evt.id&&m.stockId===material.id)){
      feedback('materials-feedback','Esse material já está planejado para este evento.',true);return;
    }
    const next={id:'recurso-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      eventId:evt.id,stockId:material.id,qty,consumed:false};
    eventMaterials.push(next);
    if(!saveStore(EVENT_MATERIAL_KEY,eventMaterials)){
      eventMaterials.pop();
      feedback('materials-feedback','Não foi possível salvar este material.',true);return;
    }
    feedback('materials-feedback','Material vinculado ao evento. O estoque só será reduzido ao registrar o uso.');
    renderEventMaterials();renderReports();
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
    assignments = [];
    saveStore(PEOPLE_KEY, people);
    saveStore(ASSIGN_KEY, assignments);
    renderAdmin();
  });

  renderCalendar();
  renderDay();
  renderParticipations();
  const entry = params.get('tela');
  go(screens.includes(entry) ? entry : 'login');
})();
