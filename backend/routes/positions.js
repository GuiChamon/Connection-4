const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Zone = require('../models/Zone');

// GET /api/positions - Obter últimas posições de todos os dispositivos
router.get('/', async (req, res) => {
  try {
    const positions = await Position.getAllLatestPositions();
    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar posições',
      error: error.message
    });
  }
});

// GET /api/positions/:deviceId - Obter última posição de um dispositivo
router.get('/:deviceId', async (req, res) => {
  try {
    const position = await Position.getLatestPosition(req.params.deviceId);
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Posição não encontrada para este dispositivo'
      });
    }
    res.json({
      success: true,
      data: position
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar posição',
      error: error.message
    });
  }
});

// GET /api/positions/:deviceId/history - Histórico de posições de um dispositivo
router.get('/:deviceId/history', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const positions = await Position.find({ deviceId: req.params.deviceId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    const total = await Position.countDocuments({ deviceId: req.params.deviceId });
    
    res.json({
      success: true,
      data: positions,
      count: positions.length,
      total,
      pagination: {
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + positions.length) < total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico de posições',
      error: error.message
    });
  }
});

// POST /api/positions - Atualizar posição de um dispositivo (endpoint para ESP32)
router.post('/', async (req, res) => {
  try {
    const { deviceId, x, y, areaId, areaName } = req.body;
    
    if (!deviceId || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, x e y são obrigatórios'
      });
    }
    
    // Buscar pessoa associada ao dispositivo (Tag RFID)
    const People = require('../models/People');
    const person = await People.findOne({ deviceId: deviceId.toUpperCase() });
    
    // Verificar se está em zona de risco (verificação retangular)
    const zones = await Zone.find({ active: true });
    let inRiskZone = false;
    let currentZone = null;
    
    for (const zone of zones) {
      // Verificar se o ponto está dentro do retângulo da zona
      if (x >= zone.x && x <= (zone.x + zone.width) &&
          y >= zone.y && y <= (zone.y + zone.height)) {
        currentZone = zone;
        if (zone.isRiskZone && (zone.riskLevel === 'high' || zone.riskLevel === 'critical')) {
          inRiskZone = true;
        }
        break;
      }
    }
    
    // Verificar controle de acesso se pessoa estiver cadastrada
    let hasAccess = true;
    let alertMessage = null;
    let alertType = null;
    
    if (person && areaId) {
      // Importar lógica de controle de acesso
      const accessControl = require('../middleware/accessControl');
      
      // Verificar se tem autorização para a área
      hasAccess = accessControl.checkAccess(person.role, areaId, person.accessLevel || 1);
      
      if (!hasAccess && inRiskZone) {
        alertType = 'UNAUTHORIZED_ACCESS';
        alertMessage = `ACESSO NÃO AUTORIZADO: ${person.name} (${person.role}) em ${areaName || areaId}`;
      } else if (inRiskZone && hasAccess) {
        alertType = 'RISK_ZONE_AUTHORIZED';
        alertMessage = `${person.name} entrou em zona de risco (autorizado)`;
      }
    } else if (!person) {
      // Dispositivo não cadastrado
      alertType = 'UNREGISTERED_DEVICE';
      alertMessage = `Dispositivo não cadastrado: ${deviceId}`;
      hasAccess = false;
    }
    
    // Criar nova posição
    const position = new Position({
      deviceId: deviceId.toUpperCase(),
      x,
      y,
      inRiskZone,
      alertGenerated: !hasAccess
    });
    
    await position.save();
    
    // Atualizar status do dispositivo (lastSeen / connectionStatus)
    try {
      const Device = require('../models/Device');
      const deviceRecord = await Device.findOne({ id: deviceId.toUpperCase() });
      if (deviceRecord) {
        deviceRecord.lastSeen = new Date();
        deviceRecord.connectionStatus = 'online';
        deviceRecord.active = true;
        if (currentZone && currentZone.id) deviceRecord.areaId = currentZone.id;
        await deviceRecord.save();
        console.log(`🔌 Device ${deviceRecord.id} atualizado: lastSeen=${deviceRecord.lastSeen}`);
      }

      // Se a zona atual estiver vinculada a esse device, marcar zona como ativa/online
      if (currentZone && currentZone.deviceId && currentZone.deviceId.toUpperCase() === deviceId.toUpperCase()) {
        currentZone.currentlyActive = true;
        currentZone.lastConnection = new Date();
        currentZone.connectionStatus = 'online';
        await currentZone.save();
        console.log(`📶 Zona ${currentZone.id} marcada como ATIVA via posição do device ${deviceId}`);
      }
    } catch (err) {
      console.error('Erro ao atualizar status do device a partir da posição:', err);
    }
    
    // Log detalhado
    console.log('\n📍 Nova posição recebida:');
    console.log(`   Device: ${deviceId}`);
    console.log(`   Pessoa: ${person ? person.name : 'Não cadastrado'}`);
    console.log(`   Função: ${person ? person.role : 'N/A'}`);
    console.log(`   Área: ${areaName || areaId || 'N/A'}`);
    console.log(`   Posição: (${x.toFixed(4)}, ${y.toFixed(4)})`);
    console.log(`   Zona de Risco: ${inRiskZone ? '⚠️ SIM' : '✅ NÃO'}`);
    console.log(`   Autorizado: ${hasAccess ? '✅ SIM' : '🚫 NÃO'}`);
    if (alertMessage) {
      console.log(`   🚨 ALERTA: ${alertMessage}`);
    }
    
    // Resposta para ESP32
    res.status(201).json({
      success: true,
      message: 'Posição registrada com sucesso',
      data: {
        position,
        person: person ? {
          name: person.name,
          role: person.role
        } : null,
        area: areaName || areaId,
        authorized: hasAccess
      },
      alert: !hasAccess || alertType ? {
        generated: true,
        type: alertType,
        message: alertMessage,
        severity: !hasAccess && inRiskZone ? 'HIGH' : 'MEDIUM'
      } : {
        generated: false
      },
      alertMessage: alertMessage // Para compatibilidade com ESP32
    });
  } catch (error) {
    console.error('❌ Erro ao processar posição:', error);
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar posição',
      error: error.message
    });
  }
});

