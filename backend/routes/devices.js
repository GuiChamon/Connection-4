const express = require('express');
const router = express.Router();
const Device = require('../models/Device');

// GET /api/devices - Listar todos os dispositivos
router.get('/', async (req, res) => {
  try {
    const devices = await Device.find({ active: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dispositivos',
      error: error.message
    });
  }
});

// GET /api/devices/:id - Buscar dispositivo por ID
router.get('/:id', async (req, res) => {
  try {
    const device = await Device.findOne({ id: req.params.id, active: true });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }
    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar dispositivo',
      error: error.message
    });
  }
});

// POST /api/devices - Criar novo dispositivo
router.post('/', async (req, res) => {
  try {
    const { id, type } = req.body;
    
    // Verificar se ID já existe
    const existingDevice = await Device.findOne({ id: id.toUpperCase() });
    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'ID do dispositivo já existe'
      });
    }
    
    const device = new Device({
      id: id.toUpperCase(),
      type
    });
    
    await device.save();
    
    res.status(201).json({
      success: true,
      message: 'Dispositivo criado com sucesso',
      data: device
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar dispositivo',
      error: error.message
    });
  }
});

// PUT /api/devices/:id - Atualizar dispositivo
router.put('/:id', async (req, res) => {
  try {
    const { type, active } = req.body;
    
    const device = await Device.findOne({ id: req.params.id });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }
    
    // Atualizar dados
    if (type) device.type = type;
    if (active !== undefined) device.active = active;
    
    await device.updateLastSeen();
    
    res.json({
      success: true,
      message: 'Dispositivo atualizado com sucesso',
      data: device
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar dispositivo',
      error: error.message
    });
  }
});

// DELETE /api/devices/:id - Remover dispositivo (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const device = await Device.findOne({ id: req.params.id });
    if (!device || !device.active) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }
    
    // Soft delete
    device.active = false;
    await device.save();
    
    res.json({
      success: true,
      message: 'Dispositivo removido com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao remover dispositivo',
      error: error.message
    });
  }
});

// POST /api/devices/:id/ping - Atualizar último acesso
router.post('/:id/ping', async (req, res) => {
  try {
    const device = await Device.findOne({ id: req.params.id, active: true });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Dispositivo não encontrado'
      });
    }
    
    await device.updateLastSeen();
    
    res.json({
      success: true,
      message: 'Ping registrado',
      data: { lastSeen: device.lastSeen }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar ping',
      error: error.message
    });
  }
});

module.exports = router;