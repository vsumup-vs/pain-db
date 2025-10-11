const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentState() {
  console.log('🔍 Checking current database state...\n');
  
  try {
    // Check templates
    const templates = await prisma.assessmentTemplate.findMany();
    console.log(`📋 Assessment Templates: ${templates.length}`);
    
    // Check metrics
    const metrics = await prisma.metricDefinition.findMany();
    console.log(`📊 Metric Definitions: ${metrics.length}`);
    
    // Check template items (if table exists)
    try {
      const items = await prisma.assessmentTemplateItem.findMany();
      console.log(`🔗 Template Items: ${items.length}`);
    } catch (error) {
      console.log(`🔗 Template Items: Table doesn't exist yet`);
    }
    
    return { templates: templates.length, metrics: metrics.length };
    
  } catch (error) {
    console.error('❌ Error checking state:', error.message);
    return null;
  }
}

async function restoreTemplates() {
  console.log('\n🔄 Restoring assessment templates...\n');
  
  try {
    // Standard assessment templates with categories
    const templates = [
      {
        name: "Chronic Pain Daily Assessment",
        description: "Daily pain monitoring including intensity, interference, and functional limitations",
        category: "Pain Management",
        questions: {
          sections: [
            {
              title: "Pain Assessment",
              questions: [
                {
                  id: "pain_intensity",
                  text: "Rate your current pain level",
                  type: "numeric_scale",
                  scale: { min: 0, max: 10, labels: { 0: "No pain", 10: "Worst possible pain" } }
                },
                {
                  id: "pain_interference",
                  text: "How much has pain interfered with your daily activities?",
                  type: "numeric_scale",
                  scale: { min: 0, max: 10, labels: { 0: "No interference", 10: "Complete interference" } }
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["72133-2"],
          snomed: ["225908003"]
        }
      },
      {
        name: "Mental Health Weekly Assessment",
        description: "Weekly depression and anxiety screening using standardized tools",
        category: "Mental Health",
        questions: {
          sections: [
            {
              title: "Depression Screening",
              questions: [
                {
                  id: "phq9_score",
                  text: "PHQ-9 Depression Score",
                  type: "numeric_scale",
                  scale: { min: 0, max: 27 }
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["44249-1"],
          snomed: ["35489007"]
        }
      },
      {
        name: "Cardiovascular Daily Monitoring",
        description: "Daily blood pressure and weight monitoring for cardiovascular health",
        category: "Cardiovascular",
        questions: {
          sections: [
            {
              title: "Vital Signs",
              questions: [
                {
                  id: "blood_pressure",
                  text: "Blood Pressure Reading",
                  type: "blood_pressure"
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["85354-9"],
          snomed: ["75367002"]
        }
      },
      {
        name: "Diabetes Comprehensive Monitoring",
        description: "Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence",
        category: "Diabetes",
        questions: {
          sections: [
            {
              title: "Glucose Monitoring",
              questions: [
                {
                  id: "glucose_level",
                  text: "Blood Glucose Level",
                  type: "numeric_input",
                  unit: "mg/dL"
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["33747-0"],
          snomed: ["33747000"]
        }
      },
      {
        name: "Diabetes Monitoring",
        description: "Comprehensive diabetes monitoring including glucose, HbA1c, and medication adherence",
        category: "Endocrine",
        questions: {
          sections: [
            {
              title: "Glucose Monitoring",
              questions: [
                {
                  id: "glucose_level",
                  text: "Blood Glucose Level",
                  type: "numeric_input",
                  unit: "mg/dL"
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["33747-0"],
          snomed: ["33747000"]
        }
      },
      {
        name: "Arthritis Management Assessment",
        description: "Daily arthritis monitoring including joint symptoms and functional limitations",
        category: "Musculoskeletal",
        questions: {
          sections: [
            {
              title: "Joint Assessment",
              questions: [
                {
                  id: "joint_pain",
                  text: "Joint Pain Level",
                  type: "numeric_scale",
                  scale: { min: 0, max: 10 }
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["72133-2"],
          snomed: ["57676002"]
        }
      },
      {
        name: "Fibromyalgia Daily Check-in",
        description: "Comprehensive fibromyalgia symptom tracking including pain, fatigue, sleep, and cognitive symptoms",
        category: "Pain Management",
        questions: {
          sections: [
            {
              title: "Symptom Assessment",
              questions: [
                {
                  id: "widespread_pain",
                  text: "Widespread Pain Level",
                  type: "numeric_scale",
                  scale: { min: 0, max: 10 }
                }
              ]
            }
          ]
        },
        isStandardized: true,
        standardCoding: {
          loinc: ["72133-2"],
          snomed: ["203082005"]
        }
      }
    ];

    let createdCount = 0;
    
    for (const template of templates) {
      // Check if template already exists
      const existing = await prisma.assessmentTemplate.findFirst({
        where: { name: template.name }
      });
      
      if (!existing) {
        await prisma.assessmentTemplate.create({
          data: template
        });
        console.log(`✅ Created: ${template.name}`);
        createdCount++;
      } else {
        console.log(`⏭️  Exists: ${template.name}`);
      }
    }
    
    console.log(`\n📊 Created ${createdCount} new templates`);
    return createdCount;
    
  } catch (error) {
    console.error('❌ Error restoring templates:', error);
    return 0;
  }
}

async function main() {
  console.log('🚀 Checking and Restoring Assessment Templates...\n');
  
  try {
    // Check current state
    const state = await checkCurrentState();
    
    if (!state) {
      console.log('❌ Could not check database state');
      return;
    }
    
    // Restore templates if needed
    if (state.templates === 0) {
      console.log('\n⚠️  No templates found, restoring...');
      await restoreTemplates();
    } else {
      console.log('\n✅ Templates already exist');
    }
    
    // Check final state
    console.log('\n🔍 Final state check...');
    await checkCurrentState();
    
    console.log('\n🎉 Template restoration completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Refresh your browser');
    console.log('   2. Templates should now be visible');
    console.log('   3. Run the template items script if needed');
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the restoration
main();