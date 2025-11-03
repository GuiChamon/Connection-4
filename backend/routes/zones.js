const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');

// GET /api/zones - Listar todas as zonas
router.get('/', async (req, res) => {
  try {
    const zones = await Zone.find({ active: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: zones,
      count: zones.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar zonas',
      error: error.message
    });
  }
});

// GET /api/zones/:id - Buscar zona por ID
router.get('/:id', async (req, res) => {
  try {
    const zone = await Zone.findOne({ id: req.params.id, active: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zona não encontrada'
      });
    }
    res.json({
      success: true,
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar zona',
      error: error.message
    });
  }
});

// POST /api/zones - Criar nova zona
router.post('/', async (req, res) => {
  try {
    const { id, name, x, y, r, riskLevel } = req.body;
    
    // Verificar se ID já existe
    const existingZone = await Zone.findOne({ id });
    if (existingZone) {
      return res.status(400).json({
        success: false,
        message: 'ID da zona já existe'
      });
    }
    
    const zone = new Zone({
      id,
      name,
      x,
      y,
      r,
      riskLevel: riskLevel || 'medium'
    });
    
    await zone.save();
    
    res.status(201).json({
      success: true,
      message: 'Zona criada com sucesso',
      data: zone
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar zona',
      error: error.message
    });
  }
});

// PUT /api/zones/:id - Atualizar zona
router.put('/:id', async (req, res) => {
  try {
    const { name, x, y, r, riskLevel, active } = req.body;
    
    const zone = await Zone.findOne({ id: req.params.id });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zona não encontrada'
      });
    }
    
    // Atualizar dados
    if (name) zone.name = name;
    if (x !== undefined) zone.x = x;
    if (y !== undefined) zone.y = y;
    if (r !== undefined) zone.r = r;
    if (riskLevel) zone.riskLevel = riskLevel;
    if (active !== undefined) zone.active = active;
    
    await zone.save();
    
    res.json({
      success: true,
      message: 'Zona atualizada com sucesso',
      data: zone
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar zona',
      error: error.message
    });
  }
});

// DELETE /api/zones/:id - Remover zona (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const zone = await Zone.findOne({ id: req.params.id });
    if (!zone || !zone.active) {
      return res.status(404).json({
        success: false,
        message: 'Zona não encontrada'
      });
    }
    
    // Soft delete
    zone.active = false;
    await zone.save();
    
    res.json({
      success: true,
      message: 'Zona removida com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao remover zona',
      error: error.message
    });
  }
});

// POST /api/zones/check-point - Verificar se ponto está em alguma zona
router.post('/check-point', async (req, res) => {
  try {
    const { x, y } = req.body;
    
    if (x === undefined || y === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas x e y são obrigatórias'
      });
    }
    
    const zones = await Zone.find({ active: true });
    const zonesContainingPoint = [];
    
    for (const zone of zones) {
      if (zone.containsPoint(x, y)) {
        zonesContainingPoint.push(zone);
      }
    }
    
    res.json({
      success: true,
      data: {
        inRiskZone: zonesContainingPoint.length > 0,
        zones: zonesContainingPoint,
        count: zonesContainingPoint.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar ponto',
      error: error.message
    });
  }
});

module.exports = router;