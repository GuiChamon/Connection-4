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
  // Posição no mapa (coordenadas normalizadas 0-1)
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
  // Dimensões da área (largura e altura)
  width: {
    type: Number,
    required: [true, 'Largura da zona é obrigatória'],
    default: 0.10,
    min: [0.05, 'Largura mínima é 0.05'],
    max: [0.5, 'Largura máxima é 0.5']
  },
  height: {
    type: Number,
    required: [true, 'Altura da zona é obrigatória'],
    default: 0.10,
    min: [0.05, 'Altura mínima é 0.05'],
    max: [0.5, 'Altura máxima é 0.5']
  },
  // Propriedades visuais
  color: {
    type: String,
    default: '#28a745',
    trim: true
  },
  icon: {
    type: String,
    default: '📍',
    trim: true
  },
  // Vinculação com dispositivo ESP8266
  deviceId: {
    type: String,
    default: null,
    trim: true
  },
  // Zona de risco
  isRiskZone: {
    type: Boolean,
    default: false
  },
  riskLevel: {
    type: String,
    enum: ['none', 'low', 'medium', 'high', 'critical'],
    default: 'none'
  },
  // Status
  active: {
    type: Boolean,
    default: true
  },
  // Status de uso pelo ESP8266
  currentlyActive: {
    type: Boolean,
    default: false,
    description: 'Indica se esta área está sendo usada pelo ESP8266 agora'
  },
  lastConnection: {
    type: Date,
    default: null,
    description: 'Última vez que o ESP8266 se conectou nesta área'
  },
  connectionStatus: {
    type: String,
    enum: ['online', 'offline', 'never_connected'],
    default: 'never_connected',
    description: 'Status da conexão do ESP8266'
  },
  // Descrição adicional
  description: {
    type: String,
    default: '',
    maxlength: [500, 'Descrição não pode ter mais de 500 caracteres']
  }
}, {
  timestamps: true,
  collection: 'zones'
});

// Index para otimizar busca por ID e deviceId
zoneSchema.index({ id: 1 });
zoneSchema.index({ deviceId: 1 });
zoneSchema.index({ active: 1 });
zoneSchema.index({ currentlyActive: 1 });
zoneSchema.index({ connectionStatus: 1 });

// Método para verificar se um ponto está dentro da zona retangular
zoneSchema.methods.containsPoint = function(x, y) {
  return x >= this.x && x <= (this.x + this.width) &&
         y >= this.y && y <= (this.y + this.height);
};

module.exports = mongoose.model('Zone', zoneSchema);

module.exports = mongoose.model('Zone', zoneSchema);