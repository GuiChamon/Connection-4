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

// POST /api/positions - Atualizar posição de um dispositivo
router.post('/', async (req, res) => {
  try {
    const { deviceId, x, y } = req.body;
    
    if (!deviceId || x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'deviceId, x e y são obrigatórios'
      });
    }
    
    // Verificar se está em zona de risco
    const zones = await Zone.find({ active: true });
    let inRiskZone = false;
    let alertGenerated = false;
    
    for (const zone of zones) {
      if (zone.containsPoint(x, y)) {
        inRiskZone = true;
        alertGenerated = true; // Gerar alerta quando entrar em zona de risco
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
    
    res.status(201).json({
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
    
    // Verificar se está em zona de risco
    const zones = await Zone.find({ active: true });
    let inRiskZone = false;
    let alertGenerated = false;
    
    for (const zone of zones) {
      if (zone.containsPoint(x, y)) {
        inRiskZone = true;
        alertGenerated = true;
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