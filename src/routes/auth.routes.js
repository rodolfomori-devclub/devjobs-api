// backend/src/routes/auth.routes.js
const express = require('express');
const { 
  registerStudent, 
  registerCompany, 
  login, 
  adminLogin 
} = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @route   POST /api/auth/register/student
 * @desc    Registro de novo aluno
 * @access  Public
 */
router.post('/register/student', registerStudent);

/**
 * @route   POST /api/auth/register/company
 * @desc    Registro de nova empresa
 * @access  Public
 */
router.post('/register/company', registerCompany);

/**
 * @route   POST /api/auth/login
 * @desc    Login de aluno ou empresa
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/admin/login
 * @desc    Login de administrador
 * @access  Public
 */
router.post('/admin/login', adminLogin);

module.exports = router;