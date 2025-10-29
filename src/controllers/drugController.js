const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

// Get all drugs with pagination and search
const getDrugs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      drugClass = '',
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      AND: [
        search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { brandName: { contains: search, mode: 'insensitive' } },
            { genericName: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        drugClass ? { drugClass: { contains: drugClass, mode: 'insensitive' } } : {}
      ]
    };

    const [drugs, total] = await Promise.all([
      prisma.drug.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { patientMedications: true }
          }
        }
      }),
      prisma.drug.count({ where })
    ]);

    res.json({
      data: drugs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({
      error: 'Internal server error while fetching drugs'
    });
  }
};

// Get a single drug by ID
const getDrugById = async (req, res) => {
  try {
    const { id } = req.params;

    const drug = await prisma.drug.findUnique({
      where: { id },
      include: {
        prescriptions: {
          include: {
            patient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            prescriber: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                specialization: true
              }
            }
          },
          where: { isActive: true }
        },
        _count: {
          select: { prescriptions: true }
        }
      }
    });

    if (!drug) {
      return res.status(404).json({
        error: 'Drug not found'
      });
    }

    res.json({ data: drug });
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({
      error: 'Internal server error while fetching drug'
    });
  }
};

// Create a new drug
const createDrug = async (req, res) => {
  try {
    const {
      name,
      brandName,
      genericName,
      dosageForm,
      strength,
      manufacturer,
      ndcNumber,
      description,
      sideEffects,
      contraindications,
      interactions
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation failed: name is required'
      });
    }

    // Check if drug with same name already exists
    const existingDrug = await prisma.drug.findUnique({
      where: {
        name: name
      }
    });

    if (existingDrug) {
      return res.status(409).json({
        error: 'Drug with this name already exists'
      });
    }

    const drug = await prisma.drug.create({
      data: {
        name,
        brandName,
        genericName,
        dosageForm,
        strength,
        manufacturer,
        ndcNumber,
        description,
        sideEffects,
        contraindications,
        interactions
      }
    });

    res.status(201).json({
      message: 'Drug created successfully',
      data: drug
    });
  } catch (error) {
    console.error('Error creating drug:', error);
    res.status(500).json({
      error: 'Internal server error while creating drug'
    });
  }
};

// Update a drug
const updateDrug = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    
    // Set updatedAt
    updateData.updatedAt = new Date();

    const drug = await prisma.drug.update({
      where: { id },
      data: updateData
    });

    res.json({
      message: 'Drug updated successfully',
      data: drug
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Drug not found'
      });
    }
    console.error('Error updating drug:', error);
    res.status(500).json({
      error: 'Internal server error while updating drug'
    });
  }
};

// Delete a drug
const deleteDrug = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if drug has active prescriptions
    const activePrescriptions = await prisma.patientMedication.count({
      where: {
        drugId: id,
        isActive: true
      }
    });

    if (activePrescriptions > 0) {
      return res.status(400).json({
        error: 'Cannot delete drug with active prescriptions',
        activePrescriptions
      });
    }

    await prisma.drug.delete({
      where: { id }
    });

    res.json({
      message: 'Drug deleted successfully'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Drug not found'
      });
    }
    console.error('Error deleting drug:', error);
    res.status(500).json({
      error: 'Internal server error while deleting drug'
    });
  }
};

// Get drug classes
const getDrugClasses = async (req, res) => {
  try {
    const drugClasses = await prisma.drug.findMany({
      select: {
        drugClass: true
      },
      distinct: ['drugClass'],
      orderBy: {
        drugClass: 'asc'
      }
    });

    res.json({
      data: drugClasses.map(item => item.drugClass)
    });
  } catch (error) {
    console.error('Error fetching drug classes:', error);
    res.status(500).json({
      error: 'Internal server error while fetching drug classes'
    });
  }
};

module.exports = {
  getDrugs,
  getDrugById,
  createDrug,
  updateDrug,
  deleteDrug,
  getDrugClasses
};