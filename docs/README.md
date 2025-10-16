# ClinMetrics Pro - Documentation System

> **Purpose**: Central hub for all project documentation
> **Last Updated**: 2025-10-16

---

## 📚 Documentation Structure

### Core Reference Documents

| Document | Type | Purpose | Update Frequency |
|----------|------|---------|------------------|
| **[developer-reference.md](./developer-reference.md)** | Manual | Complete developer reference with patterns, examples, and troubleshooting | After major features or schema changes |
| **[schema-generated.md](./schema-generated.md)** | Auto-generated | Database schema documentation from Prisma | Run script after schema changes |
| **[api-endpoints-generated.md](./api-endpoints-generated.md)** | Auto-generated | API endpoint reference from route files | Run script after adding/modifying routes |

### Additional Documentation

| Document | Purpose |
|----------|---------|
| **[clinical-monitoring-gap-analysis.md](./clinical-monitoring-gap-analysis.md)** | Analysis of clinical monitoring requirements and gaps |
| **[product roadmap](./../.agent-os/product/roadmap.md)** | Product development roadmap and phases |
| **[tech stack](./../.agent-os/product/tech-stack.md)** | Technology stack and architecture decisions |
| **[mission](./../.agent-os/product/mission.md)** | Product mission, users, and differentiators |

---

## 🚀 Quick Start Guide

### For Developers

**1. Read the Core Reference First**:
```bash
cat docs/developer-reference.md
```

This contains:
- Database schema with all fields and relationships
- API endpoints with request/response examples
- Common code patterns (multi-tenant queries, User vs Clinician IDs, etc.)
- Enum values reference
- Troubleshooting guide

**2. Generate Up-to-Date Schema Reference**:
```bash
node scripts/generate-schema-reference.js
```

**3. Generate Up-to-Date API Documentation**:
```bash
node scripts/generate-api-docs.js
```

**4. Keep References Handy**:
Bookmark these files in your IDE or keep them open in a tab for quick reference during development.

---

## 📝 When to Use Each Document

### developer-reference.md
**Use when:**
- Creating new controllers or routes
- Writing database queries
- Implementing authentication/authorization
- Troubleshooting foreign key or unique constraint errors
- Understanding User vs Clinician ID differences
- Learning common code patterns

**Examples:**
- "How do I create a TimeLog entry?" → Check "Creating a TimeLog" section
- "What fields does the Alert model have?" → Check "Alert" table in Database Schema Reference
- "How do I query with multi-tenant isolation?" → Check "Multi-Tenant Query Pattern"
- "What are the available AlertStatus values?" → Check "Enum Values Reference"

### schema-generated.md
**Use when:**
- Need quick lookup of field types and constraints
- Checking if a field is required or optional
- Verifying default values
- Understanding which fields are unique or indexed

**When to regenerate:**
- After running `npx prisma migrate dev`
- After modifying `prisma/schema.prisma`
- Before committing schema changes

### api-endpoints-generated.md
**Use when:**
- Testing API endpoints with curl or Postman
- Understanding which endpoints require authentication
- Checking what permissions are needed for an endpoint
- Documenting API for frontend developers

**When to regenerate:**
- After adding new routes
- After modifying authentication/permission requirements
- Before sharing API documentation with team

---

## 🔧 Automated Documentation Scripts

### Generate Schema Reference

**Script**: `scripts/generate-schema-reference.js`

**What it does**:
- Parses `prisma/schema.prisma`
- Extracts all models and their fields
- Extracts all enums and their values
- Generates markdown tables with field types, constraints, defaults

**Usage**:
```bash
node scripts/generate-schema-reference.js
```

**Output**: `docs/schema-generated.md`

**Add to package.json** (optional):
```json
{
  "scripts": {
    "docs:schema": "node scripts/generate-schema-reference.js"
  }
}
```

Then run:
```bash
npm run docs:schema
```

---

### Generate API Documentation

**Script**: `scripts/generate-api-docs.js`

**What it does**:
- Scans all files in `src/routes/`
- Extracts route definitions (method, path, controller, function)
- Detects authentication and permission requirements
- Groups endpoints by category
- Generates markdown tables with endpoint details

**Usage**:
```bash
node scripts/generate-api-docs.js
```

**Output**: `docs/api-endpoints-generated.md`

**Add to package.json** (optional):
```json
{
  "scripts": {
    "docs:api": "node scripts/generate-api-docs.js"
  }
}
```

Then run:
```bash
npm run docs:api
```

---

### Generate All Documentation

**Add to package.json**:
```json
{
  "scripts": {
    "docs:generate": "node scripts/generate-schema-reference.js && node scripts/generate-api-docs.js"
  }
}
```

Then run:
```bash
npm run docs:generate
```

---

## 🔄 Recommended Workflow

### During Development

1. **Before writing code**: Check `developer-reference.md` for patterns and examples
2. **When unsure about a field**: Check `schema-generated.md` for field types
3. **When calling an API**: Check `api-endpoints-generated.md` for endpoint details

### After Schema Changes

