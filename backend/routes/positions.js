const express = require('express');
const router = express.Router();
const Position = require('../models/Position');
const Zone = require('../models/Zone');

const clamp01 = (value) => {
  if (value === null || value === undefined) return null;
  return Math.min(1, Math.max(0, value));
};

const parseCoord = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Number(clamp01(num).toFixed(4));
};

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
    const {
      deviceId,
      x,
      y,
      areaId,
      areaName,
      estimatedX,
      estimatedY,
      areaCenter,
      distanceCm,
      source,
      timestamp,
      deviceTimestamp
    } = req.body;

    if (!deviceId || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, x e y são obrigatórios'
      });
    }

    const parsedX = parseCoord(x);
    const parsedY = parseCoord(y);
    if (parsedX === null || parsedY === null) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas x e y inválidas'
      });
    }

    const parsedEstimatedX = estimatedX !== undefined ? parseCoord(estimatedX) : null;
    const parsedEstimatedY = estimatedY !== undefined ? parseCoord(estimatedY) : null;
    const finalX = parsedEstimatedX !== null ? parsedEstimatedX : parsedX;
    const finalY = parsedEstimatedY !== null ? parsedEstimatedY : parsedY;

    const parsedAreaCenter = areaCenter && typeof areaCenter === 'object'
      ? (() => {
          const centerX = areaCenter.x !== undefined ? parseCoord(areaCenter.x) : null;
          const centerY = areaCenter.y !== undefined ? parseCoord(areaCenter.y) : null;
          if (centerX === null || centerY === null) return null;
          return { x: centerX, y: centerY };
        })()
      : null;

    const parsedDistance = distanceCm !== undefined ? Math.max(0, Number(distanceCm)) : null;
    const parsedDeviceTimestamp = deviceTimestamp !== undefined ? Math.max(0, Number(deviceTimestamp)) : null;
    const allowedSources = ['rfid', 'ultrasonic', 'manual', 'unknown'];
    const resolvedSource = allowedSources.includes(String(source || '').toLowerCase())
      ? String(source).toLowerCase()
      : 'unknown';

    const normalizedDeviceId = deviceId.toUpperCase();

    // Buscar pessoa associada ao dispositivo (Tag RFID)
    const People = require('../models/People');
    const person = await People.findOne({ deviceId: normalizedDeviceId });

    // Verificar se está em zona de risco (verificação retangular) usando coordenadas finais
    const zones = await Zone.find({ active: true });
    let inRiskZone = false;
    let currentZone = null;

    for (const zone of zones) {
      if (finalX >= zone.x && finalX <= (zone.x + zone.width) &&
          finalY >= zone.y && finalY <= (zone.y + zone.height)) {
        currentZone = zone;
        if (zone.isRiskZone && (zone.riskLevel === 'high' || zone.riskLevel === 'critical')) {
          inRiskZone = true;
        }
        break;
      }
    }

    const resolvedAreaId = areaId || (currentZone ? currentZone.id : null);
    const resolvedAreaName = areaName || (currentZone ? currentZone.name : null);

    // Verificar controle de acesso se pessoa estiver cadastrada
    let hasAccess = true;
    let alertMessage = null;
    let alertType = null;

    if (person && resolvedAreaId) {
      const accessControl = require('../middleware/accessControl');
      hasAccess = accessControl.checkAccess(person.role, resolvedAreaId, person.accessLevel || 1);

      if (!hasAccess && inRiskZone) {
        alertType = 'UNAUTHORIZED_ACCESS';
        alertMessage = `ACESSO NÃO AUTORIZADO: ${person.name} (${person.role}) em ${resolvedAreaName || resolvedAreaId}`;
      }
    } else if (!person) {
      alertType = 'UNREGISTERED_DEVICE';
      alertMessage = `Dispositivo não cadastrado: ${deviceId}`;
      hasAccess = false;
    }

    const position = new Position({
      deviceId: normalizedDeviceId,
      areaId: resolvedAreaId,
      areaName: resolvedAreaName,
      x: finalX,
      y: finalY,
      estimatedX: parsedEstimatedX,
      estimatedY: parsedEstimatedY,
      areaCenter: parsedAreaCenter,
      distanceCm: Number.isFinite(parsedDistance) ? parsedDistance : null,
      deviceTimestamp: Number.isFinite(parsedDeviceTimestamp) ? parsedDeviceTimestamp : null,
      source: resolvedSource,
      inRiskZone,
      alertGenerated: !hasAccess
    });

    if (timestamp) {
      const customTimestamp = new Date(timestamp);
      if (!isNaN(customTimestamp.getTime())) {
        position.timestamp = customTimestamp;
      }
    }

    await position.save();
    
    // Atualizar status do dispositivo (lastSeen / connectionStatus)
    try {
      const Device = require('../models/Device');
      const deviceRecord = await Device.findOne({ id: normalizedDeviceId });
      if (deviceRecord) {
        deviceRecord.lastSeen = new Date();
        deviceRecord.connectionStatus = 'online';
        deviceRecord.active = true;
        if (currentZone && currentZone.id) deviceRecord.areaId = currentZone.id;
        await deviceRecord.save();
        console.log(`🔌 Device ${deviceRecord.id} atualizado: lastSeen=${deviceRecord.lastSeen}`);
      }

      // Se a zona atual estiver vinculada a esse device, marcar zona como ativa/online
      if (currentZone && currentZone.deviceId && currentZone.deviceId.toUpperCase() === normalizedDeviceId) {
        currentZone.currentlyActive = true;
        currentZone.lastConnection = new Date();
        currentZone.connectionStatus = 'online';
        await currentZone.save();
        console.log(`📶 Zona ${currentZone.id} marcada como ATIVA via posição do device ${normalizedDeviceId}`);
      }
    } catch (err) {
      console.error('Erro ao atualizar status do device a partir da posição:', err);
    }
    
    // Log detalhado
    console.log('\n📍 Nova posição recebida:');
    console.log(`   Device: ${normalizedDeviceId}`);
    console.log(`   Pessoa: ${person ? person.name : 'Não cadastrado'}`);
    console.log(`   Função: ${person ? person.role : 'N/A'}`);
    console.log(`   Área: ${resolvedAreaName || resolvedAreaId || 'N/A'}`);
    console.log(`   Posição base enviada: (${parsedX.toFixed(4)}, ${parsedY.toFixed(4)})`);
    console.log(`   Posição usada no mapa: (${finalX.toFixed(4)}, ${finalY.toFixed(4)})`);
    if (parsedDistance !== null && Number.isFinite(parsedDistance)) {
      console.log(`   Distância medida: ${parsedDistance.toFixed(1)} cm`);
    }
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
        area: resolvedAreaName || resolvedAreaId,
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