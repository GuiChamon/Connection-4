const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Configuração JWT
const JWT_SECRET = process.env.JWT_SECRET || 'connection4_super_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Função para gerar token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// POST /api/auth/register - Registrar novo usuário
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    // Validações básicas
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios'
      });
    }
    
    // Verificar se usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Usuário já cadastrado com este email'
      });
    }
    
    // Criar novo usuário
    const user = new User({
      name,
      email,
      password,
      role: role || 'operator',
      department: department || 'Geral'
    });
    
    await user.save();
    
    // Gerar token
    const token = generateToken(user._id);
    
    // Remover senha da resposta
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Usuário registrado com sucesso',
      data: {
        user: userResponse,
        token,
        expiresIn: JWT_EXPIRES_IN
      }
    });
    
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(400).json({
      success: false,
      message: 'Erro ao registrar usuário',
      error: error.message
    });
  }
});

// POST /api/auth/device-login - Login para dispositivos ESP
router.post('/device-login', async (req, res) => {
  try {
    const { deviceId, deviceSecret } = req.body;
    
    // Validar credenciais do dispositivo
    if (!deviceId || !deviceSecret) {
      return res.status(400).json({
        success: false,
        message: 'deviceId e deviceSecret são obrigatórios'
      });
    }
    
    // Validar secret (em produção, usar hash e banco de dados)
    const expectedSecret = 'device_secret_' + deviceId;
    
    if (deviceSecret !== expectedSecret) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }
    
    // Gerar token JWT para dispositivo
    const token = jwt.sign(
      { deviceId, type: 'device' },
      JWT_SECRET,
      { expiresIn: '30d' }  // Dispositivos têm token de longa duração
    );
    
    res.json({
      success: true,
      message: 'Dispositivo autenticado',
      token,
      deviceId
    });
    
  } catch (error) {
    console.error('Erro no login do dispositivo:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao autenticar dispositivo',
      error: error.message
    });
  }
});

// POST /api/auth/login - Login do usuário
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validações básicas
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios'
      });
    }
    
    // Buscar usuário (incluindo senha)
    const user = await User.findByEmail(email);
    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }
    
    // Verificar se conta está bloqueada
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Conta temporariamente bloqueada devido a muitas tentativas de login'
      });
    }
    
    // Verificar senha
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Incrementar tentativas de login
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Email ou senha inválidos'
      });
    }
    
    // Login bem-sucedido - resetar tentativas
    await user.resetLoginAttempts();
    
    // Gerar token
    const token = generateToken(user._id);
    
    // Remover senha da resposta
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: userResponse,
        token,
        expiresIn: JWT_EXPIRES_IN
      }
    });
    
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/auth/me - Obter dados do usuário logado
router.get('/me', async (req, res) => {
  try {
    // Middleware de autenticação deve definir req.userId
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }
    
    const user = await User.findById(req.userId);
    if (!user || !user.active) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/auth/logout - Logout (invalidar token - implementação futura)
router.post('/logout', (req, res) => {
  // Por enquanto, logout é tratado no frontend removendo o token
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

// POST /api/auth/verify - Verificar se token é válido
router.post('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token não fornecido'
      });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json({
      success: true,
      message: 'Token válido',
      data: {
        userId: decoded.userId,
        isValid: true
      }
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido',
      isValid: false
    });
  }
});

// GET /api/auth/users - Listar usuários (apenas admins)
router.get('/users', async (req, res) => {
  try {
    // Verificar se usuário é admin (middleware deve definir req.user)
    if (!req.user || !req.user.hasPermission('admin')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado - permissão de administrador requerida'
      });
    }
    
    const users = await User.find({ active: true }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários',
      error: error.message
    });
  }
});

module.exports = router;