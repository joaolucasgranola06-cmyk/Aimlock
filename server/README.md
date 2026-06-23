# Servidor de demonstração

Este servidor recebe comandos JSON via socket TCP.

## Como executar

```bash
python3 server/app.py
```

## Comandos suportados

- `ping`: retorna `pong`
- `echo`: devolve o payload recebido
- `status`: devolve o estado do servidor
- `tap`: recebe coordenadas para demonstração
