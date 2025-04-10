// backend/src/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserType } = require('@prisma/client');

/**
 * Registro de aluno
 */
const registerStudent = async (req, res) => {
  const { 
    name, email, phone, gender, city, state, country, specialNeeds,
    password, notInBrazil, github, linkedin, portfolio, bio, skills 
  } = req.body;

  try {
    const prisma = req.prisma;
    
    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }
    
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário e aluno em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          userType: UserType.STUDENT
        }
      });
      
      // Criar perfil de aluno
      const student = await tx.student.create({
        data: {
          userId: user.id,
          name,
          phone,
          gender,
          city: notInBrazil ? null : city,
          state: notInBrazil ? null : state,
          country: notInBrazil ? country : 'Brasil',
          specialNeeds,
          githubUrl: github,
          linkedinUrl: linkedin,
          portfolioUrl: portfolio,
          bio,
          // Processamento das habilidades
          skills: {
            create: skills.map(skill => ({
              name: skill.name,
              level: skill.level
            }))
          }
        }
      });
      
      return { user, student };
    });
    
    // Gerar JWT token para autenticação imediata
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email, 
        userType: result.user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return res.status(201).json({
      status: 'success',
      message: 'Student registered successfully',
      data: {
        id: result.student.id,
        name: result.student.name,
        email: result.user.email,
        token
      }
    });
  } catch (error) {
    console.error('Register student error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Registro de empresa
 */
const registerCompany = async (req, res) => {
  const { 
    companyName, responsibleName, email, cnpj, password 
  } = req.body;

  try {
    const prisma = req.prisma;
    
    // Verificar se o email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered'
      });
    }
    
    // Verificar se o CNPJ já existe
    const existingCompany = await prisma.company.findFirst({
      where: { cnpj }
    });
    
    if (existingCompany) {
      return res.status(400).json({
        status: 'error',
        message: 'CNPJ already registered'
      });
    }
    
    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário e empresa em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          userType: UserType.COMPANY
        }
      });
      
      // Criar perfil de empresa
      const company = await tx.company.create({
        data: {
          userId: user.id,
          name: companyName,
          responsibleName,
          cnpj
        }
      });
      
      return { user, company };
    });
    
    // Gerar JWT token para autenticação imediata
    const token = jwt.sign(
      { 
        id: result.user.id, 
        email: result.user.email, 
        userType: result.user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return res.status(201).json({
      status: 'success',
      message: 'Company registered successfully',
      data: {
        id: result.company.id,
        name: result.company.name,
        email: result.user.email,
        token
      }
    });
  } catch (error) {
    console.error('Register company error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Login de usuário (aluno ou empresa)
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const prisma = req.prisma;
    
    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Buscar perfil específico (aluno ou empresa)
    let profile = null;
    if (user.userType === UserType.STUDENT) {
      profile = await prisma.student.findUnique({
        where: { userId: user.id }
      });
    } else if (user.userType === UserType.COMPANY) {
      profile = await prisma.company.findUnique({
        where: { userId: user.id }
      });
    } else if (user.userType === UserType.ADMIN) {
      profile = await prisma.admin.findUnique({
        where: { userId: user.id }
      });
    }
    
    // Gerar JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        id: profile?.id,
        name: profile?.name || profile?.responsibleName,
        email: user.email,
        userType: user.userType,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message
    });
  }
};

/**
 * Login específico para administradores
 */
const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const prisma = req.prisma;
    
    // Buscar usuário pelo email
    const user = await prisma.user.findUnique({
      where: { 
        email,
        userType: UserType.ADMIN
      }
    });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials'
      });
    }
    
    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials'
      });
    }
    
    // Buscar perfil de admin
    const admin = await prisma.admin.findUnique({
      where: { userId: user.id }
    });
    
    // Gerar JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        userType: user.userType 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    return res.status(200).json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        id: admin.id,
        name: admin.name,
        email: user.email,
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Admin login failed',
      error: error.message
    });
  }
};

module.exports = {
  registerStudent,
  registerCompany,
  login,
  adminLogin
};