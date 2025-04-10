// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

// Importando rotas
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const companyRoutes = require('./routes/company.routes');
const jobRoutes = require('./routes/job.routes');
const adminRoutes = require('./routes/admin.routes');

// Inicialização
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet()); // Segurança de headers HTTP
app.use(cors()); // Permitir acesso cross-origin
app.use(express.json()); // Parsing de JSON
app.use(morgan('dev')); // Logging de requisições

// Middleware para disponibilizar o Prisma Client para os controladores
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);

// Teste de conexão com o banco de dados
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'success',
      message: 'Database connection established',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Tratamento de rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Tratamento de encerramento
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Disconnected from database');
  process.exit(0);
});

module.exports = app;