const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'connection4_super_secret_key_2024';

// Middleware para verificar autenticação
const authenticate = async (req, res, next) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }
    
    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verificar se é um token de dispositivo ESP
    if (decoded.type === 'device') {
      // Token de dispositivo ESP8266/ESP32
      req.deviceId = decoded.deviceId;
      req.isDevice = true;
      return next();
    }
    
    // Buscar usuário
    const user = await User.findById(decoded.userId);
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
    }
    
    // Adicionar dados do usuário à requisição
    req.userId = user._id;
    req.user = user;
    req.isDevice = false;
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    console.error('Erro no middleware de autenticação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Middleware para verificar permissões baseadas em role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado - permissão requerida: ${roles.join(' ou ')}`
      });
    }
    
    next();
  };
};

// Middleware opcional - só autentica se token estiver presente
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.active) {
        req.userId = user._id;
        req.user = user;
      }
    }
    
    next();
    
  } catch (error) {
    // Em caso de erro, simplesmente continua sem autenticação
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth
};