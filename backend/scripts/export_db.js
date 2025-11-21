// backend/scripts/export_db.js
// Exporta coleções principais para arquivos JSON em backend/exports/<timestamp>/

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const People = require('../models/People');
const Device = require('../models/Device');
const Zone = require('../models/Zone');
const Position = require('../models/Position');
const Notification = require('../models/Notification');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/connection4';

async function exportCollection(model, filename) {
  const docs = await model.find({}).lean();
  fs.writeFileSync(filename, JSON.stringify(docs, null, 2));
  console.log(`Exported ${docs.length} documents to ${filename}`);
}

async function main() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const outDir = path.join(__dirname, '..', 'exports', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(outDir, { recursive: true });

    await exportCollection(People, path.join(outDir, 'people.json'));
    await exportCollection(Device, path.join(outDir, 'devices.json'));
    await exportCollection(Zone, path.join(outDir, 'zones.json'));
    await exportCollection(Position, path.join(outDir, 'positions.json'));
    await exportCollection(Notification, path.join(outDir, 'notifications.json'));
    await exportCollection(User, path.join(outDir, 'users.json'));

    console.log('Export completed. Files in:', outDir);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error exporting DB:', err);
    process.exit(1);
  }
}

main();
