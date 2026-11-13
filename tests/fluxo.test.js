// @vitest-environment jsdom

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync('Prótoipo/index.html', 'utf8');

const el = (id) => document.getElementById(id);

async function iniciarPrototipo({ manterDados = false } = {}) {
  vi.resetModules();

  document.body.innerHTML = html.split('<body>')[1].split('</body>')[0];

  vi.stubGlobal('scrollTo', vi.fn());
  history.replaceState(null, '', '/');
  if (!manterDados) window.localStorage.clear();

  await import('../Prótoipo/app.js');
}

function entrarAdmin() {
  el('go-admin').click();
  expect(el('screen-admin-login').classList.contains('active')).toBe(true);
  el('admin-email').value='admin@entrenessaonda.demo';
  el('admin-password').value='Onda2026!';
  el('admin-login-form').dispatchEvent(
    new Event('submit', {bubbles:true,cancelable:true})
  );
  expect(el('screen-admin').classList.contains('active')).toBe(true);
}

function enviarLogin(email, senha) {
  el('email').value = email;
  el('password').value = senha;

  el('login-form').dispatchEvent(
    new Event('submit', { bubbles: true, cancelable: true })
  );
}

describe('Integracao - Entre Nessa Onda', () => {
  beforeEach(async () => {
    await iniciarPrototipo();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('bloqueia login com e-mail invalido', () => {
    enviarLogin('teste', '123456');

    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('login-error').classList.contains('show')).toBe(true);
    expect(document.activeElement).toBe(el('email'));
  });

  it('bloqueia login com senha vazia', () => {
    enviarLogin('voluntario@exemplo.org', '');

    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('login-error').classList.contains('show')).toBe(true);
    expect(document.activeElement).toBe(el('password'));
  });

  it('abre o calendario com os campos preenchidos', () => {
    enviarLogin('voluntario@exemplo.org', '123456');

    expect(el('screen-escala').classList.contains('active')).toBe(true);
  });

  it('confirma a participacao na atividade', () => {
    enviarLogin('voluntario@exemplo.org', '123456');
    el('btn-confirm').click();

    expect(el('screen-resultado').classList.contains('active')).toBe(true);
    expect(el('result-status').textContent).toBe('Confirmada');
  });

  it('recusa a participacao na atividade', () => {
    enviarLogin('voluntario@exemplo.org', '123456');
    el('btn-decline').click();

    expect(el('screen-resultado').classList.contains('active')).toBe(true);
    expect(el('result-status').textContent).toBe('Recusada');
  });

  it('atualiza o calendario apos a recusa', () => {
    enviarLogin('voluntario@exemplo.org', '123456');
    el('btn-decline').click();
    el('btn-back-calendar').click();

    expect(el('screen-escala').classList.contains('active')).toBe(true);
    expect(el('escala-status').textContent).toContain('Recusada');
  });
  it('inicia com o campo de e-mail vazio', () => {
    expect(el('email').value).toBe('');
    expect(el('password').value).toBe('');
  });

  it('abre o cadastro demonstrativo de voluntarios', () => {
    el('go-register').click();

    expect(el('screen-cadastro').classList.contains('active')).toBe(true);
    expect(el('volunteer-form')).toBeTruthy();
  });

  it('abre o painel admin com estoque demonstrativo', () => {
    entrarAdmin();

    expect(el('screen-admin').classList.contains('active')).toBe(true);
    expect(el('inventory-list').children.length).toBeGreaterThan(0);
  });

  it('mantem o calendario acessivel ao entrar nas escalas', () => {
    enviarLogin('voluntario@exemplo.org', 'senha-de-teste');

    expect(el('calendar-view').hidden).toBe(false);
    expect(el('calendar-view').querySelectorAll('.day').length).toBe(30);
  });

  it('permite cadastrar um evento pelo painel administrativo e localiza no calendario', () => {
    entrarAdmin();

    el('event-name').value = 'Oficina de Leitura';
    el('event-date').value = '2026-12-05';
    el('event-start').value = '10:00';
    el('event-end').value = '12:00';
    el('event-place').value = 'Centro Comunitário Exemplo';
    el('event-sector').value = 'Recreação';
    el('event-role').value = 'Apoio aos participantes';
    el('event-description').value = 'Leitura e brincadeiras em grupo';

    el('event-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('stat-events').textContent).toBe('2');
    expect(el('admin-event-list').textContent).toContain('Oficina de Leitura');

    const newlyAdded = el('admin-event-list').querySelector('[data-event-id^="event-"]');
    expect(newlyAdded).toBeTruthy();
    newlyAdded.querySelector('button').click();

    expect(el('calendar-month-title').textContent).toContain('Dezembro de 2026');
    expect(el('extra-events').textContent).toContain('Oficina de Leitura');
    expect(el('calendar-view').hidden).toBe(false);
  });

  it('bloqueia um evento quando o horario de termino vem antes do inicio', () => {
    entrarAdmin();

    el('event-name').value = 'Evento de Teste';
    el('event-date').value = '2026-12-07';
    el('event-start').value = '15:00';
    el('event-end').value = '10:00';
    el('event-place').value = 'Local de exemplo';
    el('event-sector').value = 'Acolhimento';
    el('event-role').value = 'Recepção';

    el('event-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('stat-events').textContent).toBe('1');
    expect(el('event-feedback').textContent).toContain('término');
  });

  it('permite navegar entre os meses no calendario', () => {
    enviarLogin('voluntario@exemplo.org', '123456');
    el('next-month').click();

    expect(el('calendar-month-title').textContent).toContain('Dezembro de 2026');
    expect(el('calendar-day-grid').querySelectorAll('.day').length).toBe(31);
    el('prev-month').click();
    expect(el('calendar-month-title').textContent).toContain('Novembro de 2026');
  });

  it('permite editar um evento existente no painel', () => {
    entrarAdmin();
    const demo = el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    demo.querySelectorAll('button')[1].click();
    expect(el('event-edit-id').value).toBe('demo-event-14');

    el('event-name').value = 'Evento de Teste Editado';
    el('event-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('stat-events').textContent).toBe('1');
    expect(el('admin-event-list').textContent).toContain('Evento de Teste Editado');
  });

  it('abre o WhatsApp com mensagem pronta somente com telefone e autorizacao', () => {
    el('go-register').click();
    el('reg-name').value = 'Pessoa Exemplo';
    el('reg-email').value = 'pessoa@exemplo.org';
    el('reg-phone').value = '(11) 99999-9999';
    el('reg-area').value = 'Recreação';
    el('reg-consent').checked = true;
    el('reg-whatsapp-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('register-feedback').textContent).toContain('Cadastro de TESTE salvo');
    el('register-back').click();
    entrarAdmin();

    const link = el('volunteer-list').querySelector('a.whatsapp-link');
    expect(link).toBeTruthy();
    expect(link.href).toContain('wa.me/5511999999999?text=');
    expect(decodeURIComponent(link.href)).toContain('Pessoa');
    expect(decodeURIComponent(link.href)).toContain('Tarde de Brincadeiras');
    expect(link.target).toBe('_blank');

    el('message-kind').value = 'general';
    el('message-kind').dispatchEvent(new Event('change'));
    expect(decodeURIComponent(el('volunteer-list').querySelector('a.whatsapp-link').href))
      .toContain('próximas ações sociais');
  });

  it('nao disponibiliza mensagem sem consentimento', () => {
    el('go-register').click();
    el('reg-name').value = 'Pessoa Sem Consentimento';
    el('reg-email').value = 'semconsentimento@exemplo.org';
    el('reg-phone').value = '(11) 99999-9999';
    el('reg-area').value = 'Acolhimento';
    el('reg-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    el('register-back').click();
    entrarAdmin();

    expect(el('volunteer-list').querySelector('a.whatsapp-link')).toBeNull();
    expect(el('volunteer-list').textContent).toContain('Sem autorização');
  });

  it('exige celular valido quando contato pelo WhatsApp e autorizado', () => {
    el('go-register').click();
    el('reg-name').value = 'Pessoa Sem Celular';
    el('reg-email').value = 'semcelular@exemplo.org';
    el('reg-area').value = 'Organização';
    el('reg-consent').checked = true;
    el('reg-whatsapp-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('register-feedback').textContent).toContain('informe seu celular');
    el('register-back').click();
    entrarAdmin();
    expect(el('stat-volunteers').textContent).toBe('0');
  });

  it('permite revogar autorizacao e remove link de mensagens', () => {
    el('go-register').click();
    el('reg-name').value = 'Pessoa Autorizada';
    el('reg-email').value = 'autorizada@exemplo.org';
    el('reg-phone').value = '11999999999';
    el('reg-area').value = 'Recreação';
    el('reg-consent').checked = true;
    el('reg-whatsapp-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    el('register-back').click();
    entrarAdmin();
    expect(el('volunteer-list').querySelector('a.whatsapp-link')).toBeTruthy();
    const revoke = [...el('volunteer-list').querySelectorAll('button')].find(x=>x.textContent==='Revogar autorização');
    expect(revoke).toBeTruthy();
    revoke.click();
    expect(el('volunteer-list').querySelector('a.whatsapp-link')).toBeNull();
  });

  it('apresenta pagina de administrador separada e valida credenciais', () => {
    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('screen-login').querySelector('#admin-email')).toBeNull();
    expect(el('screen-login').querySelector('#role-admin')).toBeNull();
    el('go-admin').click();

    expect(el('screen-admin-login').classList.contains('active')).toBe(true);
    expect(el('screen-admin-login').querySelector('#admin-demo-credentials')).toBeTruthy();
    expect(el('screen-admin-login').querySelector('#admin-login-form')).toBeTruthy();
    expect(el('screen-login').querySelector('#admin-login-form')).toBeNull();

    el('admin-email').value='pessoa@exemplo.org';
    el('admin-password').value='123456';
    el('admin-login-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('screen-admin-login').classList.contains('active')).toBe(true);
    expect(el('admin-login-error').classList.contains('show')).toBe(true);

    el('admin-email').value='admin@entrenessaonda.demo';
    el('admin-password').value='Onda2026!';
    el('admin-login-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('screen-admin').classList.contains('active')).toBe(true);
    el('admin-back').click();
    expect(el('screen-admin-login').classList.contains('active')).toBe(true);
  });

  it('voluntario possui menu independente e nao ve acesso administrativo interno', () => {
    enviarLogin('voluntario@exemplo.org','123456');
    expect(el('screen-escala').classList.contains('active')).toBe(true);
    expect(el('screen-escala').querySelector('#side-admin')).toBeNull();
    expect(el('screen-admin').classList.contains('active')).toBe(false);
    el('side-logout').click();
    expect(el('screen-login').classList.contains('active')).toBe(true);
  });

  it('central de mensagens deixa selecionar destinatario e editar texto', () => {
    el('go-register').click();
    el('reg-name').value='Maria Demonstração';
    el('reg-email').value='maria@exemplo.org';
    el('reg-phone').value='11999999999';
    el('reg-area').value='Acolhimento';
    el('reg-consent').checked=true;
    el('reg-whatsapp-consent').checked=true;
    el('volunteer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('register-back').click();
    entrarAdmin();
    const recipient=el('message-recipient');
    expect(recipient.options.length).toBe(2);
    recipient.selectedIndex=1;
    recipient.dispatchEvent(new Event('change'));
    expect(el('message-preview').value).toContain('Maria');
    expect(el('send-whatsapp').getAttribute('aria-disabled')).toBe('false');
    expect(decodeURIComponent(el('send-whatsapp').href)).toContain('Tarde de Brincadeiras');
    el('message-preview').value='Olá, Maria! Convite de teste.';
    el('message-preview').dispatchEvent(new Event('input'));
    expect(decodeURIComponent(el('send-whatsapp').href)).toContain('Convite de teste.');
    expect(el('send-whatsapp').target).toBe('_blank');
  });

  it('central de mensagens bloqueia destinatario sem consentimento', () => {
    el('go-register').click();
    el('reg-name').value='Sem Autorização';
    el('reg-email').value='nao@exemplo.org';
    el('reg-phone').value='11999999999';
    el('reg-area').value='Recreação';
    el('reg-consent').checked=true;
    el('volunteer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('register-back').click();
    entrarAdmin();
    expect(el('message-recipient').options.length).toBe(1);
    expect(el('send-whatsapp').getAttribute('aria-disabled')).toBe('true');
    expect(el('message-preview').disabled).toBe(true);
  });

  it('seleciona varios voluntarios autorizados e personaliza cada conversa', () => {
    const cadastrar = (nome, email, telefone, autorizado) => {
      el('go-register').click();
      el('reg-name').value = nome;
      el('reg-email').value = email;
      el('reg-phone').value = telefone;
      el('reg-area').value = 'Recreação';
      el('reg-consent').checked = true;
      el('reg-whatsapp-consent').checked = autorizado;
      el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      expect(el('register-feedback').textContent).toContain('Cadastro de TESTE salvo');
      el('register-back').click();
    };
    cadastrar('Maria Teste', 'maria@exemplo.org', '11999999999', true);
    cadastrar('João Teste', 'joao@exemplo.org', '11988888888', true);
    cadastrar('Sem Permissão', 'sem@exemplo.org', '11977777777', false);
    entrarAdmin();

    el('message-multi-mode').checked = true;
    el('message-multi-mode').dispatchEvent(new Event('change'));
    expect(el('multi-message-recipients').hidden).toBe(false);
    expect(el('single-message-recipient').hidden).toBe(true);
    expect(el('message-preview').value).toContain('{nome}');
    expect(el('multi-recipient-list').querySelectorAll('input[type="checkbox"]').length).toBe(2);

    el('multi-select-all').click();
    expect(el('multi-selected-count').textContent).toContain('2 voluntários');
    const links = [...el('batch-whatsapp-rows').querySelectorAll('a')];
    expect(links.length).toBe(2);
    expect(links[0].href).toContain('wa.me/5511999999999');
    expect(links[1].href).toContain('wa.me/5511988888888');
    expect(decodeURIComponent(links[0].href)).toContain('Olá, Maria!');
    expect(decodeURIComponent(links[1].href)).toContain('Olá, João!');
    expect(links[0].target).toBe('_blank');
    expect(el('send-whatsapp').hidden).toBe(true);

    el('message-preview').value = 'Olá, {nome}! Precisamos de voluntários no sábado.';
    el('message-preview').dispatchEvent(new Event('input'));
    const updated = [...el('batch-whatsapp-rows').querySelectorAll('a')];
    expect(decodeURIComponent(updated[0].href)).toContain('Olá, Maria! Precisamos');
    expect(decodeURIComponent(updated[1].href)).toContain('Olá, João! Precisamos');
    expect(decodeURIComponent(updated[0].href)).not.toContain('{nome}');

    el('multi-clear-all').click();
    expect(el('batch-whatsapp-rows').querySelectorAll('a').length).toBe(0);
    expect(el('multi-selected-count').textContent).toContain('0 voluntários');
  });

  it('remove contatos da selecao multipla quando a autorizacao e revogada', () => {
    el('go-register').click();
    el('reg-name').value = 'Maria Teste';
    el('reg-email').value = 'maria@exemplo.org';
    el('reg-phone').value = '11999999999';
    el('reg-area').value = 'Acolhimento';
    el('reg-consent').checked = true;
    el('reg-whatsapp-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    el('register-back').click();
    entrarAdmin();
    el('message-multi-mode').checked = true;
    el('message-multi-mode').dispatchEvent(new Event('change'));
    el('multi-select-all').click();
    expect(el('batch-whatsapp-rows').querySelectorAll('a').length).toBe(1);

    const revoke = [...el('volunteer-list').querySelectorAll('button')].find(b => b.textContent === 'Revogar autorização');
    revoke.click();
    expect(el('multi-recipient-list').querySelectorAll('input[type="checkbox"]').length).toBe(0);
    expect(el('batch-whatsapp-rows').querySelectorAll('a').length).toBe(0);
  });

  it('escala voluntario por evento e impede inclusao duplicada', () => {
    el('go-register').click();
    el('reg-name').value='Pessoa de Teste';
    el('reg-email').value='escala@exemplo.org';
    el('reg-area').value='Recreação';
    el('reg-consent').checked=true;
    el('volunteer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('register-back').click();
    entrarAdmin();
    expect(el('scale-event').options.length).toBe(1);
    expect(el('scale-volunteer').options.length).toBe(1);
    el('scale-sector').value='Recreação';
    el('scale-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('stat-assigned').textContent).toBe('1');
    expect(el('assignment-list').textContent).toContain('Pessoa de Teste');
    el('scale-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('stat-assigned').textContent).toBe('1');
    expect(el('scale-feedback').textContent).toContain('já faz parte');
  });

  it('impede ultrapassar vagas de um setor e permite registrar presenca', () => {
    function register(name,email){
      el('go-register').click();
      el('reg-name').value=name;
      el('reg-email').value=email;
      el('reg-area').value='Recreação';
      el('reg-consent').checked=true;
      el('volunteer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      el('register-back').click();
    }
    register('Pessoa Um','um@exemplo.org');
    register('Pessoa Dois','dois@exemplo.org');
    entrarAdmin();
    const demo=el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    demo.querySelectorAll('button')[1].click();
    el('cap-recreation').value='1';
    el('event-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('scale-sector').value='Recreação';
    el('scale-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('stat-assigned').textContent).toBe('1');
    el('scale-volunteer').selectedIndex=1;
    el('scale-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('scale-feedback').textContent).toContain('vagas deste setor');
    expect(el('stat-assigned').textContent).toBe('1');
    const row=el('assignment-list').querySelector('[data-assignment-id]');
    const confirm=[...row.querySelectorAll('button')].find(b=>b.textContent==='Confirmar');
    confirm.click();
    expect(el('stat-confirmed').textContent).toBe('1');
    const present=[...el('assignment-list').querySelectorAll('button')].find(b=>b.textContent==='Presente');
    present.click();
    expect(el('report-attended').textContent).toBe('1');
    expect(el('report-hours').textContent).toBe('4h');
    expect(el('assignment-list').textContent).toContain('✓ Presente');
  });

  it('vincula materiais a eventos e da baixa no estoque uma so vez', () => {
    entrarAdmin();
    expect(el('stat-units').textContent).toBe('29');
    el('materials-qty').value='5';
    el('event-material-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(el('event-material-list').textContent).toContain('5 unidades previstas');
    expect(el('stat-units').textContent).toBe('29');
    const row=el('event-material-list').querySelector('[data-material-plan-id]');
    const consume=[...row.querySelectorAll('button')].find(b=>b.textContent==='Registrar uso');
    consume.click();
    expect(el('stat-units').textContent).toBe('24');
    expect(el('report-materials').textContent).toBe('5');
    expect(el('event-material-list').textContent).toContain('Baixa realizada');
    expect(el('event-material-list').querySelector('button')).toBeNull();
  });

  it('mostra ao voluntario somente escalas associadas ao e-mail cadastrado', () => {
    el('go-register').click();
    el('reg-name').value='Voluntário de Teste';
    el('reg-email').value='projeto@exemplo.org';
    el('reg-area').value='Recreação';
    el('reg-consent').checked=true;
    el('volunteer-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('register-back').click();
    entrarAdmin();
    el('scale-sector').value='Recreação';
    el('scale-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    el('admin-back').click();
    el('admin-login-back').click();
    enviarLogin('projeto@exemplo.org','senha-teste');
    el('btn-my-scales').click();
    expect(el('participation-records').textContent).toContain('Tarde de Brincadeiras');
    el('participations-back').click();
    el('btn-confirm').click();
    expect(el('result-status').textContent).toBe('Confirmada');
    el('result-back').click();
    el('side-logout').click();
    entrarAdmin();
    expect(el('report-confirmed').textContent).toBe('1');
  });

  it('teste completo: evento novo, escala, confirmacao, presenca, materiais, relatorios e recarga', async () => {
    // Usar somente dados ficticios: o prototipo nao protege informacoes pessoais.
    el('go-register').click();
    el('reg-name').value = 'Teste Fluxo Completo';
    el('reg-email').value = 'integracao@exemplo.org';
    el('reg-area').value = 'Recreação';
    el('reg-consent').checked = true;
    el('volunteer-form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
    expect(el('register-feedback').textContent).toContain('Cadastro de TESTE salvo');
    el('register-back').click();

    entrarAdmin();
    el('event-name').value = 'Mutirão Comunitário';
    el('event-date').value = '2026-12-05';
    el('event-start').value = '10:00';
    el('event-end').value = '12:00';
    el('event-place').value = 'Local de demonstração';
    el('event-sector').value = 'Recreação';
    el('event-role').value = 'Apoio na atividade';
    el('cap-recreation').value = '2';
    el('event-form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
    expect(el('stat-events').textContent).toBe('2');

    const created = JSON.parse(localStorage.getItem('entre_nessa_onda_events_demo_v1'))
      .find(event => event.title === 'Mutirão Comunitário');
    expect(created).toBeTruthy();
    expect(created.slotsBySector['Recreação']).toBe(2);

    el('scale-event').value = created.id;
    el('scale-event').dispatchEvent(new Event('change'));
    el('scale-sector').value = 'Recreação';
    el('scale-form').dispatchEvent(new Event('submit', { bubbles:true, cancelable:true }));
    expect(el('stat-assigned').textContent).toBe('1');
    expect(el('assignment-list').textContent).toContain('Teste Fluxo Completo');

    el('admin-back').click();
    el('admin-login-back').click();
    enviarLogin('integracao@exemplo.org', 'senha-ficticia');
    expect(el('screen-escala').classList.contains('active')).toBe(true);
    el('next-month').click();
    expect(el('extra-events').textContent).toContain('Mutirão Comunitário');
    const confirm = [...el('extra-events').querySelectorAll('button')]
      .find(b => b.textContent.includes('Confirmar participação'));
    expect(confirm).toBeTruthy();
    confirm.click();
    expect(el('result-status').textContent).toBe('Confirmada');

    el('result-back').click();
    el('side-logout').click();
    entrarAdmin();
    el('scale-event').value = created.id;
    el('scale-event').dispatchEvent(new Event('change'));
    expect(el('assignment-list').textContent).toContain('Confirmado');

    const attendance = [...el('assignment-list').querySelectorAll('button')]
      .find(b => b.textContent === 'Presente');
    expect(attendance).toBeTruthy();
    attendance.click();
    expect(el('report-attended').textContent).toBe('1');
    expect(el('report-hours').textContent).toBe('2h');

    el('materials-event').value = created.id;
    el('materials-event').dispatchEvent(new Event('change'));
    el('materials-qty').value = '3';
    const initialUnits = Number(el('stat-units').textContent);
    el('event-material-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    expect(Number(el('stat-units').textContent)).toBe(initialUnits);
    const consume = [...el('event-material-list').querySelectorAll('button')]
      .find(b => b.textContent === 'Registrar uso');
    expect(consume).toBeTruthy();
    consume.click();
    expect(Number(el('stat-units').textContent)).toBe(initialUnits-3);
    expect(el('report-materials').textContent).toBe('3');

    // Confere persistencia apos reabrir a aplicacao no mesmo navegador.
    await iniciarPrototipo({ manterDados:true });
    entrarAdmin();
    expect(el('stat-volunteers').textContent).toBe('1');
    expect(el('stat-events').textContent).toBe('2');
    expect(el('stat-assigned').textContent).toBe('1');
    expect(el('report-confirmed').textContent).toBe('1');
    expect(el('report-attended').textContent).toBe('1');
    expect(el('report-hours').textContent).toBe('2h');
    expect(el('report-materials').textContent).toBe('3');
    expect(Number(el('stat-units').textContent)).toBe(initialUnits-3);
  });

});
