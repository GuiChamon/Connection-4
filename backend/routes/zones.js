const express = require('express');
const router = express.Router();
const Zone = require('../models/Zone');

function clamp01(value) {
  if (value === null || value === undefined) return value;
  return Math.min(1, Math.max(0, Number(value)));
}

function escapeRegex(str = '') {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function parseNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function computeZoneCenter(zone) {
  if (!zone) return { x: 0.5, y: 0.5 };
  const fallbackX = Number(zone.x || 0) + Number(zone.width || 0) / 2;
  const fallbackY = Number(zone.y || 0) + Number(zone.height || 0) / 2;
  const centerX = zone.centerX !== null && zone.centerX !== undefined ? zone.centerX : fallbackX;
  const centerY = zone.centerY !== null && zone.centerY !== undefined ? zone.centerY : fallbackY;
  return {
    x: Number(clamp01(centerX).toFixed(4)),
    y: Number(clamp01(centerY).toFixed(4))
  };
}

function buildZoneResponse(zoneDoc) {
  if (!zoneDoc) return null;
  const zone = zoneDoc.toObject ? zoneDoc.toObject() : zoneDoc;
  const center = computeZoneCenter(zone);
  const sensorConfig = {
    orientationDeg: zone.orientationDeg ?? 0,
    offset: {
      x: Number(zone.sensorOffsetX || 0),
      y: Number(zone.sensorOffsetY || 0)
    },
    scaleCmPerUnit: zone.scaleCmPerUnit || 100,
    measurementUnit: zone.measurementUnit || 'normalized'
  };

  return {
    ...zone,
    computedCenter: center,
    sensorConfig
  };
}

// Helper: normaliza coordenadas x/y para 2 casas decimais e limita entre 0 e 1
function normalizeCoord(value) {
  if (value === undefined || value === null) return value;
  const n = Number(parseFloat(value));
  if (Number.isNaN(n)) return 0;
  // Limita entre 0 e 1
  const clamped = Math.min(1, Math.max(0, n));
  // Arredonda para 2 casas decimais
  return Number(clamped.toFixed(2));
}

// GET /api/zones - Listar todas as zonas
router.get('/', async (req, res) => {
  try {
    const zones = await Zone.find({ active: true }).sort({ createdAt: -1 });
    const formatted = zones.map(buildZoneResponse);
    res.json({
      success: true,
      data: formatted,
      count: formatted.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar zonas',
      error: error.message
    });
  }
});

// GET /api/zones/device/:deviceId - Buscar zona associada a um device
router.get('/device/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId é obrigatório'
      });
    }

    const normalizedDeviceId = deviceId.trim();
    const zone = await Zone.findOne({
      deviceId: { $regex: new RegExp(`^${escapeRegex(normalizedDeviceId)}$`, 'i') }
    });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: `Nenhuma zona vinculada ao deviceId ${deviceId}`
      });
    }

    res.json({
      success: true,
      data: buildZoneResponse(zone)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar zona pelo deviceId',
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
      data: buildZoneResponse(zone)
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
    console.log('📥 POST /api/zones - Body recebido:', JSON.stringify(req.body, null, 2));
    
    let { id, name, x, y, width, height, color, icon, deviceId, isRiskZone, riskLevel, description,
      centerX, centerY, orientationDeg, sensorOffsetX, sensorOffsetY, sensorOffset, scaleCmPerUnit, measurementUnit } = req.body;
    // normalizar coordenadas recebidas
    x = normalizeCoord(x);
    y = normalizeCoord(y);
    const parsedCenterX = centerX !== undefined ? normalizeCoord(centerX) : null;
    const parsedCenterY = centerY !== undefined ? normalizeCoord(centerY) : null;
    const parsedSensorOffsetX = sensorOffset && sensorOffset.x !== undefined ? parseNumber(sensorOffset.x, 0) : parseNumber(sensorOffsetX, 0);
    const parsedSensorOffsetY = sensorOffset && sensorOffset.y !== undefined ? parseNumber(sensorOffset.y, 0) : parseNumber(sensorOffsetY, 0);
    const parsedOrientation = parseNumber(orientationDeg, 0);
    const parsedScale = parseNumber(scaleCmPerUnit, 100);
    const parsedMeasurementUnit = measurementUnit && ['normalized', 'meters'].includes(String(measurementUnit).toLowerCase())
      ? String(measurementUnit).toLowerCase()
      : 'normalized';
    
    // Validar campos obrigatórios
    if (!id || !name) {
      console.log('❌ Validação falhou:', { id, name });
      return res.status(400).json({
        success: false,
        message: 'ID e Nome são obrigatórios',
        details: { 
          id: !id ? 'ID ausente' : 'OK', 
          name: !name ? 'Nome ausente' : 'OK',
          receivedBody: req.body 
        }
      });
    }
    
    // Verificar se ID já existe
    const existingZone = await Zone.findOne({ id });
    if (existingZone) {
      console.log('❌ ID já existe:', id);
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
      width: width || 0.10,
      height: height || 0.10,
      color: color || '#28a745',
      icon: icon || '📍',
      deviceId: deviceId || null,
      isRiskZone: isRiskZone || false,
      riskLevel: riskLevel || 'none',
      description: description || '',
      centerX: parsedCenterX,
      centerY: parsedCenterY,
      orientationDeg: parsedOrientation,
      sensorOffsetX: parsedSensorOffsetX,
      sensorOffsetY: parsedSensorOffsetY,
      scaleCmPerUnit: parsedScale || 100,
      measurementUnit: parsedMeasurementUnit
    });
    
    await zone.save();
    
    res.status(201).json({
      success: true,
      message: 'Zona criada com sucesso',
      data: buildZoneResponse(zone)
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
    const { name } = req.body;
    let { x, y, width, height, color, icon, deviceId, isRiskZone, riskLevel, active, description,
      centerX, centerY, orientationDeg, sensorOffsetX, sensorOffsetY, sensorOffset, scaleCmPerUnit, measurementUnit } = req.body;
    // normalizar coordenadas quando atualizando
    if (x !== undefined) x = normalizeCoord(x);
    if (y !== undefined) y = normalizeCoord(y);
    const parsedCenterX = centerX === null ? null : (centerX !== undefined ? normalizeCoord(centerX) : undefined);
    const parsedCenterY = centerY === null ? null : (centerY !== undefined ? normalizeCoord(centerY) : undefined);
    const parsedSensorOffsetX = sensorOffset && sensorOffset.x !== undefined ? parseNumber(sensorOffset.x, 0) : (sensorOffsetX !== undefined ? parseNumber(sensorOffsetX, 0) : undefined);
    const parsedSensorOffsetY = sensorOffset && sensorOffset.y !== undefined ? parseNumber(sensorOffset.y, 0) : (sensorOffsetY !== undefined ? parseNumber(sensorOffsetY, 0) : undefined);
    const parsedOrientation = orientationDeg !== undefined ? parseNumber(orientationDeg, 0) : undefined;
    const parsedScale = scaleCmPerUnit !== undefined ? parseNumber(scaleCmPerUnit, 100) : undefined;
    const parsedMeasurementUnit = measurementUnit && ['normalized', 'meters'].includes(String(measurementUnit).toLowerCase())
      ? String(measurementUnit).toLowerCase()
      : undefined;
    
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
    if (width !== undefined) zone.width = width;
    if (height !== undefined) zone.height = height;
    if (color) zone.color = color;
    if (icon) zone.icon = icon;
    if (deviceId !== undefined) zone.deviceId = deviceId;
    if (isRiskZone !== undefined) zone.isRiskZone = isRiskZone;
    if (riskLevel) zone.riskLevel = riskLevel;
    if (active !== undefined) zone.active = active;
    if (description !== undefined) zone.description = description;
    if (parsedCenterX !== undefined) zone.centerX = parsedCenterX;
    if (parsedCenterY !== undefined) zone.centerY = parsedCenterY;
    if (parsedOrientation !== undefined) zone.orientationDeg = parsedOrientation;
    if (parsedSensorOffsetX !== undefined) zone.sensorOffsetX = parsedSensorOffsetX;
    if (parsedSensorOffsetY !== undefined) zone.sensorOffsetY = parsedSensorOffsetY;
    if (parsedScale !== undefined) zone.scaleCmPerUnit = parsedScale;
    if (parsedMeasurementUnit !== undefined) zone.measurementUnit = parsedMeasurementUnit;
    
    await zone.save();
    
    res.json({
      success: true,
      message: 'Zona atualizada com sucesso',
      data: buildZoneResponse(zone)
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar zona',
      error: error.message
    });
  }
});

