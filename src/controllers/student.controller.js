// backend/src/controllers/student.controller.js
const bcrypt = require('bcrypt');
const { UserType } = require('@prisma/client');

/**
 * Obter perfil do estudante autenticado
 */
const getMyProfile = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        skills: true,
        experiences: {
          orderBy: { startDate: 'desc' }
        },
        applications: {
          include: {
            job: {
              include: {
                company: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: student
    });
  } catch (error) {
    console.error('Get student profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch student profile',
      error: error.message
    });
  }
};

/**
 * Atualizar perfil do estudante
 */
const updateProfile = async (req, res) => {
  const {
    name, phone, gender, city, state, country, specialNeeds,
    portfolioUrl, githubUrl, linkedinUrl, isFreelancer, bio
  } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Atualizar perfil
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(gender !== undefined && { gender }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country && { country }),
        ...(specialNeeds !== undefined && { specialNeeds }),
        ...(portfolioUrl !== undefined && { portfolioUrl }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(isFreelancer !== undefined && { isFreelancer }),
        ...(bio !== undefined && { bio }),
      }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedStudent
    });
  } catch (error) {
    console.error('Update student profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update student profile',
      error: error.message
    });
  }
};

/**
 * Atualizar senha do estudante
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
 * Adicionar ou atualizar experiência profissional
 */
const upsertExperience = async (req, res) => {
  const { id } = req.params;
  const {
    company, role, startDate, endDate, description, current
  } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    let experience;
    
    if (id) {
      // Verificar se a experiência existe e pertence ao estudante
      const existingExperience = await prisma.experience.findFirst({
        where: {
          id,
          studentId: student.id
        }
      });
      
      if (!existingExperience) {
        return res.status(404).json({
          status: 'error',
          message: 'Experience not found or does not belong to this student'
        });
      }
      
      // Atualizar experiência
      experience = await prisma.experience.update({
        where: { id },
        data: {
          ...(company && { company }),
          ...(role && { role }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(description !== undefined && { description }),
          ...(current !== undefined && { current }),
        }
      });
    } else {
      // Criar nova experiência
      experience = await prisma.experience.create({
        data: {
          studentId: student.id,
          company,
          role,
          startDate: new Date(startDate),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(description && { description }),
          ...(current !== undefined && { current }),
        }
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: id ? 'Experience updated successfully' : 'Experience added successfully',
      data: experience
    });
  } catch (error) {
    console.error('Upsert experience error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save experience',
      error: error.message
    });
  }
};

/**
 * Remover experiência profissional
 */
const deleteExperience = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Verificar se a experiência existe e pertence ao estudante
    const experience = await prisma.experience.findFirst({
      where: {
        id,
        studentId: student.id
      }
    });
    
    if (!experience) {
      return res.status(404).json({
        status: 'error',
        message: 'Experience not found or does not belong to this student'
      });
    }
    
    // Remover experiência
    await prisma.experience.delete({
      where: { id }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Experience deleted successfully'
    });
  } catch (error) {
    console.error('Delete experience error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete experience',
      error: error.message
    });
  }
};

/**
 * Adicionar ou atualizar habilidade
 */
const upsertSkill = async (req, res) => {
  const { id } = req.params;
  const { name, level } = req.body;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    let skill;
    
    if (id) {
      // Verificar se a habilidade existe e pertence ao estudante
      const existingSkill = await prisma.skill.findFirst({
        where: {
          id,
          studentId: student.id
        }
      });
      
      if (!existingSkill) {
        return res.status(404).json({
          status: 'error',
          message: 'Skill not found or does not belong to this student'
        });
      }
      
      // Atualizar habilidade
      skill = await prisma.skill.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(level && { level: parseInt(level) }),
        }
      });
    } else {
      // Verificar se já existe habilidade com o mesmo nome
      const existingSkill = await prisma.skill.findFirst({
        where: {
          studentId: student.id,
          name
        }
      });
      
      if (existingSkill) {
        return res.status(400).json({
          status: 'error',
          message: 'You already have this skill registered'
        });
      }
      
      // Criar nova habilidade
      skill = await prisma.skill.create({
        data: {
          studentId: student.id,
          name,
          level: parseInt(level),
        }
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: id ? 'Skill updated successfully' : 'Skill added successfully',
      data: skill
    });
  } catch (error) {
    console.error('Upsert skill error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save skill',
      error: error.message
    });
  }
};

/**
 * Remover habilidade
 */
const deleteSkill = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Verificar se a habilidade existe e pertence ao estudante
    const skill = await prisma.skill.findFirst({
      where: {
        id,
        studentId: student.id
      }
    });
    
    if (!skill) {
      return res.status(404).json({
        status: 'error',
        message: 'Skill not found or does not belong to this student'
      });
    }
    
    // Remover habilidade
    await prisma.skill.delete({
      where: { id }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Skill deleted successfully'
    });
  } catch (error) {
    console.error('Delete skill error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to delete skill',
      error: error.message
    });
  }
};

/**
 * Obter candidaturas do estudante
 */
const getMyApplications = async (req, res) => {
  const { status } = req.query;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Construir filtros
    const filters = {
      where: {
        studentId: student.id,
        ...(status && { status })
      },
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true
              }
            },
            requiredSkills: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Buscar candidaturas
    const applications = await prisma.application.findMany(filters);
    
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
 * Cancelar candidatura
 */
const cancelApplication = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Verificar se a candidatura existe e pertence ao estudante
    const application = await prisma.application.findFirst({
      where: {
        id,
        studentId: student.id
      }
    });
    
    if (!application) {
      return res.status(404).json({
        status: 'error',
        message: 'Application not found or does not belong to this student'
      });
    }
    
    // Cancelar candidatura (remover)
    await prisma.application.delete({
      where: { id }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Application cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel application error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to cancel application',
      error: error.message
    });
  }
};

/**
 * Upload de currículo
 */
const uploadResume = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Atualizar URL do currículo
    const resumeUrl = `/uploads/resumes/${file.filename}`;
    
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: { resumeUrl }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Resume uploaded successfully',
      data: {
        resumeUrl
      }
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload resume',
      error: error.message
    });
  }
};

/**
 * Upload de foto de perfil
 */
const uploadProfilePicture = async (req, res) => {
  try {
    const prisma = req.prisma;
    const userId = req.user.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    // Verificar se o perfil existe
    const student = await prisma.student.findFirst({
      where: { userId }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student profile not found'
      });
    }
    
    // Atualizar URL da foto de perfil
    const profilePicture = `/uploads/profile-pictures/${file.filename}`;
    
    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: { profilePicture }
    });
    
    return res.status(200).json({
      status: 'success',
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture
      }
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};

/**
 * Buscar estudante por ID (para visualização pública)
 */
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    const prisma = req.prisma;
    
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        skills: true,
        experiences: {
          orderBy: { startDate: 'desc' }
        },
      }
    });
    
    if (!student) {
      return res.status(404).json({
        status: 'error',
        message: 'Student not found'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: student
    });
  } catch (error) {
    console.error('Get student by id error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch student',
      error: error.message
    });
  }
};

module.exports = {
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
};