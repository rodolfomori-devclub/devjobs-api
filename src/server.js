// backend/src/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

// Importando rotas
const authRoutes = require('./routes/auth.routes');
const studentRoutes = require('./routes/student.routes');
const companyRoutes = require('./routes/company.routes');
const jobRoutes = require('./routes/job.routes');
const adminRoutes = require('./routes/admin.routes');

// Garantir que os diretórios de upload existam
const uploadDirs = ['uploads', 'uploads/resumes', 'uploads/profile-pictures'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Inicialização
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Configuração CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  optionsSuccessStatus: 200
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar para desenvolvimento
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Permitir acesso a recursos
})); 
app.use(cors(corsOptions)); // Permitir acesso cross-origin
app.use(express.json()); // Parsing de JSON
app.use(express.urlencoded({ extended: true })); // Parsing de form data
app.use(morgan('dev')); // Logging de requisições

// Servir arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware para disponibilizar o Prisma Client para os controladores
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});