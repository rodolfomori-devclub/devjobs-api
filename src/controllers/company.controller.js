// backend/src/controllers/company.controller.js
const bcrypt = require('bcrypt');
const { UserType } = require('@prisma/client');

/**
 * Obter perfil da empresa autenticada
 */
const getMyProfile = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company profile not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: company
    });
  } catch (error) {
    console.error('Get company profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company profile',
      error: error.message
    });
  }
};

/**
 * Atualizar perfil da empresa
 */
const updateProfile = async (req, res) => {
  const { name, responsibleName } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company profile not found'
      });
    }
    
    // Atualizar perfil
    const updatedCompany = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...(name && { name }),
        ...(responsibleName && { responsibleName }),
      }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedCompany
    });
  } catch (error) {
    console.error('Update company profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update company profile',
      error: error.message
    });
  }
};

/**
 * Atualizar senha da empresa
 */
const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Verificar senha atual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Criar hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update password',
      error: error.message
    });
  }
};

/**
 * Obter candidaturas para vagas da empresa
 */
const getApplications = async (req, res) => {
  const { jobId, status } = req.query;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se a empresa existe
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company profile not found'
      });
    }
    
    // Construir filtro básico
    const baseFilter = {
      job: {
        companyId: company.id
      }
    };
    
    // Adicionar filtro de vaga específica
    if (jobId) {
      baseFilter.jobId = jobId;
    }
    
    // Adicionar filtro de status
    if (status) {
      baseFilter.status = status;
    }
    
    // Buscar candidaturas
    const applications = await prisma.application.findMany({
      where: baseFilter,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            city: true,
            state: true,
            country: true,
            portfolioUrl: true,
            githubUrl: true,
            linkedinUrl: true,
            resumeUrl: true,
            skills: true
          }
        },
        job: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return res.status(200).json({
      status: 'success',
      data: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

/**
 * Atualizar status de uma candidatura
 */
const updateApplicationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se a empresa existe
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company profile not found'
      });
    }
    
    // Verificar se a candidatura existe e é para uma vaga da empresa
    const application = await prisma.application.findFirst({
      where: {
        id,
        job: {
          companyId: company.id
        }
      },
      include: {
        job: true,
        student: true
      }
    });
    
    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found or does not belong to your company'
      });
    }
    
    // Validar status
    if (!['PENDING', 'VIEWED', 'INTERVIEWING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid status value'
      });
    }
    
    // Atualizar status
    const updatedApplication = await prisma.application.update({
      where: { id },
      data: { status }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Application status updated successfully',
      data: updatedApplication
    });
  } catch (error) {
    console.error('Update application status error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

/**
 * Buscar empresa por ID (para visualização pública)
 */
const getCompanyById = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        jobs: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            requiredSkills: true
          }
        }
      }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }
    
    // Remover CNPJ da resposta pública
    const { cnpj, ...companyData } = company;
    
    return res.status(200).json({
      status: 'success',
      data: companyData
    });
  } catch (error) {
    console.error('Get company by id error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company',
      error: error.message
    });
  }
};

/**
 * Obter estatísticas das vagas da empresa
 */
const getJobStats = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se a empresa existe
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(404).json({
        status: 'error',
        message: 'Company profile not found'
      });
    }
    
    // Obter contagem de vagas
    const totalJobs = await prisma.job.count({
      where: { companyId: company.id }
    });
    
    // Obter contagem de vagas ativas
    const activeJobs = await prisma.job.count({
      where: { 
        companyId: company.id,
        isActive: true
      }
    });
    
    // Obter contagem total de candidaturas
    const totalApplications = await prisma.application.count({
      where: {
        job: {
          companyId: company.id
        }
      }
    });
    
    // Obter contagem de candidaturas por status
    const applicationsByStatus = await prisma.$queryRaw`
      SELECT 
        a."status" AS status, 
        COUNT(*) AS count
      FROM "Application" a
      JOIN "Job" j ON a."jobId" = j.id
      WHERE j."companyId" = ${company.id}
      GROUP BY a."status"
    `;
    
    return res.status(200).json({
      status: 'success',
      data: {
        jobs: {
          total: totalJobs,
          active: activeJobs,
          inactive: totalJobs - activeJobs
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
    console.error('Get job stats error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job statistics',
      error: error.message
    });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  updatePassword,
  getApplications,
  updateApplicationStatus,
  getCompanyById,
  getJobStats
};