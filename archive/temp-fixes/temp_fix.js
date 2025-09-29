    // Create condition presets
    console.log('🏥 Creating enhanced condition presets...');
    const createdPresets = {};
    for (const preset of conditionPresets) {
      const created = await prisma.conditionPreset.create({
        data: {
          name: preset.name,
          defaultProtocolId: preset.defaultProtocolId
        }
      });
      
      // Create diagnoses for this preset
      for (const diagnosis of preset.diagnoses) {
        await prisma.conditionPresetDiagnosis.create({
          data: {
            presetId: created.id,
            icd10: diagnosis.icd10,
            snomed: diagnosis.snomed,
            label: diagnosis.label
          }
        });
      }
      
      createdPresets[preset.name] = created;
      console.log(`  ✅ Created condition preset: ${preset.name}`);
    }
