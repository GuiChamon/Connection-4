const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'ID do dispositivo é obrigatório'],
    trim: true,
    uppercase: true
  },
  areaId: {
    type: String,
    default: null,
    trim: true
  },
  areaName: {
    type: String,
    default: null,
    trim: true
  },
  x: {
    type: Number,
    required: [true, 'Coordenada X é obrigatória'],
    min: [0, 'Coordenada X deve ser entre 0 e 1'],
    max: [1, 'Coordenada X deve ser entre 0 e 1']
  },
  y: {
    type: Number,
    required: [true, 'Coordenada Y é obrigatória'],
    min: [0, 'Coordenada Y deve ser entre 0 e 1'],
    max: [1, 'Coordenada Y deve ser entre 0 e 1']
  },
  estimatedX: {
    type: Number,
    min: [0, 'estimatedX deve ser entre 0 e 1'],
    max: [1, 'estimatedX deve ser entre 0 e 1'],
    default: null
  },
  estimatedY: {
    type: Number,
    min: [0, 'estimatedY deve ser entre 0 e 1'],
    max: [1, 'estimatedY deve ser entre 0 e 1'],
    default: null
  },
  areaCenter: {
    type: {
      x: { type: Number, min: 0, max: 1 },
      y: { type: Number, min: 0, max: 1 }
    },
    default: null
  },
  distanceCm: {
    type: Number,
    min: [0, 'distanceCm deve ser >= 0'],
    default: null
  },
  deviceTimestamp: {
    type: Number,
    default: null,
    description: 'Timestamp em milissegundos informado pelo dispositivo (millis())'
  },
  source: {
    type: String,
    enum: ['rfid', 'ultrasonic', 'manual', 'unknown'],
    default: 'unknown'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  inRiskZone: {
    type: Boolean,
    default: false
  },
  alertGenerated: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'positions'
});

// Index composto para otimizar busca por dispositivo e timestamp
positionSchema.index({ deviceId: 1, timestamp: -1 });
positionSchema.index({ deviceId: 1 });

// Método estático para obter última posição de um dispositivo
positionSchema.statics.getLatestPosition = function(deviceId) {
  return this.findOne({ deviceId: deviceId })
    .sort({ timestamp: -1 })
    .exec();
};

// Método estático para obter posições de todos os dispositivos
positionSchema.statics.getAllLatestPositions = async function() {
  const pipeline = [
    { $sort: { deviceId: 1, timestamp: -1 } },
    { $group: {
        _id: '$deviceId',
        latestPosition: { $first: '$$ROOT' }
      }
    },
    { $replaceRoot: { newRoot: '$latestPosition' } }
  ];
  
  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Position', positionSchema);