```bash
# 1. Run Prisma migration
npx prisma migrate dev --name add_new_field

# 2. Regenerate schema docs
node scripts/generate-schema-reference.js

# 3. Update developer-reference.md with new patterns (if applicable)
```

### After Adding Routes

```bash
# 1. Add new routes in src/routes/
# (code here)

# 2. Regenerate API docs
node scripts/generate-api-docs.js

# 3. Update developer-reference.md with examples (if applicable)
```

### Before Committing

```bash
# Regenerate all docs
npm run docs:generate

# Commit updated docs with code changes
git add docs/
git commit -m "feat: add new feature with updated docs"
```

---

## 🎯 Best Practices

### 1. Keep Developer Reference Updated

**Update `developer-reference.md` when:**
- Adding new complex patterns
- Discovering common errors and solutions
- Creating reusable code snippets
- Documenting non-obvious behaviors

**Example scenarios:**
- New authentication method added
- New billing workflow implemented
- Complex query pattern discovered
- Tricky bug resolved

### 2. Automate Doc Generation

**Add to CI/CD pipeline**:
```yaml
# .github/workflows/docs.yml
name: Generate Documentation
on:
  push:
    branches: [main, staging]
    paths:
      - 'prisma/schema.prisma'
      - 'src/routes/**'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run docs:generate
      - run: git add docs/
      - run: git commit -m "docs: auto-generate documentation" || true
      - run: git push
```

### 3. Version Control Documentation

**Always commit generated docs**:
```bash
# Include in commits
git add docs/schema-generated.md
git add docs/api-endpoints-generated.md
```

**Why?**
- Team members can see changes in PRs
- Historical reference for schema evolution
- Easy to diff changes between versions

### 4. Link Docs in Code Comments

**Example**:
```javascript
/**
 * Resolve an alert with clinical documentation and billing.
 *
 * See: docs/developer-reference.md#resolveAlert
 *
 * @param {string} req.params.id - Alert ID
 * @param {string} req.body.resolutionNotes - Clinical notes (required)
 * @param {string} req.body.actionTaken - Action taken enum (required)
 * @param {number} req.body.timeSpentMinutes - Time in minutes (required)
 * @param {string} req.body.cptCode - CPT billing code (optional)
 */
async function resolveAlert(req, res) {
  // Implementation
}
```

---

## 🆘 Troubleshooting

### Script Fails to Parse Schema

**Error**: `SyntaxError: Unexpected token`

**Solution**:
1. Check `prisma/schema.prisma` syntax
2. Run `npx prisma format` to auto-format
3. Re-run script

### Script Doesn't Detect New Routes

**Error**: New endpoint not showing in generated docs

**Solution**:
1. Ensure route uses standard Express pattern:
   ```javascript
   router.get('/path', requireAuth, controller.function);
   ```
2. Check route file is in `src/routes/` directory
3. Re-run script

### Generated Docs Out of Date

**Solution**:
```bash
# Force regenerate all
rm docs/schema-generated.md
rm docs/api-endpoints-generated.md
npm run docs:generate
```

---

## 📊 Documentation Statistics

### Current Coverage

**Database Schema**:
- ✅ 28 models documented
- ✅ 21 enums documented
- ✅ All fields with types, constraints, defaults

**API Endpoints**:
- ✅ 167 endpoints documented
- ✅ Authentication requirements specified
- ✅ Permission requirements specified
- ✅ Controller functions mapped

**Developer Reference**:
- ✅ Common patterns documented
- ✅ Troubleshooting guide included
- ✅ Code examples for all major operations
- ✅ Enum values reference
- ✅ Field validation rules

---

## 🔮 Future Enhancements

### Planned Improvements

1. **Interactive API Explorer**
   - Swagger/OpenAPI integration
   - Try-it-out functionality
   - Request/response examples

2. **Code Sample Generator**
   - Generate boilerplate code from docs
   - Copy-paste ready snippets
   - Language-specific examples (JavaScript, TypeScript)

3. **Documentation Search**
   - Full-text search across all docs
   - Quick jump to sections
   - Search by model, endpoint, pattern

4. **Change Detection**
   - Highlight recent changes in schema
   - Show deprecated fields/endpoints
   - Migration guides for breaking changes

5. **Visual Diagrams**
   - ER diagrams from Prisma schema
   - API endpoint dependency graphs
   - Data flow diagrams

---

## 📞 Support

**Questions or Issues?**

1. Check `developer-reference.md` first
2. Search generated docs for specific terms
3. Review code comments in controllers
4. Consult Agent OS product docs in `.agent-os/product/`

**Contributing to Documentation**:

1. Manual updates: Edit `developer-reference.md` directly
2. Schema updates: Run `npm run docs:generate` after Prisma changes
3. New patterns: Add to "Common Code Patterns" section
4. Troubleshooting: Add to "Troubleshooting Common Errors" section

---

## 📜 License

Documentation follows the same license as the ClinMetrics Pro project.

---

**Last Updated**: 2025-10-16
**Maintained By**: Development Team
