# Enhanced RTM System - Installation Guide

## 📋 Overview

This guide provides complete step-by-step instructions for installing the Enhanced RTM (Remote Therapeutic Monitoring) system from scratch. The system provides comprehensive clinical metrics management with full RTM compliance and CPT code support (98975-98981).

## 🎯 What You'll Get

After installation, you'll have:
- **30+ RTM metric definitions** for comprehensive patient monitoring
- **12 standardized assessment templates** for clinical evaluations
- **11 enhanced alert rules** for automated patient monitoring
- **10+ condition presets** for common chronic conditions
- **500+ medication database** with tracking capabilities
- **Full RTM billing compliance** with CPT codes
- **Modern web interface** for clinicians and administrators

## 🔄 For Existing Clients - Upgrade Guide

If you already have a previous version of the system installed, follow this upgrade process to get the latest Enhanced RTM features while preserving your existing data.

### 🚨 Pre-Upgrade Checklist

**⚠️ CRITICAL: Always backup your data before upgrading!**

```bash
# 1. Stop all running services
pkill -f "node.*index.js"
pkill -f "npm.*dev"

# 2. Backup your database
pg_dump -h localhost -U pain_user pain_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Backup your .env file
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 4. Backup any custom configurations
tar -czf custom_configs_backup_$(date +%Y%m%d_%H%M%S).tar.gz src/config/ frontend/src/config/ 2>/dev/null || true
```

### 📊 Data Migration Options

Choose the appropriate migration path based on your needs:

#### Option A: Preserve All Existing Data (Recommended)
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install
cd frontend && npm install && cd ..

# Run incremental database migration
npx prisma migrate dev

# Generate updated Prisma client
npx prisma generate

# Run data enhancement script (preserves existing data)
node enhanced-rtm-comprehensive-setup.js --preserve-existing
```

#### Option B: Fresh Start with Enhanced RTM (Clean Install)
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install
cd frontend && npm install && cd ..

# Run full enhanced deployment (will reset database)
./enhanced-rtm-deployment.sh
# Choose 'y' when prompted for clean deployment
```

#### Option C: Selective Enhancement (Advanced Users)
```bash
# Pull latest code
git pull origin main

# Update dependencies
npm install
cd frontend && npm install && cd ..

# Sync schema without data loss
npx prisma db push

# Add only new RTM components
node enhanced-rtm-comprehensive-setup.js --add-missing-only
```

### 🔍 Pre-Migration Assessment

Before upgrading, assess your current system:

```bash
# Check current system status
node archive/test-files/check-system-status.js

# Verify existing data
node archive/test-files/check-metrics.js
node archive/test-files/check-assessment-templates.js
node archive/test-files/check-condition-presets.js

# Check for custom modifications
git status
git diff HEAD~1
```

### 📈 Migration Process (Detailed)

#### Step 1: Environment Preparation
```bash
# Ensure you're in the project directory
cd /path/to/your/pain-db

# Check current version
git log --oneline -5

# Backup current state
git stash push -m "Pre-upgrade backup $(date)"
```

#### Step 2: Code Update
```bash
# Fetch latest changes
git fetch origin

# Merge or rebase (choose one)
git merge origin/main  # Recommended for most users
# OR
git rebase origin/main  # For advanced users with clean history
```

#### Step 3: Dependency Updates
```bash
# Update backend dependencies
npm update

# Update frontend dependencies
cd frontend
npm update
cd ..

# Check for security vulnerabilities
npm audit fix
```

#### Step 4: Database Schema Migration
```bash
# Option A: Incremental migration (preserves data)
npx prisma migrate dev --name "upgrade_to_enhanced_rtm"

# Option B: Force sync (may require data migration)
npx prisma db push

# Regenerate client
npx prisma generate
```

#### Step 5: Data Enhancement
```bash
# Run enhanced setup with preservation flags
node enhanced-rtm-comprehensive-setup.js --mode=upgrade

# Verify new components were added
node archive/test-files/check-system-status.js
```

### 🔧 Handling Common Migration Issues

