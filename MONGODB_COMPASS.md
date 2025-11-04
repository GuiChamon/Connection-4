# 🧭 CONEXÃO COM MONGODB COMPASS

## Passo a Passo para Conectar

### 1. **Baixar e Instalar MongoDB Compass**
- Acesse: https://www.mongodb.com/products/compass
- Baixe a versão adequada para seu sistema
- Instale seguindo as instruções

### 2. **Configurar Conexão**
- Abra o MongoDB Compass
- Na tela inicial, na seção "New Connection"
- Use a seguinte URI de conexão:

```
mongodb://localhost:27017/connection4_db
```

### 3. **Detalhes da Conexão**
- **Host:** localhost
- **Port:** 27017
- **Database:** connection4_db
- **Authentication:** None (conexão local)

### 4. **Coleções Disponíveis**
Após conectar, você verá as seguintes collections:

- **📊 `people`** - Dados dos colaboradores
- **📱 `devices`** - Informações dos dispositivos  
- **🗺️ `zones`** - Zonas de risco do mapa
- **📍 `positions`** - Histórico de posições

### 5. **Verificar Dados em Tempo Real**
- Navegue entre as collections
- Use o botão "Refresh" para ver atualizações
- Execute queries personalizadas se necessário

### 6. **Queries Úteis**
```javascript
// Buscar todas as pessoas
db.people.find({})

// Buscar dispositivos ativos
db.devices.find({active: true})

// Buscar posições recentes
db.positions.find().sort({timestamp: -1}).limit(10)

// Verificar zonas de risco
db.zones.find({active: true})
```

### 7. **Monitoramento em Tempo Real**
Para ver as mudanças acontecendo:
1. Abra o sistema web em http://localhost:8000
2. Cadastre pessoas e dispositivos
3. Mova dispositivos no mapa
4. Observe as mudanças no MongoDB Compass (pressione F5 para atualizar)

---

## 🔧 Troubleshooting

**Se não conseguir conectar:**
1. Verifique se o MongoDB está instalado e rodando
2. Confirme se o backend Node.js está ativo (porta 3000)
3. Teste a conexão com: `mongo mongodb://localhost:27017/connection4_db`

**Para instalar MongoDB localmente:**
- Windows: MongoDB Community Server
- macOS: `brew install mongodb-community`
- Linux: Siga a documentação oficial do MongoDB