const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPainAlertRules() {
  try {
    console.log('Creating Pain Scale alert rules...\n');
    
    // Get the Pain Scale metric
    const painMetric = await prisma.metricDefinition.findFirst({
      where: { key: 'pain_scale_0_10' }
    });
    
    if (!painMetric) {
      console.error('❌ Pain Scale metric not found!');
      return;
    }
    
    console.log(`✅ Found Pain Scale metric: ${painMetric.displayName} (${painMetric.id})`);
    
    // Get the Chronic Pain Management condition preset
    const conditionPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' }
    });
    
    if (!conditionPreset) {
      console.error('❌ Chronic Pain Management condition preset not found!');
      return;
    }
    
    console.log(`✅ Found condition preset: ${conditionPreset.name} (${conditionPreset.id})\n`);
    
    // Create alert rules
    const rules = [
      {
        name: 'High Pain - Severe',
        description: 'Patient reports severe pain (8-10)',
        severity: 'HIGH',
        priority: 1,
        conditions: {
          metric: 'pain_scale_0_10',
          operator: 'gte',
          value: 8
        },
        actions: {
          notify: ['clinician'],
          createTask: true
        }
      },
      {
        name: 'Moderate Pain Alert',
        description: 'Patient reports moderate pain (5-7)',
        severity: 'MEDIUM',
        priority: 2,
        conditions: {
          metric: 'pain_scale_0_10',
          operator: 'gte',
          value: 5
        },
        actions: {
          notify: ['clinician']
        }
      }
    ];
    
    for (const ruleData of rules) {
      // Create the alert rule
      const rule = await prisma.alertRule.create({
        data: {
          name: ruleData.name,
          description: ruleData.description,
          severity: ruleData.severity,
          priority: ruleData.priority,
          isActive: true,
          conditions: ruleData.conditions,
          actions: ruleData.actions,
          organizationId: null // Platform-level rule
        }
      });
      
      console.log(`✅ Created alert rule: ${rule.name} (${rule.id})`);
      
      // Link to condition preset
      await prisma.conditionPresetAlertRule.create({
        data: {
          conditionPresetId: conditionPreset.id,
          alertRuleId: rule.id,
          isEnabled: true,
          priority: ruleData.priority
        }
      });
      
      console.log(`   ✓ Linked to ${conditionPreset.name}\n`);
    }
    
    console.log('🎉 Alert rules created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPainAlertRules();
