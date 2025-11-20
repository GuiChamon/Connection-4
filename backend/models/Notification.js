const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['UNAUTHORIZED_ACCESS', 'RISK_ZONE_ENTRY', 'DEVICE_OFFLINE', 'EMERGENCY', 'INFO'],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Dados do colaborador (se aplicável)
  workerName: {
    type: String,
    default: null
  },
  workerRole: {
    type: String,
    default: null
  },
  deviceId: {
    type: String,
    default: null
  },
  // Dados da área (se aplicável)
  areaId: {
    type: String,
    default: null
  },
  areaName: {
    type: String,
    default: null
  },
  // Posição no momento do alerta
  position: {
    x: { type: Number },
    y: { type: Number }
  },
  // Informações adicionais
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Status da notificação
  read: {
    type: Boolean,
    default: false
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

// Índices para otimização
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ severity: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ deviceId: 1 });
notificationSchema.index({ areaId: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
