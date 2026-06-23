# Arquitetura do Projeto

## Visão Geral
O sistema é composto por:
1. Um servidor TCP em Python.
2. Um cliente Android com serviço de acessibilidade.
3. Configurações e documentação separadas.

## Fluxo
1. O servidor escuta conexões.
2. O app Android se conecta ao servidor.
3. O aplicativo recebe comandos em formato JSON.
4. O serviço registra eventos de acessibilidade e responde.

## Regras de Segurança
- Use apenas em dispositivos e apps próprios.
- Não automatize jogos ou sistemas de terceiros sem autorização.
- Configure permissões mínimas necessárias.
