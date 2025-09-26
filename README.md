# ClinMetrics Pro - Clinical Metrics Management Platform

A comprehensive REST API for clinical metrics and healthcare management applications, built with Node.js, Express, and Prisma ORM.

## 🏥 Overview

ClinMetrics Pro provides a complete backend solution for healthcare clinics, enabling:
- Patient enrollment and management
- Clinician profiles and specializations
- Clinical observation tracking and analytics
- Alert system for critical conditions
- Comprehensive reporting and statistics

## 🚀 Features

### Core Functionality
- ✅ **Patient Management** - Complete CRUD operations
- ✅ **Clinician Profiles** - Specializations and credentials
- ✅ **Observation Tracking** - Clinical metrics, symptoms, medications
- ✅ **Alert System** - Automated notifications for critical conditions
- ✅ **Enrollment Management** - Patient-clinician assignments
- ✅ **Analytics & Reporting** - Comprehensive statistics

### Technical Features
- ✅ **RESTful API** - Clean, consistent endpoints
- ✅ **Database ORM** - Prisma with PostgreSQL
- ✅ **Security** - Helmet, CORS, rate limiting, input sanitization
- ✅ **Validation** - Express-validator with custom rules
- ✅ **Testing** - Comprehensive test suite with Jest
- ✅ **Production Ready** - Docker, NGINX, SSL configuration

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 5
- **Database**: PostgreSQL with Prisma ORM
- **Testing**: Jest with Supertest
- **Security**: Helmet, CORS, XSS protection
- **Validation**: Express-validator
- **Deployment**: Docker, NGINX, Systemd

## 📋 API Endpoints

### Patients
- `GET /api/v1/patients` - List all patients
- `POST /api/v1/patients` - Create new patient
- `GET /api/v1/patients/:id` - Get patient details
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient
- `GET /api/v1/patients/stats` - Patient statistics

### Clinicians
- `GET /api/v1/clinicians` - List all clinicians
- `POST /api/v1/clinicians` - Create new clinician
- `GET /api/v1/clinicians/:id` - Get clinician details
- `PUT /api/v1/clinicians/:id` - Update clinician
- `DELETE /api/v1/clinicians/:id` - Delete clinician
- `GET /api/v1/clinicians/specializations` - List specializations

### Observations
- `GET /api/v1/observations` - List observations
- `POST /api/v1/observations` - Create new observation
- `GET /api/v1/observations/:id` - Get observation details
- `PUT /api/v1/observations/:id` - Update observation
- `DELETE /api/v1/observations/:id` - Delete observation

### Enrollments
- `GET /api/v1/enrollments` - List enrollments
- `POST /api/v1/enrollments` - Create enrollment
- `GET /api/v1/enrollments/:id` - Get enrollment details
- `PUT /api/v1/enrollments/:id` - Update enrollment
- `DELETE /api/v1/enrollments/:id` - Delete enrollment

### Alerts
- `GET /api/v1/alerts` - List alerts
- `POST /api/v1/alerts` - Create alert
- `GET /api/v1/alerts/:id` - Get alert details
- `PUT /api/v1/alerts/:id` - Update alert
- `DELETE /api/v1/alerts/:id` - Delete alert

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pain-db.git
   cd pain-db
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Set up database**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🚀 Production Deployment

### Hetzner Cloud Deployment

The project includes complete production deployment configuration for Hetzner Cloud:

```bash
# Copy deployment files to server
scp -r deployment/ root@your-server-ip:/tmp/

# SSH to server and deploy
ssh root@your-server-ip
cd /tmp/deployment
chmod +x deploy.sh
./deploy.sh
```

### Features Included:
- ✅ **SSL/HTTPS** with Let's Encrypt
- ✅ **NGINX** reverse proxy with security headers
- ✅ **Systemd** service for auto-restart
- ✅ **Database** setup and migrations
- ✅ **Log rotation** and monitoring
- ✅ **Firewall** configuration

## 📊 Database Schema

### Core Entities
- **Patients** - Demographics, contact info, medical history
- **Clinicians** - Credentials, specializations, contact info
- **Observations** - Pain levels, symptoms, medications, notes
- **Enrollments** - Patient-clinician relationships
- **Alerts** - Automated notifications and rules
- **Metric Definitions** - Configurable measurement types

## 🔒 Security Features

- **Input Validation** - All endpoints validate input data
- **SQL Injection Protection** - Prisma ORM prevents SQL injection
- **XSS Protection** - Input sanitization and output encoding
- **Rate Limiting** - Prevents abuse and DoS attacks
- **CORS Configuration** - Controlled cross-origin requests
- **Security Headers** - Helmet.js security headers
- **Environment Variables** - Sensitive data in environment files

## 📝 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/pain_db"

# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1
API_PREFIX=/api

# Security
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact: your-email@example.com

## 🏥 Healthcare Compliance

This API is designed with healthcare data privacy in mind:
- HIPAA compliance considerations
- Secure data handling
- Audit logging capabilities
- Data encryption support

---

**Built with ❤️ for better pain management healthcare**