#### Schema Conflicts
```bash
# If you encounter schema conflicts
npx prisma migrate reset
npx prisma db push --force-reset

# Then restore your data from backup
psql -h localhost -U pain_user pain_db < your_backup.sql

# Re-run enhancement
node enhanced-rtm-comprehensive-setup.js
```

#### Dependency Conflicts
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

npm install
cd frontend && npm install && cd ..
```

#### Custom Code Conflicts
```bash
# If you have custom modifications
git stash pop  # Restore your changes
git mergetool  # Resolve conflicts manually

# Or create a new branch for your customizations
git checkout -b custom-modifications
git stash pop
```

### 📋 Post-Migration Verification

After upgrading, verify everything works correctly:

```bash
# 1. Check system status
node archive/test-files/check-system-status.js

# 2. Verify all components
npm test

# 3. Test API endpoints
curl http://localhost:3000/api/v1/metric-definitions | jq '.length'
curl http://localhost:3000/api/v1/assessment-templates | jq '.length'

# 4. Check frontend
npm run dev:ui
# Visit http://localhost:5173 and verify interface
```

### 🎯 What's New in Enhanced RTM

After upgrading, you'll have access to:

#### New Metrics (if not previously installed)
- **Advanced Pain Scales**: PROMIS, FLACC, CPOT
- **Functional Assessments**: HAQ-DI, WOMAC, Lequesne
- **Medication Tracking**: Enhanced adherence monitoring
- **Activity Metrics**: Sleep quality, exercise tolerance

#### Enhanced Assessment Templates
- **Standardized Forms**: FDA-compliant templates
- **Condition-Specific**: Tailored for different pain types
- **Outcome Measures**: PRO-CTCAE, ESAS-r
- **Quality Metrics**: Patient satisfaction, care coordination

#### Improved Alert System
- **Predictive Alerts**: Early warning indicators
- **Escalation Protocols**: Automated care team notifications
- **Custom Thresholds**: Personalized patient parameters
- **Integration Ready**: EHR and pharmacy connections

#### New Condition Presets
- **Expanded Coverage**: 15+ condition protocols
- **Evidence-Based**: Latest clinical guidelines
- **Customizable**: Adaptable to practice patterns
- **Outcome Tracking**: Built-in success metrics

### 🔄 Rollback Procedure

If you need to rollback the upgrade:

```bash
# 1. Stop current services
pkill -f "node.*index.js"

# 2. Restore previous code version
git reset --hard HEAD~1  # Go back one commit
# OR
git checkout <previous-commit-hash>

# 3. Restore database from backup
dropdb -h localhost -U pain_user pain_db
createdb -h localhost -U pain_user pain_db
psql -h localhost -U pain_user pain_db < your_backup.sql

# 4. Restore dependencies
npm install
cd frontend && npm install && cd ..

# 5. Start services
npm run start:all
```

### 📞 Migration Support

If you encounter issues during migration:

1. **Check Migration Logs**: Look in `backend.log` and `frontend.log`
2. **Database Issues**: Use `npx prisma studio` to inspect data
3. **API Problems**: Test endpoints with `npm test`
4. **Frontend Issues**: Check browser console for errors

### 🎉 Migration Complete!

After successful migration, you'll have:
- ✅ **All your existing data preserved**
- ✅ **New Enhanced RTM features**
- ✅ **Updated security and performance**
- ✅ **Latest clinical protocols**
- ✅ **Improved user interface**

## 📋 Prerequisites

Before starting, ensure you have:

### System Requirements
- **Operating System**: Linux, macOS, or Windows
- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 12 or higher
- **Git**: For cloning the repository
- **npm**: Comes with Node.js installation

### Hardware Requirements
- **RAM**: Minimum 4GB, recommended 8GB
- **Storage**: At least 2GB free space
- **Network**: Internet connection for package downloads

## 🚀 Installation Steps

### Step 1: System Preparation

#### Install Node.js (if not already installed)
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS (using Homebrew)
brew install node

# Windows
# Download from https://nodejs.org/
```

#### Install PostgreSQL (if not already installed)
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql
brew services start postgresql

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone <repository-url>
cd pain-db

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Database Setup

#### Create Database and User
```bash
# Access PostgreSQL as superuser
sudo -u postgres psql

# Or on macOS/Windows
psql -U postgres
```

