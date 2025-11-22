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
  // Centro da área (opcional). Se não informado, será calculado via x + width/2.
  centerX: {
    type: Number,
    min: [0, 'centerX deve ser entre 0 e 1'],
    max: [1, 'centerX deve ser entre 0 e 1'],
    default: null
  },
  centerY: {
    type: Number,
    min: [0, 'centerY deve ser entre 0 e 1'],
    max: [1, 'centerY deve ser entre 0 e 1'],
    default: null
  },
  orientationDeg: {
    type: Number,
    default: 0,
    min: [-360, 'orientationDeg deve ser >= -360°'],
    max: [360, 'orientationDeg deve ser <= 360°'],
    description: 'Ângulo (graus) indicando a direção para onde o sensor aponta (0° = eixo X positivo)'
  },
  sensorOffsetX: {
    type: Number,
    default: 0,
    description: 'Deslocamento do sensor em X relativo ao centro da área (mesma unidade do mapa)'
  },
  sensorOffsetY: {
    type: Number,
    default: 0,
    description: 'Deslocamento do sensor em Y relativo ao centro da área (mesma unidade do mapa)'
  },
  scaleCmPerUnit: {
    type: Number,
    default: 100,
    min: [1, 'scaleCmPerUnit deve ser >= 1'],
    description: 'Quantos centímetros equivalem a uma unidade do mapa (0-1)'
  },
  measurementUnit: {
    type: String,
    enum: ['normalized', 'meters'],
    default: 'normalized',
    description: 'Indica se as coordenadas x/y/w/h estão normalizadas (0-1) ou em metros'
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