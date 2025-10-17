#!/usr/bin/env node
/**
 * Schema Reference Generator
 *
 * Automatically generates documentation for database schema
 * by parsing Prisma schema file and extracting model definitions.
 *
 * Usage: node scripts/generate-schema-reference.js
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../prisma/schema.prisma');
const OUTPUT_PATH = path.join(__dirname, '../docs/schema-generated.md');

function parseSchema() {
  const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  const models = [];
  const enums = [];

  // Extract models
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];

    const fields = [];
    const fieldRegex = /(\w+)\s+([\w\[\]?]+)(\s+@[\w()="',.\s]+)?/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const attributes = fieldMatch[3] || '';

      // Skip relation fields and special attributes
      if (fieldName !== 'model' && !attributes.includes('@relation')) {
        fields.push({
          name: fieldName,
          type: fieldType,
          required: !fieldType.includes('?'),
          default: attributes.match(/@default\((.*?)\)/)?.[1] || null,
          unique: attributes.includes('@unique'),
          id: attributes.includes('@id')
        });
      }
    }

    models.push({ name: modelName, fields });
  }

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
  while ((match = enumRegex.exec(schemaContent)) !== null) {
    const enumName = match[1];
    const enumBody = match[2];
    const values = enumBody.trim().split(/\s+/).filter(v => v && !v.startsWith('//'));
    enums.push({ name: enumName, values });
  }

  return { models, enums };
}

function generateMarkdown(data) {
  let markdown = `# Database Schema Reference\n\n`;
  markdown += `> **Auto-generated** from Prisma schema\n`;
  markdown += `> Last Updated: ${new Date().toISOString()}\n\n`;

  markdown += `## Models\n\n`;

  // Generate model tables
  data.models.forEach(model => {
    markdown += `### ${model.name}\n\n`;
    markdown += `| Field | Type | Required | Default | Constraints |\n`;
    markdown += `|-------|------|----------|---------|-------------|\n`;

    model.fields.forEach(field => {
      const constraints = [];
      if (field.id) constraints.push('Primary Key');
      if (field.unique) constraints.push('Unique');

      markdown += `| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.default || '-'} | ${constraints.join(', ') || '-'} |\n`;
    });

    markdown += `\n`;
  });

  markdown += `## Enums\n\n`;

  // Generate enum tables
  data.enums.forEach(enumDef => {
    markdown += `### ${enumDef.name}\n\n`;
    markdown += `\`\`\`\n`;
    enumDef.values.forEach(value => {
      markdown += `${value}\n`;
    });
    markdown += `\`\`\`\n\n`;
  });

  return markdown;
}

function main() {
  console.log('Parsing Prisma schema...');
  const data = parseSchema();

  console.log(`Found ${data.models.length} models and ${data.enums.length} enums`);

  console.log('Generating markdown documentation...');
  const markdown = generateMarkdown(data);

  fs.writeFileSync(OUTPUT_PATH, markdown, 'utf-8');

  console.log(`✅ Schema reference generated at: ${OUTPUT_PATH}`);
  console.log(`\nModels documented: ${data.models.map(m => m.name).join(', ')}`);
  console.log(`Enums documented: ${data.enums.map(e => e.name).join(', ')}`);
}

if (require.main === module) {
  main();
}

module.exports = { parseSchema, generateMarkdown };
