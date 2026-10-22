# Testes funcionais - Entre Nessa Onda

## Ambiente de testes

- Data: 22/10/2026
- Navegador: Google Chrome
- Servidor local: VS Code Live Server
- Aplicacao: Prototipo HTML demonstrativo

## Cenarios testados

### CT01 - E-mail invalido
Entrada: e-mail "teste" e senha preenchida.
Esperado: impedir acesso e exibir erro.
Resultado: APROVADO.

### CT02 - Senha vazia
Entrada: e-mail valido e senha vazia.
Esperado: impedir acesso e exibir erro.
Resultado: APROVADO.

### CT03 - Acesso ao calendario
Entrada: e-mail valido e senha preenchida.
Esperado: apresentar calendario e escalas.
Resultado: APROVADO.

### CT04 - Confirmacao de participacao
Acao: confirmar participacao em uma atividade.
Esperado: apresentar status Confirmada.
Resultado: APROVADO.

### CT05 - Recusa de participacao
Acao: selecionar Nao poderei participar.
Esperado: apresentar status Recusada.
Resultado: APROVADO.

### CT06 - Atualizacao visual no calendario
Acao: retornar ao calendario apos a recusa.
Esperado: apresentar status Recusada na atividade.
Resultado: APROVADO.

## Observacoes

Os testes foram executados manualmente no navegador.

O foco automatico dos campos de login ainda
precisa de verificacao especifica.

O prototipo nao utiliza banco de dados.
As respostas de disponibilidade nao persistem
apos o recarregamento da pagina.

A autenticacao real sera implementada no MVP.
