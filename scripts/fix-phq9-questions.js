const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPHQ9Template() {
  console.log('🔧 Fixing PHQ-9 template to include individual questions...\n');

  // Find the PHQ-9 template
  const template = await prisma.assessmentTemplate.findFirst({
    where: { name: { contains: 'PHQ-9' } },
    include: { items: true }
  });

  if (!template) {
    console.error('❌ PHQ-9 template not found');
    return;
  }

  console.log('✅ Found PHQ-9 template:', template.id);
  console.log(`   Current items: ${template.items.length}\n`);

  // Define the 9 PHQ-9 questions
  const phq9Questions = [
    {
      key: 'phq9_q1_interest',
      displayName: 'PHQ-9 Q1: Interest or Pleasure',
      description: 'Little interest or pleasure in doing things',
      helpText: 'Over the last 2 weeks, how often: Little interest or pleasure in doing things',
    },
    {
      key: 'phq9_q2_depression',
      displayName: 'PHQ-9 Q2: Feeling Down',
      description: 'Feeling down, depressed, or hopeless',
      helpText: 'Over the last 2 weeks, how often: Feeling down, depressed, or hopeless',
    },
    {
      key: 'phq9_q3_sleep',
      displayName: 'PHQ-9 Q3: Sleep Problems',
      description: 'Trouble falling or staying asleep, or sleeping too much',
      helpText: 'Over the last 2 weeks, how often: Trouble falling or staying asleep, or sleeping too much',
    },
    {
      key: 'phq9_q4_fatigue',
      displayName: 'PHQ-9 Q4: Fatigue',
      description: 'Feeling tired or having little energy',
      helpText: 'Over the last 2 weeks, how often: Feeling tired or having little energy',
    },
    {
      key: 'phq9_q5_appetite',
      displayName: 'PHQ-9 Q5: Appetite',
      description: 'Poor appetite or overeating',
      helpText: 'Over the last 2 weeks, how often: Poor appetite or overeating',
    },
    {
      key: 'phq9_q6_self_worth',
      displayName: 'PHQ-9 Q6: Self-Worth',
      description: 'Feeling bad about yourself or feeling like a failure',
      helpText: 'Over the last 2 weeks, how often: Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
    },
    {
      key: 'phq9_q7_concentration',
      displayName: 'PHQ-9 Q7: Concentration',
      description: 'Trouble concentrating on things',
      helpText: 'Over the last 2 weeks, how often: Trouble concentrating on things, such as reading the newspaper or watching television',
    },
    {
      key: 'phq9_q8_psychomotor',
      displayName: 'PHQ-9 Q8: Psychomotor Changes',
      description: 'Moving or speaking slowly, or being fidgety/restless',
      helpText: 'Over the last 2 weeks, how often: Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
    },
    {
      key: 'phq9_q9_suicide',
      displayName: 'PHQ-9 Q9: Self-Harm Thoughts',
      description: 'Thoughts of being better off dead or hurting yourself',
      helpText: 'Over the last 2 weeks, how often: Thoughts that you would be better off dead, or of hurting yourself in some way',
    },
  ];

  const responseOptions = [
    'Not at all',
    'Several days',
    'More than half the days',
    'Nearly every day'
  ];

  console.log('📝 Creating metric definitions for 9 PHQ-9 questions...\n');

  // Create metric definitions for each question
  const createdMetrics = [];
  for (let i = 0; i < phq9Questions.length; i++) {
    const question = phq9Questions[i];

    // Check if metric already exists
    let metric = await prisma.metricDefinition.findFirst({
      where: {
        key: question.key,
        organizationId: null
      }
    });

    // Create if it doesn't exist
    if (!metric) {
      metric = await prisma.metricDefinition.create({
        data: {
          key: question.key,
          displayName: question.displayName,
          description: question.description,
          unit: 'score',
          valueType: 'ordinal',
          category: 'Mental Health',
          isStandardized: true,
          scaleMin: '0',
          scaleMax: '3',
          decimalPrecision: 0,
          options: responseOptions,
          normalRange: {
            min: 0,
            max: 0,
            interpretation: 'Not at all'
          },
          standardCoding: {
            primary: {
              system: 'http://loinc.org',
              code: `44250-${i + 1}`,
              display: `PHQ-9 item ${i + 1} score`
            }
          },
          validationInfo: {
            min: 0,
            max: 3
          }
        }
      });
      console.log(`   ✅ Created metric: ${metric.displayName} (${metric.id})`);
    } else {
      console.log(`   ⏭️  Metric already exists: ${metric.displayName} (${metric.id})`);
    }

    createdMetrics.push({ metric, helpText: question.helpText });
  }

  console.log('\n🔗 Linking metrics to PHQ-9 template as items...\n');

  // Delete existing items (except the total score if we want to keep it)
  const totalScoreItem = template.items.find(item => item.helpText?.includes('Total'));
  const itemsToDelete = template.items.filter(item => item.id !== totalScoreItem?.id);

  if (itemsToDelete.length > 0) {
    await prisma.assessmentTemplateItem.deleteMany({
      where: {
        id: { in: itemsToDelete.map(i => i.id) }
      }
    });
    console.log(`   🗑️  Deleted ${itemsToDelete.length} old items\n`);
  }

  // Create new items for the 9 questions
  for (let i = 0; i < createdMetrics.length; i++) {
    const { metric, helpText } = createdMetrics[i];

    await prisma.assessmentTemplateItem.create({
      data: {
        templateId: template.id,
        metricDefinitionId: metric.id,
        displayOrder: i + 1,
        isRequired: true,
        helpText: helpText
      }
    });

    console.log(`   ✅ Linked Q${i + 1}: ${metric.displayName}`);
  }

  // Keep the total score item at the end
  if (totalScoreItem) {
    await prisma.assessmentTemplateItem.update({
      where: { id: totalScoreItem.id },
      data: {
        displayOrder: 10,
        isRequired: true
      }
    });
    console.log(`   ✅ Updated total score item to display order 10\n`);
  }

  console.log('✅ PHQ-9 template fixed successfully!\n');

  // Verify the fix
  const updatedTemplate = await prisma.assessmentTemplate.findUnique({
    where: { id: template.id },
    include: {
      items: {
        include: { metricDefinition: true },
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  console.log(`📊 Updated template now has ${updatedTemplate.items.length} items:\n`);
  updatedTemplate.items.forEach(item => {
    console.log(`   ${item.displayOrder}. ${item.metricDefinition.displayName}`);
  });
}

fixPHQ9Template()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
