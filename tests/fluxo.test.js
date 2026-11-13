// @vitest-environment jsdom

import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync('Prótoipo/index.html', 'utf8');

const el = (id) => document.getElementById(id);

async function iniciarPrototipo() {
  vi.resetModules();

  document.body.innerHTML = html.split('<body>')[1].split('</body>')[0];

  vi.stubGlobal('scrollTo', vi.fn());
  history.replaceState(null, '', '/');
  window.localStorage.clear();

  await import('../Prótoipo/app.js');
}

function entrarAdmin() {
  el('go-admin').click();
  el('email').value='admin@entrenessaonda.demo';
  el('password').value='Onda2026!';
  el('login-form').dispatchEvent(
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

  it('apresenta login de administrador separado do voluntario', () => {
    el('role-admin').click();

    expect(el('admin-demo-credentials').hidden).toBe(false);
    expect(el('login-submit-label').textContent).toContain('administração');
    enviarLogin('pessoa@exemplo.org','123456');

    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('login-error').classList.contains('show')).toBe(true);

    el('email').value='admin@entrenessaonda.demo';
    el('password').value='Onda2026!';
    el('login-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));

    expect(el('screen-admin').classList.contains('active')).toBe(true);
    el('admin-back').click();
    expect(el('screen-login').classList.contains('active')).toBe(true);
  });

  it('voluntario nao entra no admin pelo menu sem o login de teste', () => {
    enviarLogin('voluntario@exemplo.org','123456');
    el('side-admin').click();
    expect(el('screen-admin').classList.contains('active')).toBe(false);
    expect(el('screen-login').classList.contains('active')).toBe(true);
    expect(el('role-admin').getAttribute('aria-pressed')).toBe('true');
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

});
