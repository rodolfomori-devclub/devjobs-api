// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar token JWT e autenticar usuários
 */
const authenticate = (req, res, next) => {
  try {
    // Obter o token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Extrair o token
    const token = authHeader.split(' ')[1];
    
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adicionar dados do usuário à requisição
    req.user = {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Middleware para verificar se o usuário é um aluno
 */
const isStudent = (req, res, next) => {
  if (req.user && req.user.userType === 'STUDENT') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Access denied: Student role required'
  });
};

/**
 * Middleware para verificar se o usuário é uma empresa
 */
const isCompany = (req, res, next) => {
  if (req.user && req.user.userType === 'COMPANY') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Access denied: Company role required'
  });
};

/**
 * Middleware para verificar se o usuário é um administrador
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.userType === 'ADMIN') {
    return next();
  }
  
  return res.status(403).json({
    status: 'error',
    message: 'Access denied: Admin role required'
  });
};

module.exports = {
  authenticate,
  isStudent,
  isCompany,
  isAdmin
};