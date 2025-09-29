const { PrismaClient } = require('./generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function enhanceAssessmentTemplateSystem() {
  try {
    console.log('🚀 Starting Assessment Template System Enhancement...\n');

    // Step 1: Database schema updates (already done)
    console.log('✅ Step 1: Database schema already updated');

    // Step 2: Update existing standardized templates with proper field names
    console.log('\n📝 Step 2: Updating existing standardized templates...');
    
    const standardizedTemplateUpdates = [
      {
        name: 'Brief Pain Inventory (BPI)',
        updates: {
          isStandardized: true,
          category: 'pain_assessment',
          validationInfo: {
            instrument: 'BPI',
            developer: 'Charles Cleeland, University of Texas MD Anderson Cancer Center',
            validation: 'Validated in multiple languages and populations',
            reliability: 'Cronbach\'s alpha: 0.77-0.91',
            clinicalUse: 'Pain severity and interference assessment'
          },
          standardCoding: {
            loinc: '72514-3',
            snomed: '22253000',
            icd10: 'R52'
          },
          clinicalUse: 'Comprehensive pain assessment measuring severity and interference'
        }
      },
      {
        name: 'Patient Health Questionnaire-9 (PHQ-9)',
        updates: {
          isStandardized: true,
          category: 'mental_health',
          validationInfo: {
            instrument: 'PHQ-9',
            developer: 'Pfizer Inc.',
            validation: 'Validated for depression screening and monitoring',
            sensitivity: '88%',
            specificity: '88%',
            clinicalUse: 'Depression screening, severity assessment, treatment monitoring'
          },
          standardCoding: {
            loinc: '44249-1',
            snomed: '273724008',
            icd10: 'Z13.89'
          },
          scoringInfo: {
            totalScore: {
              range: '0-27',
              interpretation: {
                '0-4': 'Minimal depression',
                '5-9': 'Mild depression',
                '10-14': 'Moderate depression',
                '15-19': 'Moderately severe depression',
                '20-27': 'Severe depression'
              }
            }
          },
          clinicalUse: 'Depression screening and severity assessment'
        }
      },
      {
        name: 'Generalized Anxiety Disorder-7 (GAD-7)',
        updates: {
          isStandardized: true,
          category: 'mental_health',
          validationInfo: {
            instrument: 'GAD-7',
            developer: 'Pfizer Inc.',
            validation: 'Validated for anxiety screening and monitoring',
            sensitivity: '89%',
            specificity: '82%',
            clinicalUse: 'Anxiety screening, severity assessment, treatment monitoring'
          },
          standardCoding: {
            loinc: '70274-6',
            snomed: '133971000119108',
            icd10: 'F41.1'
          },
          scoringInfo: {
            totalScore: {
              range: '0-21',
              interpretation: {
                '0-4': 'Minimal anxiety',
                '5-9': 'Mild anxiety',
                '10-14': 'Moderate anxiety',
                '15-21': 'Severe anxiety'
              }
            }
          },
          clinicalUse: 'Anxiety screening and severity assessment'
        }
      }
    ];

    for (const templateUpdate of standardizedTemplateUpdates) {
      await prisma.assessmentTemplate.updateMany({
        where: { name: templateUpdate.name },
        data: templateUpdate.updates
      });
      console.log(`   ✅ Updated: ${templateUpdate.name}`);
    }

    // Step 3: Create enhanced controller methods
    console.log('\n🔧 Step 3: Creating enhanced controller methods...');
    
    const enhancedControllerCode = `
// Enhanced Assessment Template Controller
// Supports both standardized and custom templates

const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

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
            orderBy: { order: 'asc' }
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
          orderBy: { order: 'asc' }
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
          orderBy: { order: 'asc' }
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
          orderBy: { order: 'asc' }
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
`;

    const controllerPath = path.join(__dirname, 'src', 'controllers', 'assessmentTemplateController.enhanced.js');
    fs.writeFileSync(controllerPath, enhancedControllerCode);
    console.log('   ✅ Enhanced controller created');

    // Step 4: Create enhanced API routes
    console.log('\n🛣️  Step 4: Creating enhanced API routes...');
    
    const enhancedRoutesCode = `
const express = require('express');
const router = express.Router();
const {
  getAllAssessmentTemplates,
  getStandardizedTemplates,
  getCustomTemplates,
  getTemplateCategories,
  getTemplateById
} = require('../controllers/assessmentTemplateController.enhanced');

// Enhanced routes with standardization support
router.get('/', getAllAssessmentTemplates);
router.get('/standardized', getStandardizedTemplates);
router.get('/custom', getCustomTemplates);
router.get('/categories', getTemplateCategories);
router.get('/:id', getTemplateById);

module.exports = router;
`;

    const routesPath = path.join(__dirname, 'src', 'routes', 'assessmentTemplateRoutes.enhanced.js');
    fs.writeFileSync(routesPath, enhancedRoutesCode);
    console.log('   ✅ Enhanced routes created');

    // Step 5: Create enhanced frontend component
    console.log('\n🎨 Step 5: Creating enhanced frontend component...');
    
    const enhancedComponentCode = `
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, CheckCircle, Circle } from 'lucide-react';

const EnhancedAssessmentTemplateSelector = ({ onSelect, selectedTemplateId }) => {
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/assessment-templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/assessment-templates/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    
    const matchesTab = activeTab === 'all' || 
                      (activeTab === 'standardized' && template.isStandardized) ||
                      (activeTab === 'custom' && !template.isStandardized);
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'pain_assessment': 'bg-red-100 text-red-800',
      'mental_health': 'bg-blue-100 text-blue-800',
      'functional_assessment': 'bg-green-100 text-green-800',
      'quality_of_life': 'bg-purple-100 text-purple-800',
      'custom': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatCategoryName = (category) => {
    return category?.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()) || 'Custom';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {formatCategoryName(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="standardized">Standardized</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid gap-4">
              {filteredTemplates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-500">No templates found matching your criteria.</p>
                  </CardContent>
                </Card>
              ) : (
                filteredTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className={\`cursor-pointer transition-all hover:shadow-md \${
                      selectedTemplateId === template.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                    }\`}
                    onClick={() => onSelect(template)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {selectedTemplateId === template.id ? (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {template.isStandardized ? (
                              <Badge className="bg-green-100 text-green-800">
                                Standardized
                              </Badge>
                            ) : (
                              <Badge variant="outline">Custom</Badge>
                            )}
                            {template.category && (
                              <Badge className={getCategoryBadgeColor(template.category)}>
                                {formatCategoryName(template.category)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {template.description && (
                        <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                      )}
                      
                      {template.isStandardized && template.validationInfo && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                          <h4 className="font-medium text-sm mb-2">Clinical Information</h4>
                          <div className="text-xs text-gray-600 space-y-1">
                            {template.validationInfo.developer && (
                              <p><strong>Developer:</strong> {template.validationInfo.developer}</p>
                            )}
                            {template.validationInfo.validation && (
                              <p><strong>Validation:</strong> {template.validationInfo.validation}</p>
                            )}
                            {template.clinicalUse && (
                              <p><strong>Clinical Use:</strong> {template.clinicalUse}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{template.items?.length || 0} items</span>
                        <span>Version {template.version}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAssessmentTemplateSelector;
`;

    const componentPath = path.join(__dirname, 'src', 'components', 'EnhancedAssessmentTemplateSelector.jsx');
    fs.writeFileSync(componentPath, enhancedComponentCode);
    console.log('   ✅ Enhanced frontend component created');

    console.log('\n🎉 Assessment Template System Enhancement Complete!');
    console.log('\n📋 Summary of Enhancements:');
    console.log('   ✅ Database schema updated with standardization fields');
    console.log('   ✅ Existing standardized templates updated with validation info');
    console.log('   ✅ Enhanced controller with filtering and search capabilities');
    console.log('   ✅ New API routes for standardized/custom template access');
    console.log('   ✅ Enhanced frontend component with unified template selection');
    
    console.log('\n🔧 New API Endpoints Available:');
    console.log('   • GET /api/assessment-templates - All templates with filtering');
    console.log('   • GET /api/assessment-templates/standardized - Standardized only');
    console.log('   • GET /api/assessment-templates/custom - Custom only');
    console.log('   • GET /api/assessment-templates/categories - Available categories');
    console.log('   • GET /api/assessment-templates/:id - Template details');

    console.log('\n🎯 Benefits:');
    console.log('   • Clear distinction between standardized and custom templates');
    console.log('   • Enhanced search and filtering capabilities');
    console.log('   • Clinical validation information for standardized instruments');
    console.log('   • Improved user experience with unified template selector');
    console.log('   • Consistent with existing metric standardization approach');

  } catch (error) {
    console.error('❌ Error enhancing assessment template system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { enhanceAssessmentTemplateSystem };

if (require.main === module) {
  enhanceAssessmentTemplateSystem()
    .catch(console.error)
    .finally(() => process.exit());
}