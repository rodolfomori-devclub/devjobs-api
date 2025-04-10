// backend/src/routes/job.routes.js
const express = require('express');
const { 
  createJob, 
  getJobs, 
  getJobById, 
  updateJob, 
  deleteJob, 
  applyToJob,
  getCompanyJobs
} = require('../controllers/job.controller');
const { 
  authenticate, 
  isCompany, 
  isStudent, 
  isAdmin 
} = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/jobs
 * @desc    Criar uma nova vaga
 * @access  Company
 */
router.post('/', authenticate, isCompany, createJob);

/**
 * @route   GET /api/jobs
 * @desc    Obter todas as vagas (com filtros)
 * @access  Public
 */
router.get('/', getJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Obter uma vaga específica pelo ID
 * @access  Public
 */
router.get('/:id', getJobById);

/**
 * @route   PUT /api/jobs/:id
 * @desc    Atualizar uma vaga
 * @access  Company/Admin
 */
router.put('/:id', authenticate, updateJob);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Excluir uma vaga
 * @access  Company/Admin
 */
router.delete('/:id', authenticate, deleteJob);

/**
 * @route   POST /api/jobs/:id/apply
 * @desc    Candidatar-se a uma vaga
 * @access  Student
 */
router.post('/:id/apply', authenticate, isStudent, applyToJob);

/**
 * @route   GET /api/jobs/company/me
 * @desc    Obter todas as vagas da empresa autenticada
 * @access  Company
 */
router.get('/company/me', authenticate, isCompany, getCompanyJobs);

module.exports = router;