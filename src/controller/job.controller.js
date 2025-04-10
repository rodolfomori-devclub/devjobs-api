// backend/src/controllers/job.controller.js
const { JobLevel, LocationType } = require('@prisma/client');

/**
 * Criar uma nova vaga
 */
const createJob = async (req, res) => {
  const {
    title, level, locationType, location, salary, salaryNegotiable,
    description, skills, benefits, contactEmail, contactPhone,
    contactLinkedin, contactWebsite, contactInstructions
  } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o usuário é uma empresa
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(403).json({
        status: 'error',
        message: 'Only companies can create job listings'
      });
    }
    
    // Validar nível de experiência
    if (!Object.values(JobLevel).includes(level)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job level. Must be JUNIOR, PLENO, or SENIOR'
      });
    }
    
    // Validar tipo de local
    if (!Object.values(LocationType).includes(locationType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location type. Must be REMOTE, HYBRID, or ONSITE'
      });
    }
    
    // Para vagas híbridas ou presenciais, localização é obrigatória
    if ((locationType === LocationType.HYBRID || locationType === LocationType.ONSITE) && !location) {
      return res.status(400).json({
        status: 'error',
        message: 'Location is required for hybrid or onsite jobs'
      });
    }
    
    // Criar vaga com habilidades em uma transação
    const job = await prisma.$transaction(async (tx) => {
      // Criar a vaga
      const newJob = await tx.job.create({
        data: {
          title,
          level,
          locationType,
          location,
          salary,
          description,
          benefits,
          contactInfo: JSON.stringify({
            email: contactEmail,
            phone: contactPhone,
            linkedin: contactLinkedin,
            website: contactWebsite,
            instructions: contactInstructions
          }),
          companyId: company.id
        }
      });
      
      // Adicionar habilidades requeridas
      if (skills && skills.length > 0) {
        await Promise.all(
          skills.map(skillName => 
            tx.jobSkill.create({
              data: {
                jobId: newJob.id,
                name: skillName
              }
            })
          )
        );
      }
      
      // Retornar a vaga criada com as habilidades
      return await tx.job.findUnique({
        where: { id: newJob.id },
        include: {
          company: {
            select: {
              name: true,
            }
          },
          requiredSkills: true
        }
      });
    });
    
    return res.status(201).json({
      status: 'success',
      message: 'Job created successfully',
      data: job
    });
  } catch (error) {
    console.error('Create job error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create job',
      error: error.message
    });
  }
};

/**
 * Obter todas as vagas (com filtros)
 */
const getJobs = async (req, res) => {
  try {
    const prisma = req.prisma;
    const { 
      search, 
      level, 
      locationType, 
      skills, 
      companyId,
      active,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Construir filtros
    const filters = {
      where: {},
      include: {
        company: {
          select: {
            name: true,
          }
        },
        requiredSkills: true
      },
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    };
    
    // Filtro de pesquisa
    if (search) {
      filters.where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    // Filtro de nível
    if (level) {
      filters.where.level = level;
    }
    
    // Filtro de tipo de local
    if (locationType) {
      filters.where.locationType = locationType;
    }
    
    // Filtro de empresa
    if (companyId) {
      filters.where.companyId = companyId;
    }
    
    // Filtro de status (ativo/inativo)
    if (active !== undefined) {
      filters.where.isActive = active === 'true';
    }
    
    // Filtro de habilidades
    if (skills) {
      const skillsArray = Array.isArray(skills) ? skills : [skills];
      filters.where.requiredSkills = {
        some: {
          name: { in: skillsArray }
        }
      };
    }
    
    // Obter vagas filtradas e contagem total
    const [jobs, totalCount] = await Promise.all([
      prisma.job.findMany(filters),
      prisma.job.count({ where: filters.where })
    ]);
    
    return res.status(200).json({
      status: 'success',
      data: {
        jobs,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch jobs',
      error: error.message
    });
  }
};

/**
 * Obter uma vaga específica pelo ID
 */
const getJobById = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            responsibleName: true
          }
        },
        requiredSkills: true,
        applications: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                profilePicture: true
              }
            }
          }
        }
      }
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: job
    });
  } catch (error) {
    console.error('Get job by id error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch job',
      error: error.message
    });
  }
};

/**
 * Atualizar uma vaga
 */
