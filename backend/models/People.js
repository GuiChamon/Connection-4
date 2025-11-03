const mongoose = require('mongoose');

const peopleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  role: {
    type: String,
    required: [true, 'Função é obrigatória'],
    trim: true,
    maxlength: [50, 'Função não pode ter mais de 50 caracteres']
  },
  deviceId: {
    type: String,
    default: null,
    trim: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  collection: 'people'
});

// Index para otimizar busca por deviceId
peopleSchema.index({ deviceId: 1 });

// Método para encontrar pessoa por deviceId
peopleSchema.statics.findByDevice = function(deviceId) {
  return this.findOne({ deviceId: deviceId, active: true });
};

module.exports = mongoose.model('People', peopleSchema);