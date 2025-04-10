// backend/src/middleware/validation.middleware.js
const { validationResult, body, param, query } = require('express-validator');
const { UserType, JobLevel, LocationType, ApplicationStatus } = require('@prisma/client');

// Middleware para verificar erros de validação
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

// Validações para autenticação
const registerStudentValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').notEmpty().withMessage('Phone is required'),
  validate
];

const registerCompanyValidation = [
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('responsibleName').notEmpty().withMessage('Responsible name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('cnpj').notEmpty().withMessage('CNPJ is required')
    .isLength({ min: 14, max: 18 }).withMessage('CNPJ must be between 14 and 18 characters'),
  validate
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
];

// Validações para estudantes
const updateProfileValidation = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('country').optional().notEmpty().withMessage('Country cannot be empty'),
  validate
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
];

const experienceValidation = [
  body('company').notEmpty().withMessage('Company name is required'),
  body('role').notEmpty().withMessage('Role is required'),
  body('startDate').notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Start date must be a valid date'),
  body('endDate').optional({ nullable: true })
    .isISO8601().withMessage('End date must be a valid date'),
  body('current').optional().isBoolean().withMessage('Current must be a boolean'),
  validate
];

const skillValidation = [
  body('name').notEmpty().withMessage('Skill name is required'),
  body('level').isInt({ min: 1, max: 5 }).withMessage('Skill level must be between 1 and 5'),
  validate
];

// Validações para vagas
const createJobValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('level').isIn(Object.values(JobLevel)).withMessage('Valid job level is required'),
  body('locationType').isIn(Object.values(LocationType)).withMessage('Valid location type is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('contactEmail').isEmail().withMessage('Valid contact email is required'),
  validate
];

const updateJobValidation = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('level').optional().isIn(Object.values(JobLevel)).withMessage('Valid job level is required'),
  body('locationType').optional().isIn(Object.values(LocationType)).withMessage('Valid location type is required'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validate
];

// Validações para candidaturas
const updateApplicationStatusValidation = [
  body('status').isIn(Object.values(ApplicationStatus)).withMessage('Valid status is required'),
  validate
];

// Validações para ID
const idValidation = [
  param('id').notEmpty().withMessage('ID is required'),
  validate
];

// Validações para paginação
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  validate
];

module.exports = {
  registerStudentValidation,
  registerCompanyValidation,
  loginValidation,
  updateProfileValidation,
  updatePasswordValidation,
  experienceValidation,
  skillValidation,
  createJobValidation,
  updateJobValidation,
  updateApplicationStatusValidation,
  idValidation,
  paginationValidation
};