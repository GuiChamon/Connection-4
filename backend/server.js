require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/auth');
const peopleRoutes = require('./routes/people');
const devicesRoutes = require('./routes/devices');
const zonesRoutes = require('./routes/zones');
const positionsRoutes = require('./routes/positions');
const notificationsRoutes = require('./routes/notifications');

// Importar middlewares
const { authenticate, authorize, optionalAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');

// Conectar ao MongoDB
connectDB();

// Middlewares de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configurado para permitir o frontend
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8000', 'http://127.0.0.1:8000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware de logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Middleware para parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para log de requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Servir frontend estático (arquivos em ../ i.e., raiz do workspace)
app.use(express.static(path.join(__dirname, '..')));

// Fallback para Single Page App: servir index.html para rotas que não começam com /api
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/people', authenticate, peopleRoutes);
app.use('/api/devices', authenticate, devicesRoutes);
app.use('/api/zones', authenticate, zonesRoutes);
app.use('/api/positions', authenticate, positionsRoutes);
app.use('/api/notifications', authenticate, notificationsRoutes);

// Rota de status da API
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Connection-4 API está funcionando!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'MongoDB conectado',
    version: '1.0.0'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🏗️ Connection-4 Backend API',
    version: '1.0.0',
    documentation: '/api/status',
    endpoints: {
      auth: '/api/auth (register, login, logout, verify)',
      people: '/api/people (protegida)',
      devices: '/api/devices (protegida)',
      zones: '/api/zones (protegida)',
      positions: '/api/positions (protegida)'
    }
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  console.error('❌ Erro no servidor:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log('\n🚀 ===== CONNECTION-4 BACKEND INICIADO =====');
  console.log(`📡 Servidor rodando na porta: ${PORT}`);
  console.log(`🌐 URL da API: http://localhost:${PORT}`);
  console.log(`📊 Status: http://localhost:${PORT}/api/status`);
  console.log(`🗄️  MongoDB: ${process.env.MONGODB_URI}`);
  console.log(`🧭 MongoDB Compass: ${process.env.MONGODB_URI}`);
  console.log('🎯 Endpoints disponíveis:');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/login');
  console.log('   - GET  /api/auth/me');
  console.log('   - POST /api/auth/verify');
  console.log('   - GET  /api/people (🔒 protegida)');
  console.log('   - POST /api/people (🔒 protegida)');
  console.log('   - GET  /api/devices (🔒 protegida)');
  console.log('   - POST /api/devices (🔒 protegida)');
  console.log('   - GET  /api/zones (🔒 protegida)');
  console.log('   - POST /api/zones (🔒 protegida)');
  console.log('   - POST /api/zones/activate-device (🔒 protegida) 🆕');
  console.log('   - GET  /api/positions (🔒 protegida)');
  console.log('   - POST /api/positions (🔒 protegida)');
  console.log('   - GET  /api/notifications (🔒 protegida)');
  console.log('==========================================\n');
});

// ===== Background sweeper: marcar dispositivos offline automaticamente =====
const Device = require('./models/Device');
const Zone = require('./models/Zone');

// Tempo limite em segundos sem heartbeat para considerar device OFFLINE
const OFFLINE_THRESHOLD_SECONDS = Number(process.env.OFFLINE_THRESHOLD_SECONDS) || 20;
// Intervalo do sweeper em segundos
const SWEEPER_INTERVAL_SECONDS = Number(process.env.SWEEPER_INTERVAL_SECONDS) || 10;

async function checkOfflineDevices() {
  try {
    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_SECONDS * 1000);
    // Buscar dispositivos que estão marcados como online, mas com lastSeen anterior ao cutoff
    const candidates = await Device.find({ connectionStatus: 'online' });

    for (const dev of candidates) {
      if (!dev.lastSeen || dev.lastSeen < cutoff) {
        console.log(`⚠️ Device ${dev.id} parece estar offline (lastSeen=${dev.lastSeen}). Marcando offline.`);
        try {
          await dev.markOffline();

          // Atualizar zonas vinculadas a esse device (se houver)
          const zones = await Zone.find({ deviceId: dev.id });
          for (const z of zones) {
            z.currentlyActive = false;
            z.connectionStatus = 'offline';
            await z.save();
            console.log(`   → Zona ${z.id} atualizada para offline por causa do device ${dev.id}`);
          }
        } catch (err) {
          console.error(`Erro ao marcar device ${dev.id} offline:`, err);
        }
      }
    }
  } catch (error) {
    console.error('Erro no sweeper de devices offline:', error);
  }
}

// Iniciar sweeper em background
setInterval(() => {
  checkOfflineDevices();
}, SWEEPER_INTERVAL_SECONDS * 1000);


// Tratamento de sinais para graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

module.exports = app;