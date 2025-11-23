
 # Connection-4 — Sistema de Monitoramento de Segurança em Obras

Projeto acadêmico (FATEC Itapira) para simulação de monitoramento de segurança em canteiros de obras.

Este repositório contém o frontend (páginas estáticas e scripts), o backend (Node/Express + MongoDB) e um simulador para demonstrar rastreamento de dispositivos, zonas de risco e geração de alertas.

Autores / Participantes:
- Guilherme Chamon
- Letícia Souza
- Marco Bubola
- Cauã Lima

## Sumário rápido
- Frontend: `index.html` e `js/views/*` (MVC em JavaScript puro)
- Backend: `backend/server.js` e rotas em `backend/routes/*` (porta padrão: `3000`)
- Simulador: `simple_simulator.py` para movimentar colaboradores no mapa

## Pré-requisitos
- Node.js (v14+ recomendado)
- Python (v3.7+ para o simulador ou `python -m http.server`)
- MongoDB (local ou Atlas) se for usar persistência real

## Como executar (PowerShell)
Abra três terminais (um para backend, um para frontend e um para o simulador).

### 1) Backend
```powershell
cd C:\projetos\Connection-4\backend
npm run dev
```
Esperado: Backend rodando em `http://localhost:3000`.

### 2) Frontend
Opção A (Live Server - VS Code): botão direito em `index.html` → Open with Live Server.
Opção B (servidor simples):
```powershell
cd C:\projetos\Connection-4
python -m http.server 8000
```
Acesse: `http://localhost:8000`.

### 3) Simulador
```powershell
cd C:\projetos\Connection-4
python simple_simulator.py
```
O simulador envia movimentos ao backend; garanta que o backend esteja ativo antes de iniciar o simulador.

## Observações importantes
- Verifique a conexão com o MongoDB em `backend/config/database.js`.
- Para gravar o firmware nos ESPs, use a IDE/PlatformIO e configure o SSID/SENHA e o `SERVER_URL` no sketch localizado em `hardware/ESP8266_RFID_Gateway/...`.
- Logs úteis:
	- Backend: console do Node (`server.js`).
	- Firmware: Serial Monitor (baud padrão configurado no sketch).

## Estrutura de pastas (resumo)
- `backend/` — API Node/Express, modelos Mongoose e rotas.
- `hardware/` — sketches Arduino/ESP (ex.: ESP8266 gateways).
- `js/` — frontend MVC (models, controllers, views).
- `assets/` — CSS, imagens e scripts auxiliares.
- `simple_simulator.py` — script de simulação/local testing.

## Testes locais
- Use os endpoints expostos em `backend/routes/*` para verificar dados (ex.: `/api/people`, `/api/positions`, `/api/notifications`).


## Licença
- Este projeto é fornecido para fins acadêmicos; adicione aqui a licença desejada (ex.: MIT) se for publicar.

