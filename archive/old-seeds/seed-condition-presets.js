const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const conditionPresets = [
  {
    name: 'Chronic Pain Management',
    defaultProtocolId: 'chronic_pain_protocol_v1',
    diagnoses: [
      {
        icd10: 'M79.3',
        snomed: '82423001',
        label: 'Chronic pain syndrome'
      },
      {
        icd10: 'M25.50',
        snomed: '57676002',
        label: 'Joint pain, unspecified'
      },
      {
        icd10: 'M54.5',
        snomed: '279039007',
        label: 'Low back pain'
      },
      {
        icd10: 'G89.29',
        snomed: '82423001',
        label: 'Other chronic pain'
      }
    ]
  },
  {
    name: 'Medication Adherence Monitoring',
    defaultProtocolId: 'medication_adherence_protocol_v1',
    diagnoses: [
      {
        icd10: 'Z91.14',
        snomed: '182840001',
        label: 'Patient\'s noncompliance with medication regimen'
      },
      {
        icd10: 'Z91.120',
        snomed: '182840001',
        label: 'Patient\'s intentional underdosing of medication regimen'
      },
      {
        icd10: 'Z91.130',
        snomed: '182840001',
        label: 'Patient\'s unintentional underdosing of medication regimen'
      }
    ]
  },
  {
    name: 'Opioid Management Program',
    defaultProtocolId: 'opioid_management_protocol_v1',
    diagnoses: [
      {
        icd10: 'F11.10',
        snomed: '191816009',
        label: 'Opioid abuse, uncomplicated'
      },
      {
        icd10: 'F11.20',
        snomed: '191816009',
        label: 'Opioid dependence, uncomplicated'
      },
      {
        icd10: 'G89.3',
        snomed: '82423001',
        label: 'Neoplasm related pain (acute) (chronic)'
      }
    ]
  },
  {
    name: 'Post-Surgical Pain Management',
    defaultProtocolId: 'post_surgical_pain_protocol_v1',
    diagnoses: [
      {
        icd10: 'G89.18',
        snomed: '274663001',
        label: 'Other acute postprocedural pain'
      },
      {
        icd10: 'G89.28',
        snomed: '274663001',
        label: 'Other chronic postprocedural pain'
      }
    ]
  },
  {
    name: 'Fibromyalgia Care',
    defaultProtocolId: 'fibromyalgia_care_protocol_v1',
    diagnoses: [
      {
        icd10: 'M79.7',
        snomed: '24693007',
        label: 'Fibromyalgia'
      },
      {
        icd10: 'M79.0',
        snomed: '288231001',
        label: 'Rheumatism, unspecified'
      },
      {
        icd10: 'M25.511',
        snomed: '57676002',
        label: 'Pain in right shoulder'
      },
      {
        icd10: 'M25.512',
        snomed: '57676002',
        label: 'Pain in left shoulder'
      }
    ]
  },
  {
    name: 'Arthritis Management',
    defaultProtocolId: 'arthritis_management_protocol_v1',
    diagnoses: [
      {
        icd10: 'M06.9',
        snomed: '69896004',
        label: 'Rheumatoid arthritis, unspecified'
      },
      {
        icd10: 'M15.9',
        snomed: '396275006',
        label: 'Polyosteoarthritis, unspecified'
      },
      {
        icd10: 'M19.90',
        snomed: '396275006',
        label: 'Unspecified osteoarthritis, unspecified site'
      },
      {
        icd10: 'M13.10',
        snomed: '3723001',
        label: 'Monoarthritis, not elsewhere classified, unspecified site'
      }
    ]
  }
];

async function seedConditionPresets() {
  try {
    console.log('Seeding condition presets...');
    
    for (const presetData of conditionPresets) {
      // Check if preset already exists
      const existingPreset = await prisma.conditionPreset.findFirst({
        where: { name: presetData.name }
      });
      
      if (existingPreset) {
        console.log(`Condition preset "${presetData.name}" already exists, skipping...`);
        continue;
      }
      
      // Create the preset
      const preset = await prisma.conditionPreset.create({
        data: {
          name: presetData.name,
          defaultProtocolId: presetData.defaultProtocolId
        }
      });
      
      // Create associated diagnoses
      for (const diagnosis of presetData.diagnoses) {
        await prisma.conditionPresetDiagnosis.create({
          data: {
            presetId: preset.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label
          }
        });
      }
      
      console.log(`Created condition preset: ${presetData.name} with ${presetData.diagnoses.length} diagnoses`);
    }
    
    console.log('Condition presets seeding completed!');
  } catch (error) {
    console.error('Error seeding condition presets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedConditionPresets();