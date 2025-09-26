
// Enhanced Assessment Template Controller
// Supports both standardized and custom templates

const { PrismaClient } = require('../../generated/prisma');
const prisma = global.prisma || new PrismaClient();

// Get all assessment templates with standardization support
const getAllAssessmentTemplates = async (req, res) => {
  try {
    const {
      standardized,
      category,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    // Filter by standardization status
    if (standardized !== undefined) {
      where.isStandardized = standardized === 'true';
    }

    // Filter by category
    if (category) {
      where.category = category;
    }

    // Search functionality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [templates, total] = await Promise.all([
      prisma.assessmentTemplate.findMany({
        where,
        include: {
          items: {
            orderBy: { displayOrder: 'asc' }
          }
        },
        orderBy: [
          { isStandardized: 'desc' },
          { name: 'asc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      prisma.assessmentTemplate.count({ where })
    ]);

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching assessment templates:', error);
    res.status(500).json({ error: 'Failed to fetch assessment templates' });
  }
};

// Get standardized templates only
const getStandardizedTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    
    const where = { isStandardized: true };
    if (category) {
      where.category = category;
    }

    const templates = await prisma.assessmentTemplate.findMany({
      where,
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching standardized templates:', error);
    res.status(500).json({ error: 'Failed to fetch standardized templates' });
  }
};

// Get custom templates only
const getCustomTemplates = async (req, res) => {
  try {
    const templates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: false },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching custom templates:', error);
    res.status(500).json({ error: 'Failed to fetch custom templates' });
  }
};

// Get template categories
const getTemplateCategories = async (req, res) => {
  try {
    const categories = await prisma.assessmentTemplate.findMany({
      where: {
        category: { not: null },
        isStandardized: true
      },
      select: { category: true },
      distinct: ['category']
    });

    const categoryList = categories
      .map(c => c.category)
      .filter(Boolean)
      .sort();

    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({ error: 'Failed to fetch template categories' });
  }
};

// Get template by ID with full details
const getTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.assessmentTemplate.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

module.exports = {
  getAllAssessmentTemplates,
  getStandardizedTemplates,
  getCustomTemplates,
  getTemplateCategories,
  getTemplateById
};
