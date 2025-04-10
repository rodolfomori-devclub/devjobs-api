// backend/src/routes/company.routes.js
const express = require('express');
const { 
  getMyProfile,
  updateProfile,
  updatePassword,
  getApplications,
  updateApplicationStatus,
  getCompanyById,
  getJobStats
} = require('../controllers/company.controller');
const { authenticate, isCompany } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/companies/me
 * @desc    Obter perfil da empresa autenticada
 * @access  Company
 */
router.get('/me', authenticate, isCompany, getMyProfile);

/**
 * @route   PUT /api/companies/me
 * @desc    Atualizar perfil da empresa
 * @access  Company
 */
router.put('/me', authenticate, isCompany, updateProfile);

/**
 * @route   PUT /api/companies/password
 * @desc    Atualizar senha da empresa
 * @access  Company
 */
router.put('/password', authenticate, isCompany, updatePassword);

/**
 * @route   GET /api/companies/applications
 * @desc    Obter candidaturas para vagas da empresa
 * @access  Company
 */
router.get('/applications', authenticate, isCompany, getApplications);

/**
 * @route   PUT /api/companies/applications/:id/status
 * @desc    Atualizar status de uma candidatura
 * @access  Company
 */
router.put('/applications/:id/status', authenticate, isCompany, updateApplicationStatus);

/**
 * @route   GET /api/companies/stats
 * @desc    Obter estatísticas das vagas da empresa
 * @access  Company
 */
router.get('/stats', authenticate, isCompany, getJobStats);

/**
 * @route   GET /api/companies/:id
 * @desc    Buscar empresa por ID (para visualização pública)
 * @access  Public
 */
router.get('/:id', getCompanyById);

module.exports = router;