# Arquitetura do Entre Nessa Onda

## Objetivo
Organizar eventos, setores, escalas e presencas dos voluntarios.

## Arquitetura planejada
Monolitica em camadas:

1. Apresentacao: Angular e TypeScript.
2. Aplicacao: Node.js e Express.
3. Persistencia: PostgreSQL.

## Entidades principais
- usuarios
- setores
- eventos
- escalas

## Fluxo principal
1. O voluntario acessa o sistema.
2. Consulta suas escalas no calendario.
3. Confirma ou recusa sua disponibilidade.
4. Visualiza o resultado da operacao.

## Escopo inicial
Cadastro de voluntarios, setores, calendario, escalas,
confirmacoes e controle de presenca.

## Fora do MVP
Cadastro de criancas, estoque e organograma interativo.

## Estado atual
O repositorio possui um prototipo demonstrativo em HTML.
A aplicacao Angular e a API ainda serao implementadas.
