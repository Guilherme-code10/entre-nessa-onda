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
    el('go-admin').click();

    expect(el('screen-admin').classList.contains('active')).toBe(true);
    expect(el('inventory-list').children.length).toBeGreaterThan(0);
  });

  it('mantem o calendario acessivel ao entrar nas escalas', () => {
    enviarLogin('voluntario@exemplo.org', 'senha-de-teste');

    expect(el('calendar-view').hidden).toBe(false);
    expect(el('calendar-view').querySelectorAll('.day').length).toBe(30);
  });

  it('permite cadastrar um evento pelo painel administrativo e localiza no calendario', () => {
    el('go-admin').click();

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
    el('go-admin').click();

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
    el('go-admin').click();
    const demo = el('admin-event-list').querySelector('[data-event-id="demo-event-14"]');
    demo.querySelectorAll('button')[1].click();
    expect(el('event-edit-id').value).toBe('demo-event-14');

    el('event-name').value = 'Evento de Teste Editado';
    el('event-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(el('stat-events').textContent).toBe('1');
    expect(el('admin-event-list').textContent).toContain('Evento de Teste Editado');
  });

});