const updateJob = async (req, res) => {
  const { id } = req.params;
  const {
    title, level, locationType, location, salary, salaryNegotiable,
    description, skills, benefits, contactEmail, contactPhone,
    contactLinkedin, contactWebsite, contactInstructions, isActive
  } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se a vaga existe
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: true
      }
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Verificar se o usuário é dono da vaga ou admin
    const isOwner = job.company.userId === userId;
    const isAdmin = req.user.userType === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only update your own job listings'
      });
    }
    
    // Validações condicionais
    if (level && !Object.values(JobLevel).includes(level)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job level. Must be JUNIOR, PLENO, or SENIOR'
      });
    }
    
    if (locationType && !Object.values(LocationType).includes(locationType)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid location type. Must be REMOTE, HYBRID, or ONSITE'
      });
    }
    
    // Atualizar vaga com habilidades em uma transação
    const updatedJob = await prisma.$transaction(async (tx) => {
      // Preparar dados de contato
      let contactInfo = null;
      if (contactEmail || contactPhone || contactLinkedin || contactWebsite || contactInstructions) {
        const currentContactInfo = job.contactInfo ? JSON.parse(job.contactInfo) : {};
        contactInfo = JSON.stringify({
          ...currentContactInfo,
          ...(contactEmail && { email: contactEmail }),
          ...(contactPhone && { phone: contactPhone }),
          ...(contactLinkedin && { linkedin: contactLinkedin }),
          ...(contactWebsite && { website: contactWebsite }),
          ...(contactInstructions && { instructions: contactInstructions })
        });
      }
      
      // Atualizar a vaga
      const updatedJob = await tx.job.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(level && { level }),
          ...(locationType && { locationType }),
          ...(location !== undefined && { location }),
          ...(salary !== undefined && { salary }),
          ...(description && { description }),
          ...(benefits !== undefined && { benefits }),
          ...(contactInfo && { contactInfo }),
          ...(isActive !== undefined && { isActive })
        }
      });
      
      // Atualizar habilidades se fornecidas
      if (skills && skills.length > 0) {
        // Remover habilidades existentes
        await tx.jobSkill.deleteMany({
          where: { jobId: id }
        });
        
        // Adicionar novas habilidades
        await Promise.all(
          skills.map(skillName => 
            tx.jobSkill.create({
              data: {
                jobId: id,
                name: skillName
              }
            })
          )
        );
      }
      
      // Retornar a vaga atualizada com as habilidades
      return await tx.job.findUnique({
        where: { id },
        include: {
          company: {
            select: {
              name: true,
            }
          },
          requiredSkills: true
        }
      });
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update job',
      error: error.message
    });
  }
};

/**
 * Excluir uma vaga
 */
const deleteJob = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se a vaga existe
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: true
      }
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }
    
    // Verificar se o usuário é dono da vaga ou admin
    const isOwner = job.company.userId === userId;
    const isAdmin = req.user.userType === 'ADMIN';
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You can only delete your own job listings'
      });
    }
    
    // Excluir vaga e relacionamentos em uma transação
    await prisma.$transaction(async (tx) => {
      // Remover candidaturas
      await tx.application.deleteMany({
        where: { jobId: id }
      });
      
      // Remover habilidades
      await tx.jobSkill.deleteMany({
        where: { jobId: id }
      });
      
      // Remover a vaga
      await tx.job.delete({
        where: { id }
      });
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete job',
      error: error.message
    });
  }
};

/**
 * Candidatar-se a uma vaga
 */
const applyToJob = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o usuário é um aluno
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(403).json({
        status: 'error',
        message: 'Only students can apply to job listings'
      });
    }
    
    // Verificar se a vaga existe e está ativa
    const job = await prisma.job.findFirst({
      where: { 
        id,
        isActive: true
      }
    });
    
    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found or not active'
      });
    }
    
    // Verificar se o aluno já se candidatou
    const existingApplication = await prisma.application.findFirst({
      where: {
        studentId: student.id,
        jobId: id
      }
    });
    
    if (existingApplication) {
      return res.status(400).json({
        status: 'error',
        message: 'You have already applied to this job'
      });
    }
    
    // Registrar candidatura
    const application = await prisma.application.create({
      data: {
        studentId: student.id,
        jobId: id
      }
    });
    
    return res.status(201).json({
      status: 'success',
      message: 'Applied to job successfully',
      data: application
    });
  } catch (error) {
    console.error('Apply to job error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to apply to job',
      error: error.message
    });
  }
};

/**
 * Obter todas as vagas de uma empresa
 */
const getCompanyJobs = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o usuário é uma empresa
    const company = await prisma.company.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: Company profile not found'
      });
    }
    
    // Obter vagas da empresa
    const jobs = await prisma.job.findMany({
      where: { companyId: company.id },
      include: {
        requiredSkills: true,
        applications: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return res.status(200).json({
      status: 'success',
      data: jobs
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company jobs',
      error: error.message
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  deleteJob,
  applyToJob,
  getCompanyJobs
};