```sql
-- Create database and user
CREATE DATABASE pain_db;
CREATE USER pain_user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE pain_db TO pain_user;
ALTER USER pain_user CREATEDB;
\q
```

#### Verify Database Connection
```bash
# Test connection
psql -h localhost -U pain_user -d pain_db -c "SELECT version();"
```

### Step 4: Environment Configuration

```bash
# Copy environment template
cp .env.local .env

# Edit environment variables (optional - defaults work for local development)
nano .env
```

**Default `.env` configuration:**
```env
# Database Connection
DATABASE_URL="postgresql://pain_user:password@localhost:5432/pain_db"

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_VERSION=v1
API_PREFIX=/api

# Security Settings
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**⚠️ Important**: Change the `JWT_SECRET` for production deployments!

### Step 5: Database Schema Initialization

```bash
# Initialize database schema
npx prisma db push

# Generate Prisma client
npx prisma generate
```

### Step 6: Enhanced RTM Deployment (Automated)

The system includes a comprehensive deployment script that sets up everything automatically:

```bash
# Make deployment script executable
chmod +x enhanced-rtm-deployment.sh

# Run the enhanced RTM deployment
./enhanced-rtm-deployment.sh
```

**When prompted, choose 'y' for clean deployment.**

#### What the Deployment Script Does:
1. **Database Reset**: Ensures clean schema synchronization
2. **Metric Definitions**: Creates 30+ RTM-compliant metrics
3. **Assessment Templates**: Sets up 12 standardized clinical templates
4. **Alert Rules**: Configures 11 intelligent monitoring rules
5. **Condition Presets**: Creates 10+ common condition protocols
6. **Drug Database**: Seeds 500+ medications with NDC codes
7. **Medication Metrics**: Sets up medication adherence tracking
8. **Sample Data**: Creates example enrollments and relationships

### Step 7: Start the Application

#### Option A: Start Both Services Together
```bash
# Start both backend and frontend servers
npm run start:all
```

#### Option B: Start Services Separately
```bash
# Terminal 1 - Backend API Server
npm run dev

# Terminal 2 - Frontend UI Server
npm run dev:ui
```

## 🌐 Access Points

After successful installation, you can access:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend UI** | http://localhost:5173 | Main clinical interface |
| **Backend API** | http://localhost:3000 | REST API endpoints |
| **API Documentation** | http://localhost:3000/api/v1 | API endpoint listing |
| **Database Admin** | `npx prisma studio` | Database management (http://localhost:5555) |

## 📊 Installation Verification

### Step 1: Check System Status
```bash
# Run comprehensive system check
node archive/test-files/check-system-status.js
```

### Step 2: Verify API Endpoints
```bash
# Test core API functionality
npm test

# Test specific endpoints
curl http://localhost:3000/api/v1/patients
curl http://localhost:3000/api/v1/clinicians
curl http://localhost:3000/api/v1/metric-definitions
```

### Step 3: Verify Database Content
```bash
# Open database browser
npx prisma studio
```

**Expected Data:**
- ✅ 30+ Metric Definitions
- ✅ 12 Assessment Templates
- ✅ 11 Alert Rules
- ✅ 10+ Condition Presets
- ✅ 500+ Drug Records

### Step 4: Frontend Verification
1. Open http://localhost:5173
2. Navigate through the interface
3. Verify all pages load correctly
4. Check that data displays properly

## 📚 What Gets Installed

### RTM Metrics (30+ metrics)
- **Pain Assessment**: VAS, NRS, Brief Pain Inventory
- **Functional Assessment**: ODI, RMDQ, DASH
- **Quality of Life**: SF-36, EQ-5D
- **Medication Tracking**: Adherence, side effects
- **Activity Monitoring**: Sleep, exercise, daily activities
- **Psychological**: Depression, anxiety screening

### Assessment Templates (12 templates)
- **Standardized Pain Assessments**
- **Functional Capacity Evaluations**
- **Medication Management Forms**
- **Patient-Reported Outcomes**
- **Quality of Life Measures**
- **Psychological Assessments**

### Alert Rules (11 rules)
- **Critical Pain Levels**: Immediate intervention triggers
- **Medication Adherence**: Non-compliance warnings
- **Functional Decline**: Significant deterioration alerts
- **Emergency Situations**: Severe symptom combinations
- **Appointment Reminders**: Automated scheduling alerts

### Condition Presets (10+ presets)
- **Chronic Pain Management**
- **Arthritis Protocols**
- **Fibromyalgia Management**
- **Post-Surgical Monitoring**
- **Neuropathic Pain**
- **Migraine Management**

## 🔧 Troubleshooting

### Database Connection Issues

**Problem**: Cannot connect to PostgreSQL
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL if stopped
sudo systemctl start postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**Problem**: Authentication failed
```bash
# Reset password for pain_user
sudo -u postgres psql
ALTER USER pain_user PASSWORD 'password';
\q
```

### Schema Synchronization Issues

**Problem**: Prisma schema out of sync
```bash
# Force schema reset and regeneration
npx prisma db push --force-reset
npx prisma generate
```

### Port Conflicts

**Problem**: Port 3000 or 5173 already in use
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5173

# Kill conflicting processes
kill -9 <PID>

# Or change ports in .env and package.json
```

