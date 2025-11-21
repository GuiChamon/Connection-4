<<<<<<< HEAD
# Sistema de Monitoramento de Segurança em Obras

Projeto acadêmico desenvolvido como parte da disciplina **Desenvolvimento de Sistemas Web**, com o objetivo de simular um ambiente de monitoramento em tempo real para controle de segurança em canteiros de obras.

---

## 1. Objetivo

O sistema visa representar, de forma simplificada, um modelo de monitoramento de segurança baseado em sensores e dispositivos de rastreamento.  
A aplicação permite o **cadastro de pessoas e dispositivos**, bem como a **simulação de movimentações em tempo real**.

---

# Connection-4

Simulação — Sistema de Monitoramento de Segurança em Obras

Este repositório contém o frontend (páginas estáticas e scripts) e o backend (Node/Express + MongoDB). As instruções abaixo mostram como preparar e executar o sistema localmente no Windows (PowerShell).

## Requisitos
- Node.js (v16+ recomendado) e npm
- MongoDB (local ou remoto) e a string de conexão em `MONGODB_URI` no `.env` dentro de `backend/`
- (Opcional) Python se preferir servir o frontend separadamente

## Passos rápidos (PowerShell)

1) Instalar dependências do backend

```powershell
cd C:\projetos\Connection-4\backend
npm install
```

2) (Opcional) Normalizar UIDs no banco (faça backup antes)

```powershell
# Defina MONGODB_URI se necessário
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/connection4'
npm run migrate:normalize-uids
```

3) Iniciar backend (modo desenvolvimento)

```powershell
# dentro de C:\projetos\Connection-4\backend
npm run dev
```

O backend serve o frontend estático em `http://localhost:3000/` — após iniciar o servidor, abra essa URL no navegador.

Se preferir servir o frontend separadamente (não necessário se backend estiver servindo):

```powershell
cd C:\projetos\Connection-4
# usar Live Server do VS Code ou:
python -m http.server 8000
# então abra http://localhost:8000/
```

## URLs úteis
- Backend API: `http://localhost:3000/api/`
- Status da API: `http://localhost:3000/api/status`
- Frontend (quando servido pelo backend): `http://localhost:3000/`

## Executando o simulador

O simulador `simple_simulator.py` pode ser usado para movimentar dispositivos de teste no mapa. Antes de executar, verifique se o backend está rodando e a variável `MONGODB_URI` configurada.

Exemplo (PowerShell):

```powershell
cd C:\projetos\Connection-4
python simple_simulator.py
```

## Observações e troubleshooting
- Se `npm install` falhar com "Could not read package.json", verifique que você está dentro da pasta `backend`.
- Se a migração reclamar de caminhos, o comando correto é `npm run migrate:normalize-uids` executado em `backend`.
- Se o frontend não carregar recursos estáticos (404), reinicie o backend — o servidor agora serve os arquivos estáticos da raiz do projeto.
- Verifique o `.env` em `backend/` para `MONGODB_URI` e outras variáveis de ambiente necessárias.

---

Se quiser, eu posso também adicionar um script PowerShell `run-all.ps1` que automatiza os passos (instala, migra e inicia o backend). Deseja que eu crie esse script? 
