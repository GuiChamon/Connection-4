// backend/scripts/normalize_uids.js
// Script simples para normalizar deviceId em People e Zone

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const People = require('../models/People');
const Zone = require('../models/Zone');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connection4';

async function normalize() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Conectado ao MongoDB para normalização de UIDs');

  try {
    const people = await People.find({});
    console.log(`Encontradas ${people.length} pessoas`);
    for (const p of people) {
      if (p.deviceId) {
        const normalized = p.deviceId.toString().replace(/\s+/g, '').toUpperCase();
        if (p.deviceId !== normalized) {
          console.log(`Atualizando Person ${p._id}: ${p.deviceId} -> ${normalized}`);
          p.deviceId = normalized;
        }
      }
      if (!p.accessLevel) p.accessLevel = 1;
      await p.save();
    }

    const zones = await Zone.find({});
    console.log(`Encontradas ${zones.length} zonas`);
    for (const z of zones) {
      if (z.deviceId) {
        const normalized = z.deviceId.toString().replace(/\s+/g, '').toUpperCase();
        if (z.deviceId !== normalized) {
          console.log(`Atualizando Zone ${z.id}: ${z.deviceId} -> ${normalized}`);
          z.deviceId = normalized;
        }
      }
      await z.save();
    }

    console.log('Normalização concluída.');
  } catch (err) {
    console.error('Erro durante normalização:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

normalize();
