import { describe, it, expect } from 'vitest';

import {
  validarLogin,
  obterStatusDisponibilidade
} from '../Prótoipo/regras.js';

describe('Testes unitarios - Validacao do login', () => {
  it('aceita e-mail valido com senha preenchida', () => {
    expect(validarLogin(true, '123456')).toBe(true);
  });

  it('rejeita e-mail invalido', () => {
    expect(validarLogin(false, '123456')).toBe(false);
  });

  it('rejeita senha vazia', () => {
    expect(validarLogin(true, '')).toBe(false);
  });

  it('rejeita senha contendo apenas espacos', () => {
    expect(validarLogin(true, '   ')).toBe(false);
  });
});

describe('Testes unitarios - Disponibilidade', () => {
  it('retorna confirmada quando aceita participar', () => {
    expect(obterStatusDisponibilidade(true)).toBe('confirmada');
  });

  it('retorna recusada quando nao pode participar', () => {
    expect(obterStatusDisponibilidade(false)).toBe('recusada');
  });
});
