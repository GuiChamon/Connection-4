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
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'devices'
});

// Index para otimizar busca por ID
deviceSchema.index({ id: 1 });

// Método para atualizar último acesso
deviceSchema.methods.updateLastSeen = function() {
  this.lastSeen = new Date();
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);