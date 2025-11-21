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
## Conectar com MongoDB Compass (passo a passo)

Se você quiser inspecionar o banco usando o MongoDB Compass, siga estes passos simples:

1. Abra o **MongoDB Compass** no seu computador.
2. Obtenha a string de conexão (URI) usada pelo projeto:
	- Se estiver usando `.env`, abra `backend/.env` e copie o valor de `MONGODB_URI`.
	- Exemplo local simples: `mongodb://127.0.0.1:27017/connection4`
3. No Compass, cole a URI no campo "Paste your connection string (URI)" e clique em **Connect**.
	- Se a sua URI usar autenticação (usuário/senha), inclua as credenciais na string ou use os campos de autenticação do Compass.
	- Para clusters Atlas use a string `mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/myDB` (cole exatamente a string provida pelo Atlas).
4. Após conectar, você verá a lista de bancos; selecione `connection4` (ou o nome indicado na sua URI) e então explore coleções como `people`, `zones`, `devices`, `positions` e `notifications`.


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
- Frontend (quando servido pelo backend): `http://localhost:8000/`



## Observações e troubleshooting
- Se `npm install` falhar com "Could not read package.json", verifique que você está dentro da pasta `backend`.
- Se a migração reclamar de caminhos, o comando correto é `npm run migrate:normalize-uids` executado em `backend`.
- Se o frontend não carregar recursos estáticos (404), reinicie o backend — o servidor agora serve os arquivos estáticos da raiz do projeto.
- Verifique o `.env` em `backend/` para `MONGODB_URI` e outras variáveis de ambiente necessárias.

---



## Exportando dados do banco (backup / versionamento)

Passos para exportar (PowerShell):

```powershell
cd C:\projetos\Connection-4\backend
# defina a URI do Mongo se necessário
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/connection4'
npm run db:export
```

## Importando as extrações (restaurando dados) — MongoDB Compass

Após exportar os arquivos JSON (ex.: `people.json`, `zones.json`), você pode importá‑los em outra instância do MongoDB usando o MongoDB Compass ou `mongoimport`.

Importar via MongoDB Compass (UI):

1. Abra o **MongoDB Compass** e conecte-se ao servidor destino.
2. Selecione o banco de dados de destino (por exemplo `connection4`). Se não existir, o Compass criará ao importar.
3. Para cada arquivo exportado:
	- Clique em **Add Data** → **Import File**.
	- Em **File Type** selecione **JSON**.
	- Em **File** selecione o arquivo (por exemplo `backend/exports/<timestamp>/people.json`).
	- Marque **JSON Array** (o export gera um array de documentos).
	- Em **Select collection** escolha (ou digite) o nome da coleção destino, por exemplo `people`.
	- Clique em **Import**.
4. Se quiser substituir uma coleção existente, clique nos três pontos ao lado da coleção no Compass e escolha **Drop Collection** antes de importar.

