const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'ID do dispositivo é obrigatório'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'ID não pode ter mais de 20 caracteres']
  },
  type: {
    type: String,
    required: [true, 'Tipo do dispositivo é obrigatório'],
    enum: {
      values: ['worker', 'sensor'],
      message: 'Tipo deve ser "worker" ou "sensor"'
    }
  },
  active: {
    type: Boolean,
    default: true,
    description: 'Indica se o dispositivo está ativo/conectado'
  },
  connectionStatus: {
    type: String,
    enum: ['online', 'offline', 'never_connected'],
    default: 'never_connected',
    description: 'Status da conexão atual'
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    description: 'Última vez que o dispositivo foi visto/conectado'
  },
  areaId: {
    type: String,
    default: null,
    description: 'ID da área onde o dispositivo está localizado'
  }
}, {
  timestamps: true,
  collection: 'devices'
});

// Index para otimizar busca por ID
deviceSchema.index({ id: 1 });
deviceSchema.index({ connectionStatus: 1 });
deviceSchema.index({ active: 1 });

// Método para atualizar último acesso e marcar como online
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  this.connectionStatus = 'online';
  this.active = true;
  return this.save();
};

// Método para marcar como offline
deviceSchema.methods.markOffline = function() {
  this.connectionStatus = 'offline';
  this.active = false;
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);