// PUT /api/positions/:deviceId - Atualizar posição específica (alternativa ao POST)
router.put('/:deviceId', async (req, res) => {
  try {
    const { x, y } = req.body;
    const deviceId = req.params.deviceId;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas x e y são obrigatórias'
      });
    }
    
    // Verificar se está em zona de risco (verificação retangular)
    const zones = await Zone.find({ active: true });
    let inRiskZone = false;
    let alertGenerated = false;
    
    for (const zone of zones) {
      // Verificar se o ponto está dentro do retângulo da zona
      if (x >= zone.x && x <= (zone.x + zone.width) &&
          y >= zone.y && y <= (zone.y + zone.height)) {
        if (zone.isRiskZone) {
          inRiskZone = true;
          alertGenerated = true;
        }
        break;
      }
    }
    
    // Criar nova posição
    const position = new Position({
      deviceId: deviceId.toUpperCase(),
      x,
      y,
      inRiskZone,
      alertGenerated
    });
    
    await position.save();
    
    res.json({
      success: true,
      message: 'Posição atualizada com sucesso',
      data: position,
      alert: inRiskZone ? {
        type: 'risk_zone_entry',
        message: `Dispositivo ${deviceId} entrou em zona de risco!`,
        deviceId,
        coordinates: { x, y }
      } : null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar posição',
      error: error.message
    });
  }
});

// DELETE /api/positions/:deviceId - Limpar histórico de posições de um dispositivo
router.delete('/:deviceId', async (req, res) => {
  try {
    const result = await Position.deleteMany({ deviceId: req.params.deviceId });
    
    res.json({
      success: true,
      message: `Histórico limpo com sucesso`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar histórico',
      error: error.message
    });
  }
});

// DELETE /api/positions - Limpar todas as posições
router.delete('/', async (req, res) => {
  try {
    const result = await Position.deleteMany({});
    
    res.json({
      success: true,
      message: 'Todas as posições foram limpas',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar posições',
      error: error.message
    });
  }
});

module.exports = router;