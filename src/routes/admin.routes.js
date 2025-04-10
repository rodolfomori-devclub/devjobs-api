// backend/src/routes/admin.routes.js
const express = require('express');
const { 
  getSystemStats,
  getUsers,
  getAllJobs,
  getAllApplications,
  createAdmin,
  toggleUserBlock,
  toggleJobStatus
} = require('../controllers/admin.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/admin/stats
 * @desc    Obter estatísticas do sistema
 * @access  Admin
 */
router.get('/stats', authenticate, isAdmin, getSystemStats);

/**
 * @route   GET /api/admin/users
 * @desc    Obter lista de usuários
 * @access  Admin
 */
router.get('/users', authenticate, isAdmin, getUsers);

/**
 * @route   GET /api/admin/jobs
 * @desc    Obter lista de vagas
 * @access  Admin
 */
router.get('/jobs', authenticate, isAdmin, getAllJobs);

/**
 * @route   GET /api/admin/applications
 * @desc    Obter lista de candidaturas
 * @access  Admin
 */
router.get('/applications', authenticate, isAdmin, getAllApplications);

/**
 * @route   POST /api/admin/create
 * @desc    Criar administrador
 * @access  Admin
 */
router.post('/create', authenticate, isAdmin, createAdmin);

/**
 * @route   PUT /api/admin/users/:id/block
 * @desc    Bloquear ou desbloquear usuário
 * @access  Admin
 */
router.put('/users/:id/block', authenticate, isAdmin, toggleUserBlock);

/**
 * @route   PUT /api/admin/jobs/:id/status
 * @desc    Ativar ou desativar vaga
 * @access  Admin
 */
router.put('/jobs/:id/status', authenticate, isAdmin, toggleJobStatus);

module.exports = router;