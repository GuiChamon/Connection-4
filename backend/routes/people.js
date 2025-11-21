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
    // Se a requisição vier de um device (req.deviceId setado pelo middleware authenticate),
    // anexar informações da zona associada ao dispositivo para que o firmware possa
    // decidir localmente sobre alerts (por exemplo requiredLevel).
    const Zone = require('../models/Zone');
    let zoneInfo = null;
    try {
      const requestingDeviceId = req.deviceId || null;
      if (requestingDeviceId) {
        const zones = await Zone.find({ deviceId: requestingDeviceId });
        if (zones && zones.length > 0) {
          const z = zones[0];
          // Mapear riskLevel para requiredLevel (simples heurística)
          const mapRiskToLevel = rl => {
            switch ((rl||'').toLowerCase()) {
              case 'critical': return 3;
              case 'high': return 3;
              case 'medium': return 2;
              case 'low': return 1;
              default: return 1;
            }
          };
          zoneInfo = {
            id: z.id,
            name: z.name,
            isRiskZone: z.isRiskZone,
            riskLevel: z.riskLevel,
            requiredLevel: mapRiskToLevel(z.riskLevel)
          };
        }
      }
    } catch (err) {
      console.error('Erro ao buscar zona para device:', err);
    }

    res.json({
      success: true,
      data: person,
      zone: zoneInfo
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

// POST /api/people/change-level - Alterar nível de acesso (chamado por dispositivos autorizados)
router.post('/change-level', async (req, res) => {
  try {
    // Apenas dispositivos (com token tipo 'device') podem chamar este endpoint via middleware authenticate
    const requestingDeviceId = req.deviceId || null;

    const { cardUid, requestedLevel } = req.body;

    if (!cardUid || requestedLevel === undefined) {
      return res.status(400).json({ success: false, message: 'cardUid e requestedLevel são obrigatórios' });
    }

    const level = Number(requestedLevel);
    if (![1,2,3].includes(level)) {
      return res.status(400).json({ success: false, message: 'requestedLevel inválido. Use 1, 2 ou 3.' });
    }

    // Normalizar UID (remover espaços, maiúsculas) para comparar
    const normalize = s => (s || '').toString().replace(/\s+/g, '').toUpperCase();
    const normalizedCard = normalize(cardUid);

    // Buscar pessoa comparando deviceId normalizado
    const allPeople = await People.find({ active: true });
    const person = allPeople.find(p => normalize(p.deviceId) === normalizedCard || (p.deviceId || '').toUpperCase() === cardUid.toUpperCase());

    if (!person) {
      return res.status(404).json({ success: false, message: 'Pessoa não encontrada para este cartão' });
    }

    // Verificar se o dispositivo requisitante está vinculado a alguma zona
    const Zone = require('../models/Zone');
    const zonesWithDevice = await Zone.find({ deviceId: requestingDeviceId });

    if (!zonesWithDevice || zonesWithDevice.length === 0) {
      return res.status(403).json({ success: false, message: 'Dispositivo não autorizado a alterar níveis (não vinculado a nenhuma zona).' });
    }

    // Opcional: verificar se a zona do dispositivo corresponde à área onde a pessoa costuma operar
    const previousLevel = person.accessLevel || 1;
    person.accessLevel = level;
    await person.save();

    // Registrar audit log (como notificação simples para compatibilidade)
    const Notification = require('../models/Notification');
    const audit = new Notification({
      type: 'INFO',
      severity: 'LOW',
      title: 'Alteração de nível por dispositivo',
      message: `Dispositivo ${requestingDeviceId || 'unknown'} alterou nível de ${person.name} de ${previousLevel} para ${level}`,
      deviceId: requestingDeviceId || null,
      areaId: zonesWithDevice[0] ? zonesWithDevice[0].id : null,
      areaName: zonesWithDevice[0] ? zonesWithDevice[0].name : null,
      workerName: person.name,
      workerRole: person.role,
      metadata: {
        previousLevel,
        newLevel: level,
        cardUid: cardUid
      }
    });
    await audit.save();

    res.json({ success: true, message: 'Nível atualizado com sucesso', data: person });
  } catch (error) {
    console.error('Erro ao alterar nível via dispositivo:', error);
    res.status(500).json({ success: false, message: 'Erro ao alterar nível', error: error.message });
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