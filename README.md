<<<<<<< HEAD
# Sistema de Monitoramento de Segurança em Obras

Projeto acadêmico desenvolvido como parte da disciplina **Desenvolvimento de Sistemas Web**, com o objetivo de simular um ambiente de monitoramento em tempo real para controle de segurança em canteiros de obras.

---

## 1. Objetivo

O sistema visa representar, de forma simplificada, um modelo de monitoramento de segurança baseado em sensores e dispositivos de rastreamento.  
A aplicação permite o **cadastro de pessoas e dispositivos**, bem como a **simulação de movimentações em tempo real**.

---

## 2. Estrutura do Projeto

O projeto foi desenvolvido seguindo o padrão **MVC (Model-View-Controller)**, dividido em:

- **Model:** Gerencia os dados e a persistência local (via `localStorage`);
- **View:** Responsável pela renderização das interfaces e interação com o usuário;
- **Controller:** Faz a ponte entre as ações do usuário e os dados da aplicação.

=======
# Connection-4

Simulação — Segurança em Obras (frontend)

Projeto em estrutura MVC para simular sensores de proximidade, cadastro de pessoas e associação de chips.

# Connection-4

Projeto de simulação para monitoramento de segurança em canteiros de obra.

Este repositório contém o frontend (páginas estáticas e scripts) e o backend (Node/Express + MongoDB) usados para demonstrar rastreamento de dispositivos, zonas e simulação de colaboradores.

## Visão Rápida
- Frontend: páginas em `index.html` e `js/views/*` (MVC simples em JS vanilla)
- Backend: `backend/server.js` com rotas em `backend/routes/*`
- Simulador: `simple_simulator.py` para movimentar dispositivos no mapa

## 📋 INSTRUÇÕES DE EXECUÇÃO (PowerShell)
Execute cada comando em um terminal separado do VS Code.

### 🖥️ TERMINAL 1 - BACKEND
```powershell
cd c:\projetos\Connection-4\backend
node server.js
```
✅ Resultado esperado: Backend rodando na porta 3000

---

### 🌐 TERMINAL 2 - FRONTEND
```powershell
cd c:\projetos\Connection-4
# Use o Live Server do VS Code (clique direito no index.html > Open with Live Server)
# OU execute um servidor simples:
python -m http.server 8000
```
✅ Resultado esperado: Frontend em http://localhost:8000

---


## 🎯 COMO EXECUTAR
1. Abra 3 terminais no VS Code (Terminal > New Terminal)
2. Execute cada comando em um terminal diferente
3. Aguarde cada serviço iniciar antes do próximo
4. Acesse http://localhost:8000 no navegador
5. Vá para "Central de Monitoramento"
6. Execute o simulador para ver movimento

---

## 🔧 ALTERNATIVA - COMANDOS INDIVIDUAIS

### Terminal 1:
```powershell
cd c:\projetos\Connection-4\backend
node server.js
```

### Terminal 2:
Use o Live Server do VS Code ou:
```powershell
cd c:\projetos\Connection-4
python -m http.server 8000
```



---

## Observações
- Se você estiver usando MongoDB local, verifique a string de conexão em `backend/config/database.js`.
- Para desenvolvimento rápido use `Live Server` no VS Code.

----

Arquivo atualizado com instruções de execução (PowerShell). 
