const express = require('express');
const router = express.Router();
const People = require('../models/People');

// GET /api/people - Listar todas as pessoas
router.get('/', async (req, res) => {
  try {
    const people = await People.find({ active: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: people,
      count: people.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pessoas',
      error: error.message
    });
  }
});

// GET /api/people/:id - Buscar pessoa por ID
router.get('/:id', async (req, res) => {
  try {
    const person = await People.findById(req.params.id);
    if (!person || !person.active) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }
    res.json({
      success: true,
      data: person
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pessoa',
      error: error.message
    });
  }
});

// GET /api/people/device/:deviceId - Buscar pessoa por deviceId
router.get('/device/:deviceId', async (req, res) => {
  try {
    const person = await People.findByDevice(req.params.deviceId);
    if (!person) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada para este dispositivo'
      });
    }
    res.json({
      success: true,
      data: person
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar pessoa por dispositivo',
      error: error.message
    });
  }
});

// POST /api/people - Criar nova pessoa
router.post('/', async (req, res) => {
  try {
    const { name, role, deviceId, accessLevel = 1 } = req.body;
    
    // Validar se deviceId já está em uso
    if (deviceId) {
      const existingPerson = await People.findByDevice(deviceId);
      if (existingPerson) {
        return res.status(400).json({
          success: false,
          message: 'Este dispositivo já está associado a outra pessoa'
        });
      }
    }
    
    const person = new People({
      name,
      role,
      deviceId: deviceId || null,
      accessLevel: [1, 2, 3].includes(Number(accessLevel)) ? Number(accessLevel) : 1
    });
    
    await person.save();
    
    res.status(201).json({
      success: true,
      message: 'Pessoa criada com sucesso',
      data: person
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar pessoa',
      error: error.message
    });
  }
});

// PUT /api/people/:id - Atualizar pessoa
router.put('/:id', async (req, res) => {
  try {
    const { name, role, deviceId, accessLevel } = req.body;
    
    // Verificar se pessoa existe
    const person = await People.findById(req.params.id);
    if (!person || !person.active) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }
    
    // Validar se deviceId já está em uso (por outra pessoa)
    if (deviceId && deviceId !== person.deviceId) {
      const existingPerson = await People.findByDevice(deviceId);
      if (existingPerson && existingPerson._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Este dispositivo já está associado a outra pessoa'
        });
      }
    }
    
    // Atualizar dados
    person.name = name || person.name;
    person.role = role || person.role;
    person.deviceId = deviceId !== undefined ? deviceId : person.deviceId;
    if (accessLevel !== undefined) {
      if (![1, 2, 3].includes(Number(accessLevel))) {
        return res.status(400).json({
          success: false,
          message: 'Nível de acesso inválido. Use 1, 2 ou 3.'
        });
      }
      person.accessLevel = Number(accessLevel);
    }
    
    await person.save();
    
    res.json({
      success: true,
      message: 'Pessoa atualizada com sucesso',
      data: person
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar pessoa',
      error: error.message
    });
  }
});

// DELETE /api/people/:id - Remover pessoa (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const person = await People.findById(req.params.id);
    if (!person || !person.active) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }
    
    // Soft delete
    person.active = false;
    person.deviceId = null; // Liberar dispositivo
    await person.save();
    
    res.json({
      success: true,
      message: 'Pessoa removida com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao remover pessoa',
      error: error.message
    });
  }
});

module.exports = router;