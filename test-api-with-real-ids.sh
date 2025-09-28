#!/bin/bash

echo "🔍 Getting template IDs and testing API..."

# First, let's get some template IDs from the database
node -e "
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function getIds() {
  try {
    const templates = await prisma.assessmentTemplate.findMany({
      where: { isStandardized: true },
      select: { id: true, name: true },
      take: 3
    });
    
    console.log('Available Template IDs:');
    templates.forEach(t => console.log(\`\${t.id} - \${t.name}\`));
    
    if (templates.length > 0) {
      console.log(\`\nTesting API with first template ID: \${templates[0].id}\`);
      return templates[0].id;
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

getIds().then(id => {
  if (id) {
    console.log(\`\nTest this command:\`);
    console.log(\`curl http://localhost:3001/api/assessment-templates-v2/\${id}\`);
  }
});
"