export function validarLogin(emailValido, senha) {
  return Boolean(emailValido) && senha.trim().length > 0;
}

export function obterStatusDisponibilidade(confirmada) {
  return confirmada ? 'confirmada' : 'recusada';
}
