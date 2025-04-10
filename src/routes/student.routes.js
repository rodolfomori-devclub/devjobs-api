// backend/src/routes/student.routes.js
const express = require('express');
const { 
  getMyProfile,
  updateProfile,
  updatePassword,
  upsertExperience,
  deleteExperience,
  upsertSkill,
  deleteSkill,
  getMyApplications,
  cancelApplication,
  uploadResume,
  uploadProfilePicture,
  getStudentById
} = require('../controllers/student.controller');
const { authenticate, isStudent } = require('../middleware/auth.middleware');
const { uploadResume: uploadResumeMiddleware, uploadProfilePicture: uploadProfilePictureMiddleware } = require('../middleware/upload.middleware');

const router = express.Router();

/**
 * @route   GET /api/students/me
 * @desc    Obter perfil do estudante autenticado
 * @access  Student
 */
router.get('/me', authenticate, isStudent, getMyProfile);

/**
 * @route   PUT /api/students/me
 * @desc    Atualizar perfil do estudante
 * @access  Student
 */
router.put('/me', authenticate, isStudent, updateProfile);

/**
 * @route   PUT /api/students/password
 * @desc    Atualizar senha do estudante
 * @access  Student
 */
router.put('/password', authenticate, isStudent, updatePassword);

/**
 * @route   POST /api/students/experiences
 * @desc    Adicionar experiência
 * @access  Student
 */
router.post('/experiences', authenticate, isStudent, upsertExperience);

/**
 * @route   PUT /api/students/experiences/:id
 * @desc    Atualizar experiência
 * @access  Student
 */
router.put('/experiences/:id', authenticate, isStudent, upsertExperience);

/**
 * @route   DELETE /api/students/experiences/:id
 * @desc    Remover experiência
 * @access  Student
 */
router.delete('/experiences/:id', authenticate, isStudent, deleteExperience);

/**
 * @route   POST /api/students/skills
 * @desc    Adicionar habilidade
 * @access  Student
 */
router.post('/skills', authenticate, isStudent, upsertSkill);

/**
 * @route   PUT /api/students/skills/:id
 * @desc    Atualizar habilidade
 * @access  Student
 */
router.put('/skills/:id', authenticate, isStudent, upsertSkill);

/**
 * @route   DELETE /api/students/skills/:id
 * @desc    Remover habilidade
 * @access  Student
 */
router.delete('/skills/:id', authenticate, isStudent, deleteSkill);

/**
 * @route   GET /api/students/applications
 * @desc    Obter candidaturas do estudante
 * @access  Student
 */
router.get('/applications', authenticate, isStudent, getMyApplications);

/**
 * @route   DELETE /api/students/applications/:id
 * @desc    Cancelar candidatura
 * @access  Student
 */
router.delete('/applications/:id', authenticate, isStudent, cancelApplication);

/**
 * @route   POST /api/students/uploads/resume
 * @desc    Upload de currículo
 * @access  Student
 */
router.post(
  '/uploads/resume',
  authenticate,
  isStudent,
  uploadResumeMiddleware,
  uploadResume
);

/**
 * @route   POST /api/students/uploads/profile-picture
 * @desc    Upload de foto de perfil
 * @access  Student
 */
router.post(
  '/uploads/profile-picture',
  authenticate,
  isStudent,
  uploadProfilePictureMiddleware,
  uploadProfilePicture
);

/**
 * @route   GET /api/students/:id
 * @desc    Buscar estudante por ID (para visualização pública)
 * @access  Public
 */
router.get('/:id', getStudentById);

module.exports = router;