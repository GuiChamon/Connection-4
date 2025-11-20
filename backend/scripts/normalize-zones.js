// backend/scripts/normalize-zones.js
// Script para normalizar campos x,y,width,height das zonas para 2 casas decimais

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const Zone = require('../models/Zone');

function normalizeCoord(value) {
  if (value === undefined || value === null) return value;
  const n = Number(parseFloat(value));
  if (Number.isNaN(n)) return 0;
  const clamped = Math.min(1, Math.max(0, n));
  return Number(clamped.toFixed(2));
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/connection4';
  console.log('Conectando em', uri);
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  try {
    const zones = await Zone.find({});
    console.log(`Encontradas ${zones.length} zonas`);
    for (const zone of zones) {
      const before = { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
      zone.x = normalizeCoord(zone.x);
      zone.y = normalizeCoord(zone.y);
      zone.width = zone.width !== undefined && zone.width !== null ? Number(Number(zone.width).toFixed(2)) : zone.width;
      zone.height = zone.height !== undefined && zone.height !== null ? Number(Number(zone.height).toFixed(2)) : zone.height;
      await zone.save();
      const after = { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
      console.log(`Zona ${zone.id}:`, before, '=>', after);
    }
    console.log('Normalização concluída.');
  } catch (err) {
    console.error('Erro durante normalização:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
