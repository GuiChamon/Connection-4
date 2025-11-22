const express = require('express');
const router = express.Router();
const People = require('../models/People');
const Device = require('../models/Device');

const normalizeDeviceId = (value) => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.toUpperCase() : null;
};

const ensureDeviceRecord = async (deviceId) => {
  const normalized = normalizeDeviceId(deviceId);
  if (!normalized) return null;

  let device = await Device.findOne({ id: normalized });
  if (!device) {
    device = new Device({
      id: normalized,
      type: 'worker',
      active: true,
      connectionStatus: 'online',
      lastSeen: new Date()
    });
  } else {
    device.type = device.type || 'worker';
    device.active = true;
    device.connectionStatus = 'online';
    device.lastSeen = new Date();
  }
  await device.save();
  return device;
};

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

// GET /api/people/device/:deviceId - Buscar pessoa por deviceId
router.get('/device/:deviceId', async (req, res) => {
  try {
    const normalizedDeviceId = normalizeDeviceId(req.params.deviceId);
    if (!normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId inválido'
      });
    }

    const person = await People.findByDevice(normalizedDeviceId);
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

// POST /api/people/register-card - Cadastro rápido enviado pelo ESP8266
router.post('/register-card', async (req, res) => {
  try {
    const { deviceId, name, role } = req.body;
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    if (!normalizedDeviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId é obrigatório'
      });
    }
    const existingPerson = await People.findByDevice(normalizedDeviceId);

    if (existingPerson) {
      await ensureDeviceRecord(normalizedDeviceId);
      return res.json({
        success: true,
        message: 'Cartão já cadastrado',
        data: existingPerson,
        alreadyExists: true
      });
    }

    const fallbackLabel = normalizedDeviceId.replace(/\s+/g, '');
    const personName = (name && name.trim().length > 0) ? name.trim() : `Cartão ${fallbackLabel}`;
    const personRole = (role && role.trim().length > 0) ? role.trim() : 'Pendente';

    const person = new People({
      name: personName,
      role: personRole,
      deviceId: normalizedDeviceId,
      accessLevel: 1
    });

    await person.save();
    if (normalizedDeviceId) {
      await ensureDeviceRecord(normalizedDeviceId);
    }
    await ensureDeviceRecord(normalizedDeviceId);

    return res.status(201).json({
      success: true,
      message: 'Cartão registrado com sucesso',
      data: person,
      alreadyExists: false
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Erro ao registrar cartão',
      error: error.message
    });
  }
});

// POST /api/people - Criar nova pessoa
router.post('/', async (req, res) => {
  try {
    const { name, role, deviceId, accessLevel = 1 } = req.body;
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    
    // Validar se deviceId já está em uso
    if (normalizedDeviceId) {
      const existingPerson = await People.findByDevice(normalizedDeviceId);
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
      deviceId: normalizedDeviceId,
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
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    
    // Verificar se pessoa existe
    const person = await People.findById(req.params.id);
    if (!person || !person.active) {
      return res.status(404).json({
        success: false,
        message: 'Pessoa não encontrada'
      });
    }
    
    // Validar se deviceId já está em uso (por outra pessoa)
    if (normalizedDeviceId && normalizedDeviceId !== person.deviceId) {
      const existingPerson = await People.findByDevice(normalizedDeviceId);
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
    if (deviceId !== undefined) {
      person.deviceId = normalizedDeviceId;
    }
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
    if (person.deviceId) {
      await ensureDeviceRecord(person.deviceId);
    }
    
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