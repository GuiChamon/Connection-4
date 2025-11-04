const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  id: {
    type: String,
    required: [true, 'ID da zona é obrigatório'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Nome da zona é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
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
  r: {
    type: Number,
    required: [true, 'Raio da zona é obrigatório'],
    min: [0.01, 'Raio deve ser maior que 0.01'],
    max: [0.5, 'Raio deve ser menor que 0.5']
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'zones'
});

// Index para otimizar busca por ID
zoneSchema.index({ id: 1 });

// Método para verificar se um ponto está dentro da zona
zoneSchema.methods.containsPoint = function(x, y) {
  const dx = x - this.x;
  const dy = y - this.y;
  return Math.sqrt(dx * dx + dy * dy) <= this.r;
};

module.exports = mongoose.model('Zone', zoneSchema);