// PATCH /api/zones/:id/position - Atualizar apenas posição (para drag & drop)
router.patch('/:id/position', async (req, res) => {
  try {
    let { x, y } = req.body;
    // normalizar coordenadas da posição
    x = normalizeCoord(x);
    y = normalizeCoord(y);

    const zone = await Zone.findOne({ id: req.params.id, active: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zona não encontrada'
      });
    }
    
    zone.x = x;
    zone.y = y;
    await zone.save();
    
    res.json({
      success: true,
      message: 'Posição atualizada',
      data: { id: zone.id, x: zone.x, y: zone.y }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao atualizar posição',
      error: error.message
    });
  }
});

// POST /api/zones/:id/link-device - Vincular dispositivo à zona
router.post('/:id/link-device', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    const zone = await Zone.findOne({ id: req.params.id, active: true });
    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Zona não encontrada'
      });
    }
    
    zone.deviceId = deviceId;
    await zone.save();
    
    res.json({
      success: true,
      message: 'Dispositivo vinculado com sucesso',
      data: zone
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao vincular dispositivo',
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
      // Verificar se ponto está dentro da área retangular
      if (x >= zone.x && x <= (zone.x + zone.width) &&
          y >= zone.y && y <= (zone.y + zone.height)) {
        zonesContainingPoint.push(zone);
      }
    }
    
    res.json({
      success: true,
      data: {
        inRiskZone: zonesContainingPoint.some(z => z.isRiskZone),
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

// POST /api/zones/activate-device - Marcar área como "em uso" pelo ESP8266
router.post('/activate-device', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    console.log('\n🔄 ===== ATIVAÇÃO DE ÁREA =====');
    console.log('Body recebido:', JSON.stringify(req.body));
    console.log('Device ID:', deviceId);
    
    if (!deviceId) {
      console.log('❌ deviceId ausente!');
      return res.status(400).json({
        success: false,
        message: 'deviceId é obrigatório'
      });
    }

    console.log(`🔍 Buscando zonas com deviceId vinculado...`);

    // Buscar TODAS as zonas (não apenas as com deviceId)
    const allZones = await Zone.find({});
    console.log(`📦 Total de zonas no banco: ${allZones.length}`);
    
    // Filtrar zonas com deviceId vinculado
    const deviceZones = allZones.filter(z => z.deviceId !== null && z.deviceId !== undefined);
    console.log(`📡 Zonas com dispositivos: ${deviceZones.length}`);
    deviceZones.forEach(z => {
      console.log(`   - ${z.name} (${z.id}): deviceId="${z.deviceId}"`);
    });
    
    // ✅ PRIMEIRO: Desativar dispositivos das outras áreas
    const Device = require('../models/Device');
    const otherDeviceIds = deviceZones
      .filter(z => z.deviceId !== deviceId)
      .map(z => z.deviceId);
    
    for (const otherDeviceId of otherDeviceIds) {
      try {
        const otherDevice = await Device.findOne({ id: otherDeviceId.toUpperCase() });
        if (otherDevice) {
          otherDevice.active = false;
          otherDevice.connectionStatus = 'offline';
          await otherDevice.save();
          console.log(`⚪ Dispositivo "${otherDeviceId}" marcado como OFFLINE`);
        } else {
          console.log(`⚠️ Dispositivo "${otherDeviceId}" não encontrado na coleção devices (zona órfã)`);
        }
      } catch (err) {
        console.error(`❌ Erro ao desativar dispositivo "${otherDeviceId}":`, err.message);
        // Continuar mesmo se falhar para um dispositivo específico
      }
    }
    
    let zoneAtivada = null;
    let countAtivadas = 0;
    let countDesativadas = 0;
    
    // Atualizar cada zona com deviceId
    for (const zone of deviceZones) {
      if (zone.deviceId === deviceId) {
        zone.currentlyActive = true;
        zone.lastConnection = new Date();
        zone.connectionStatus = 'online';
        zoneAtivada = zone;
        countAtivadas++;
        console.log(`✅ Área "${zone.name}" marcada como ATIVA`);
      } else {
        zone.currentlyActive = false;
        // Não altera connectionStatus das outras (mantém como estava)
        countDesativadas++;
        console.log(`⚪ Área "${zone.name}" marcada como INATIVA`);
      }
      await zone.save();
    }
    
    if (!zoneAtivada) {
      console.log(`❌ Nenhuma zona encontrada com deviceId="${deviceId}"`);
      return res.status(404).json({
        success: false,
        message: `Zona com deviceId "${deviceId}" não encontrada`,
        hint: 'Verifique se a zona existe no banco e se o deviceId está correto'
      });
    }

    // ✅ ATUALIZAR STATUS DO DISPOSITIVO NA TABELA DEVICES
    let device = await Device.findOne({ id: deviceId.toUpperCase() });
    
    if (!device) {
      // Criar dispositivo se não existe
      device = new Device({
        id: deviceId.toUpperCase(),
        type: 'sensor',
        active: true,
        connectionStatus: 'online',
        areaId: zoneAtivada.id
      });
      await device.save();
      console.log(`✅ Dispositivo "${deviceId}" criado e marcado como ONLINE`);
    } else {
      device.active = true;
      device.connectionStatus = 'online';
      device.lastSeen = new Date();
      device.areaId = zoneAtivada.id;
      await device.save();
      console.log(`✅ Dispositivo "${deviceId}" atualizado como ONLINE`);
    }

    console.log(`\n📊 Resumo:`);
    console.log(`   Ativadas: ${countAtivadas}`);
    console.log(`   Desativadas: ${countDesativadas}`);
    console.log(`   Zona ativa: ${zoneAtivada.name}`);
    console.log(`   Device status: ${device.connectionStatus}`);
    console.log('==============================\n');

    res.json({
      success: true,
      message: `Área "${zoneAtivada.name}" está agora ativa`,
      data: {
        activated: {
          id: zoneAtivada.id,
          name: zoneAtivada.name,
          deviceId: zoneAtivada.deviceId,
          currentlyActive: zoneAtivada.currentlyActive,
          connectionStatus: zoneAtivada.connectionStatus,
          lastConnection: zoneAtivada.lastConnection
        },
        device: {
          id: device.id,
          active: device.active,
          connectionStatus: device.connectionStatus,
          areaId: device.areaId
        },
        totalDeviceZones: deviceZones.length,
        activatedCount: countAtivadas,
        deactivatedCount: countDesativadas
      }
    });
  } catch (error) {
    console.error('❌ Erro ao ativar área:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao ativar área',
      error: error.message
    });
  }
});

module.exports = router;