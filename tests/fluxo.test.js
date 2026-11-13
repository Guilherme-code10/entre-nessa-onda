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

});
