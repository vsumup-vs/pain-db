const fs = require('fs');
const path = require('path');

async function fixEnhancedController() {
  console.log('🔧 Fixing Enhanced Assessment Template Controller...\n');

  const controllerPath = '/home/vsumup/pain-db/src/controllers/assessmentTemplateController.enhanced.js';
  
  try {
    // Read the current file
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // Define the items include block
    const itemsInclude = `        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                name: true,
                displayName: true,
                description: true,
                unit: true,
                valueType: true,
                category: true,
                normalRange: true,
                isStandardized: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        },`;

    // Fix getAllAssessmentTemplates - add items before assessments
    content = content.replace(
      /(\s+)include: {\s*assessments: true,/,
      `$1include: {
${itemsInclude}
$1  assessments: true,`
    );

    // Fix getStandardizedTemplates - add items before assessments  
    content = content.replace(
      /(\s+)include: {\s*assessments: true,\s*conditionPresetTemplates:/,
      `$1include: {
${itemsInclude}
$1  assessments: true,
$1  conditionPresetTemplates:`
    );

    // Fix getCustomTemplates - add items before assessments
    content = content.replace(
      /(\s+)include: {\s*assessments: true,\s*conditionPresetTemplates:/g,
      `$1include: {
${itemsInclude}
$1  assessments: true,
$1  conditionPresetTemplates:`
    );

    // Fix getTemplateById function - more targeted replacement
    content = content.replace(
      /(const template = await prisma\.assessmentTemplate\.findUnique\({\s*where: { id },\s*include: {)\s*assessments: true,/,
      `$1
${itemsInclude}
        assessments: true,`
    );

    // Fix the response format for getTemplateById
    content = content.replace(
      /if \(!template\) {\s*return res\.status\(404\)\.json\({ error: 'Template not found' }\);\s*}\s*res\.json\(template\);/,
      `if (!template) {
      return res.status(404).json({ 
        success: false,
        message: 'Template not found' 
      });
    }

    res.json({
      success: true,
      data: template
    });`
    );

    // Fix error response format for getTemplateById
    content = content.replace(
      /res\.status\(500\)\.json\({ error: 'Failed to fetch template' }\);/,
      `res.status(500).json({ 
      success: false,
      message: 'Failed to fetch template' 
    });`
    );

    // Write the updated content back to the file
    fs.writeFileSync(controllerPath, content);
    
    console.log('✅ Enhanced controller updated successfully!');
    console.log('📝 Changes made:');
    console.log('   - Added items relationship to getAllAssessmentTemplates');
    console.log('   - Added items relationship to getStandardizedTemplates');
    console.log('   - Added items relationship to getCustomTemplates');
    console.log('   - Added items relationship to getTemplateById');
    console.log('   - Updated response format for consistency');
    console.log('   - Included metricDefinition details in items');
    
  } catch (error) {
    console.error('❌ Error fixing enhanced controller:', error.message);
    console.error(error.stack);
  }
}

fixEnhancedController();