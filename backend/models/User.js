const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome não pode ter mais de 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Por padrão não retorna a senha nas consultas
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'supervisor', 'operator', 'viewer'],
      message: 'Role deve ser: admin, supervisor, operator ou viewer'
    },
    default: 'operator'
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Departamento não pode ter mais de 50 caracteres']
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Index para otimizar busca por email
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Virtual para verificar se conta está bloqueada
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só hash a senha se ela foi modificada
  if (!this.isModified('password')) return next();
  
  try {
    // Hash da senha com salt rounds 12
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Método para incrementar tentativas de login
userSchema.methods.incLoginAttempts = function() {
  // Se temos uma data de bloqueio anterior que já passou, reinicia
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Se atingiu o máximo de tentativas e não está bloqueado, bloqueia
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 horas
    };
  }
  
  return this.updateOne(updates);
};

// Método para resetar tentativas de login após sucesso
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Método para verificar permissões
userSchema.methods.hasPermission = function(requiredRole) {
  const roles = {
    'viewer': 1,
    'operator': 2,
    'supervisor': 3,
    'admin': 4
  };
  
  return roles[this.role] >= roles[requiredRole];
};

// Método estático para encontrar usuário por email (incluindo senha)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email }).select('+password');
};

module.exports = mongoose.model('User', userSchema);