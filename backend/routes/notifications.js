const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// GET /api/notifications - Listar todas as notificações
router.get('/', async (req, res) => {
  try {
    const { limit = 50, severity, read, type } = req.query;
    
    const query = {};
    if (severity) query.severity = severity;
    if (read !== undefined) query.read = read === 'true';
    if (type) query.type = type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ read: false });
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar notificações',
      error: error.message
    });
  }
});

// POST /api/notifications - Criar nova notificação
router.post('/', async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    
    res.status(201).json({
      success: true,
      message: 'Notificação criada',
      data: notification
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Erro ao criar notificação',
      error: error.message
    });
  }
});

// PATCH /api/notifications/:id/read - Marcar como lida
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notificação marcada como lida',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar notificação',
      error: error.message
    });
  }
});

// PATCH /api/notifications/:id/resolve - Resolver notificação
router.patch('/:id/resolve', async (req, res) => {
  try {
    const { resolvedBy } = req.body;
    
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }
    
    notification.resolved = true;
    notification.resolvedAt = new Date();
    notification.resolvedBy = resolvedBy || 'Sistema';
    notification.read = true;
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notificação resolvida',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao resolver notificação',
      error: error.message
    });
  }
});

// DELETE /api/notifications/:id - Deletar notificação
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificação não encontrada'
      });
    }
    
    res.json({
      success: true,
      message: 'Notificação deletada'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar notificação',
      error: error.message
    });
  }
});

// DELETE /api/notifications/clear-all - Limpar todas as notificações lidas
router.delete('/clear-all/read', async (req, res) => {
  try {
    const result = await Notification.deleteMany({ read: true });
    
    res.json({
      success: true,
      message: `${result.deletedCount} notificações limpas`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar notificações',
      error: error.message
    });
  }
});

module.exports = router;
