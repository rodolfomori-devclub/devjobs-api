// backend/src/controllers/admin.controller.js
const bcrypt = require('bcrypt');
const { UserType } = require('@prisma/client');

/**
 * Obter estatísticas do sistema
 */
const getSystemStats = async (req, res) => {
  try {
    const prisma = req.prisma;
    
    // Contagens de usuários por tipo
    const studentCount = await prisma.student.count();
    const companyCount = await prisma.company.count();
    const adminCount = await prisma.admin.count();
    
    // Contagens de vagas
    const totalJobs = await prisma.job.count();
    const activeJobs = await prisma.job.count({ where: { isActive: true }});
    
    // Contagens de candidaturas por status
    const applicationsByStatus = await prisma.$queryRaw`
      SELECT "status", COUNT(*) as count
      FROM "Application"
      GROUP BY "status"
    `;
    
    // Total de candidaturas
    const totalApplications = await prisma.application.count();
    
    // Novos usuários nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newStudents = await prisma.student.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    
    const newCompanies = await prisma.company.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    
    // Novas vagas nos últimos 30 dias
    const newJobs = await prisma.job.count({
      where: { createdAt: { gte: thirtyDaysAgo } }
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        users: {
          total: studentCount + companyCount + adminCount,
          students: studentCount,
          companies: companyCount,
          admins: adminCount,
          newStudents,
          newCompanies
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
          inactive: totalJobs - activeJobs,
          new: newJobs
        },
        applications: {
          total: totalApplications,
          byStatus: applicationsByStatus.reduce((acc, item) => {
            acc[item.status] = Number(item.count);
            return acc;
          }, {})
        }
      }
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system statistics',
      error: error.message
    });
  }
};

/**
 * Obter lista de usuários (alunos e empresas)
 */
const getUsers = async (req, res) => {
  const { type, search, page = 1, limit = 10 } = req.query;

  try {
    const prisma = req.prisma;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Filtro básico
    const whereFilter = {};
    
    // Filtro por tipo (opcional)
    if (type) {
      whereFilter.userType = type.toUpperCase();
    }
    
    // Filtro de pesquisa (opcional)
    if (search) {
      whereFilter.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        {
          student: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          company: {
            name: { contains: search, mode: 'insensitive' }
          }
        }
      ];
    }
    
    // Consultar usuários com paginação
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        where: whereFilter,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
              country: true,
              profilePicture: true,
              createdAt: true,
              updatedAt: true
            }
          },
          company: {
            select: {
              id: true,
              name: true,
              responsibleName: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.user.count({ where: whereFilter })
    ]);
    
    return res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          total: totalUsers,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalUsers / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Obter lista de vagas
 */
const getAllJobs = async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  try {
    const prisma = req.prisma;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Filtro básico
    const whereFilter = {};
    
    // Filtro por status (opcional)
    if (status === 'active') {
      whereFilter.isActive = true;
    } else if (status === 'inactive') {
      whereFilter.isActive = false;
    }
    
    // Filtro de pesquisa (opcional)
    if (search) {
      whereFilter.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    // Consultar vagas com paginação
    const [jobs, totalJobs] = await Promise.all([
      prisma.job.findMany({
        where: whereFilter,
        include: {
          company: {
            select: {
              id: true,
              name: true
            }
          },
          requiredSkills: true,
          _count: {
            select: { applications: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.job.count({ where: whereFilter })
    ]);
    
    return res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          total: totalJobs,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalJobs / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

/**
 * Obter lista de candidaturas
 */
const getAllApplications = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  try {
    const prisma = req.prisma;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    // Filtro básico
    const whereFilter = {};
    
    // Filtro por status (opcional)
    if (status) {
      whereFilter.status = status;
    }
    
    // Consultar candidaturas com paginação
    const [applications, totalApplications] = await Promise.all([
      prisma.application.findMany({
        where: whereFilter,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              profilePicture: true
            }
          },
          job: {
            select: {
              id: true,
              title: true,
              company: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.application.count({ where: whereFilter })
    ]);
    
    return res.status(200).json({
      status: 'success',
      data: {
        applications,
        pagination: {
          total: totalApplications,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalApplications / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get all applications error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

/**
 * Criar administrador
 */
const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;

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
    
    // Criar usuário e administrador em uma transação
    const result = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          userType: UserType.ADMIN
        }
      });
      
      // Criar perfil de administrador
      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          name
        }
      });
      
      return { user, admin };
    });
    
    return res.status(201).json({
      status: 'success',
      message: 'Admin created successfully',
      data: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.user.email
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create admin',
      error: error.message
    });
  }
};

/**
 * Bloquear ou desbloquear usuário
 * (Não implementado diretamente no esquema - seria necessário 
 * adicionar um campo isBlocked no modelo User)
 */
const toggleUserBlock = async (req, res) => {
  return res.status(501).json({
    status: 'error',
    message: 'This functionality is not implemented yet'
  });
};

/**
 * Desativar vaga
 */
const toggleJobStatus = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const prisma = req.prisma;
    
    // Verificar se a vaga existe
    const job = await prisma.job.findUnique({
      where: { id }
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Atualizar status da vaga
    const updatedJob = await prisma.job.update({
      where: { id },
      data: { isActive }
    });
    
    return res.status(200).json({
      status: 'success',
      message: isActive ? 'Job activated successfully' : 'Job deactivated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Toggle job status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update job status',
      error: error.message
    });
  }
};

module.exports = {
  getSystemStats,
  getUsers,
  getAllJobs,
  getAllApplications,
  createAdmin,
  toggleUserBlock,
  toggleJobStatus
};