### Node.js Version Issues

**Problem**: Incompatible Node.js version
```bash
# Check current version
node --version

# Install Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18
nvm install 18
nvm use 18
```

### Memory Issues

**Problem**: Out of memory during installation
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Or install with increased memory
NODE_OPTIONS="--max-old-space-size=4096" npm install
```

## 🚀 Next Steps

### 1. Initial Configuration
- [ ] Create your first clinician account
- [ ] Set up patient profiles
- [ ] Configure organization settings
- [ ] Customize alert thresholds

### 2. Data Entry
- [ ] Import existing patient data
- [ ] Set up enrollment relationships
- [ ] Configure condition-specific protocols
- [ ] Test alert notifications

### 3. Training and Usage
- [ ] Train staff on the interface
- [ ] Set up data collection workflows
- [ ] Configure reporting schedules
- [ ] Establish backup procedures

### 4. Production Preparation
- [ ] Change default passwords and secrets
- [ ] Set up SSL certificates
- [ ] Configure production database
- [ ] Set up monitoring and logging

## 📖 Additional Resources

### Documentation
- **API Documentation**: Explore `/api/v1` endpoints
- **RTM Compliance Guide**: `RTM_COMPLIANCE_GUIDE.md`
- **Assessment Templates**: `STANDARDIZED_ASSESSMENT_GUIDE.md`
- **Field Mapping**: `FIELD_MAPPING_REFERENCE.md`

### Database Management
- **Prisma Studio**: Visual database browser
- **Schema Reference**: `prisma/schema.prisma`
- **Migration History**: `prisma/migrations/`

### Testing and Validation
- **Test Suite**: `npm test` for comprehensive testing
- **Performance Tests**: `archive/test-files/` directory
- **API Testing**: Use tools like Postman or curl

## 🔒 Security Considerations

### Development Environment
- Default credentials are for development only
- Change all default passwords for production
- Use environment variables for sensitive data

### Production Deployment
- Use strong, unique passwords
- Enable SSL/HTTPS
- Configure firewall rules
- Set up regular backups
- Monitor access logs

## 🆘 Support

If you encounter issues:

1. **Check the logs**: `backend.log` and `frontend.log`
2. **Run diagnostics**: `node archive/test-files/check-system-status.js`
3. **Verify environment**: Check `.env` configuration
4. **Database status**: Use `npx prisma studio`
5. **API testing**: Test endpoints with curl or Postman

## 🎉 Success!

Congratulations! You now have a fully functional Enhanced RTM system with:

- ✅ **Complete RTM compliance** (CPT codes 98975-98981)
- ✅ **Comprehensive clinical metrics** tracking
- ✅ **Automated patient monitoring** with intelligent alerts
- ✅ **Standardized assessment** tools
- ✅ **Modern web interface** for clinical workflows
- ✅ **Scalable architecture** ready for production

Your Enhanced RTM system is ready to support remote therapeutic monitoring for chronic pain management and other clinical conditions!