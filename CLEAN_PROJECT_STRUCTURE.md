# Clean Project Structure

After archiving redundant files, here's the streamlined project structure for client deployments:

## 🎯 Core Deployment Files

### Primary Setup
- `enhanced-rtm-deployment.sh` - **Main deployment script for new clients**
- `enhanced-rtm-comprehensive-setup.js` - **Complete RTM setup (replaces all old setup files)**
- `update-rtm-deployment.sh` - **Non-destructive updates for existing systems**

### Supporting Seed Files
- `seed-drugs.js` - Drug database
- `seed-medication-metrics.js` - Medication tracking metrics
- `seed-medication-templates.js` - Medication assessment templates
- `seed-preset-links.js` - Condition preset connections
- `setup-enrollments.js` - Sample patient enrollments

## 📁 Application Structure

### Backend
- `src/` - Application source code
  - `controllers/` - API controllers
  - `routes/` - API routes
  - `middleware/` - Security and validation
  - `services/` - Database services
- `prisma/` - Database schema and migrations
- `index.js` - Main server file
- `start-servers.js` - Server startup
- `start-servers.sh` - Server startup script

### Frontend
- `frontend/` - React application
  - `src/` - Frontend source code
  - `package.json` - Frontend dependencies

### Configuration
- `package.json` - Backend dependencies
- `.env.local` / `.env.production` - Environment variables
- `jest.config.js` - Test configuration

## 📚 Documentation

### RTM Guides
- `RTM_COMPLIANCE_GUIDE.md` - RTM billing and compliance
- `RTM_ENHANCED_COVERAGE_GUIDE.md` - Enhanced RTM features
- `RTM_STANDARD_SEED_GUIDE.md` - RTM standard components

### Implementation Guides
- `ASSESSMENT_TEMPLATE_IMPLEMENTATION_GUIDE.md` - Template implementation
- `STANDARDIZATION_GUIDE.md` - Coding standards
- `STANDARDIZED_ASSESSMENT_GUIDE.md` - Assessment protocols
- `SYSTEM_INTEGRITY_APPROACH.md` - System integrity
- `TRACEABILITY_MATRIX.md` - Requirement traceability

### Project Documentation
- `README.md` - Project overview
- `DOCUMENTATION.md` - Technical documentation
- `CLEAN_PROJECT_STRUCTURE.md` - This file

## 🗂️ Archive Structure

All redundant files have been moved to `archive/`:

- `archive/deprecated-setup/` - Old setup scripts (superseded)
- `archive/old-seeds/` - Individual seed files (merged into enhanced setup)
- `archive/temp-fixes/` - Temporary fixes and diagnostics
- `archive/test-files/` - Test and analysis scripts
- `archive/backup-files/` - Backup and log files

## 🚀 Client Deployment Process

### For New Clients (Clean Setup)
```bash
./enhanced-rtm-deployment.sh
# Choose "Y" for clean deployment
```

### For Existing Clients (Updates)
```bash
./update-rtm-deployment.sh
```

### Manual Setup (if needed)
```bash
# Generate Prisma client
npx prisma generate

# Run enhanced setup
node enhanced-rtm-comprehensive-setup.js

# Seed additional components
node seed-drugs.js
node seed-medication-metrics.js
node seed-medication-templates.js
node seed-preset-links.js
node setup-enrollments.js
```

## ✅ Benefits of Clean Structure

1. **Simplified Deployment** - Single script for complete setup
2. **Reduced Complexity** - No redundant or conflicting files
3. **Clear Documentation** - Focused guides for implementation
4. **Easy Maintenance** - Streamlined codebase
5. **Client Ready** - Production-ready structure

## 🔄 File Relationships

- **Enhanced RTM Setup** replaces all individual seed files
- **Enhanced Deployment** handles complete system setup
- **Update Deployment** provides non-destructive updates
- **Archive** preserves old files for reference

This clean structure provides everything needed for RTM-compliant client deployments while maintaining simplicity and clarity.