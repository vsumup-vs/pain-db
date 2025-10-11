# Platform Administration & Client Onboarding Guide

> Multi-Tenant Healthcare Platform
> Last Updated: 2025-10-11
> Version: 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [Platform Administration](#platform-administration)
3. [Client Onboarding Workflow](#client-onboarding-workflow)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Organization Management](#organization-management)
6. [User Management](#user-management)
7. [Implementation Examples](#implementation-examples)

---

## Overview

This platform uses a **multi-tenant architecture** where:
- Each **Organization** (hospital, clinic, practice) operates as an isolated tenant
- **Users** can belong to multiple organizations with different roles
- **Data isolation** ensures HIPAA compliance - users can only access their organization's data
- **Platform Administrators** manage the overall system and onboard new clients
- **Organization Administrators** manage their own organization's settings and users

---

## Platform Administration

### Platform Admin Role Hierarchy

The platform has two primary administrative roles:

#### 1. SUPER_ADMIN (Platform Administrator)
**Purpose:** Manages the entire multi-tenant platform

**Permissions:**
```javascript
[
  'SYSTEM_ADMIN',      // Full system access
  'AUDIT_READ',        // Access all audit logs
  'ORG_CREATE',        // Create new organizations
  'ORG_READ',          // View all organizations
  'ORG_UPDATE',        // Modify organization settings
  'ORG_DELETE',        // Remove organizations
  'USER_CREATE',       // Create users across organizations
  'USER_ROLE_ASSIGN'   // Assign users to organizations
]
```

**Access Level:** Can access and manage ALL organizations in the system

**Use Cases:**
- Onboarding new healthcare organizations
- Managing cross-organization issues
- System-wide configuration
- Security audits
- Platform monitoring

#### 2. ORG_ADMIN (Organization Administrator)
**Purpose:** Manages a single organization's operations

**Permissions:**
```javascript
[
  'ORG_SETTINGS_MANAGE',  // Manage organization settings
  'ORG_USERS_MANAGE',     // Manage users within organization
  'ORG_BILLING_MANAGE',   // Manage billing for organization
  'PROGRAM_READ',         // View care programs
  'PROGRAM_CREATE',       // Create care programs
  'PATIENT_READ',         // View all patients in organization
  'CLINICIAN_READ'        // View all clinicians in organization
]
```

**Access Level:** Limited to their own organization's data only

**Use Cases:**
- Managing organization users
- Configuring organization settings
- Creating care programs
- Assigning clinicians to patients
- Managing organization billing

---

## Client Onboarding Workflow

### Complete Onboarding Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT ONBOARDING WORKFLOW                    │
└─────────────────────────────────────────────────────────────────┘

Step 1: Sales & Contract
   │
   ├─> Client signs contract
   ├─> Determine organization type (HOSPITAL, CLINIC, PRACTICE)
   ├─> Determine care programs needed (RTM, RPM, CCM, etc.)
   └─> Collect organization details

Step 2: Platform Admin Creates Organization (SUPER_ADMIN)
   │
   ├─> POST /api/organizations
   │   {
   │     "name": "St. Mary's Hospital",
   │     "type": "HOSPITAL",
   │     "email": "admin@stmarys.com",
   │     "phone": "(555) 123-4567",
   │     "address": "123 Healthcare Ave, Medical City, ST 12345",
   │     "settings": {
   │       "timezone": "America/Los_Angeles",
   │       "businessHours": "8:00-17:00"
   │     }
   │   }
   └─> Organization created with unique ID

Step 3: Platform Admin Creates Initial ORG_ADMIN User
   │
   ├─> POST /auth/register
   │   {
   │     "email": "admin@stmarys.com",
   │     "password": "TempPassword123!",
   │     "firstName": "Jane",
   │     "lastName": "Smith",
   │     "organizationId": "org_abc123",
   │     "role": "ORG_ADMIN"
   │   }
   └─> Admin user created and assigned to organization

Step 4: Platform Admin Configures Care Programs
   │
   ├─> POST /api/care-programs
   │   {
   │     "organizationId": "org_abc123",
   │     "name": "Remote Therapeutic Monitoring",
   │     "type": "PAIN_MANAGEMENT",
   │     "isActive": true,
   │     "settings": { ... }
   │   }
   └─> Care programs configured for organization

Step 5: Organization Admin Receives Welcome Email
   │
   ├─> Email contains:
   │   - Temporary password
   │   - Login link
   │   - Getting started guide
   │   - Support contact
   └─> Admin prompted to change password on first login

Step 6: Organization Admin Onboards Staff
   │
   ├─> Invites clinicians, nurses, billing staff
   ├─> Assigns roles and permissions
   ├─> Configures user access to care programs
   └─> Sets up workflows

Step 7: Organization Goes Live
   │
   ├─> Begin enrolling patients
   ├─> Start collecting observations
   ├─> Generate reports
   └─> Platform admin monitors for issues
```

---

## User Roles & Permissions

### Available Roles

| Role | Access Level | Primary Use Case |
|------|--------------|------------------|
| **SUPER_ADMIN** | Platform-wide | Platform administration, system management |
| **ORG_ADMIN** | Organization | Managing organization users and settings |
| **CLINICIAN** | Organization | Patient care, observations, assessments |
| **NURSE** | Organization | Patient monitoring, observations |
| **BILLING_ADMIN** | Organization | Billing, compliance, reporting |
| **PATIENT** | Organization | Self-service access (future) |
| **CAREGIVER** | Organization | Family member access (future) |
| **RESEARCHER** | Organization | De-identified data access (future) |

### Role Permission Matrix

```javascript
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    systemAdmin: true,
    organizations: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    users: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ASSIGN_ROLE'],
    programs: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
    audit: ['READ'],
    billing: ['READ', 'MANAGE']
  },

  ORG_ADMIN: {
    systemAdmin: false,
    organizations: ['READ', 'UPDATE'], // Own org only
    users: ['CREATE', 'READ', 'UPDATE', 'INVITE', 'ASSIGN_ROLE'], // Own org only
    programs: ['CREATE', 'READ', 'UPDATE', 'ASSIGN'],
    patients: ['READ'],
    clinicians: ['READ', 'ASSIGN'],
    billing: ['READ', 'MANAGE']
  },

  CLINICIAN: {
    systemAdmin: false,
    patients: ['READ', 'UPDATE', 'ASSIGN'],
    observations: ['CREATE', 'READ', 'UPDATE'],
    assessments: ['CREATE', 'READ', 'UPDATE'],
    alerts: ['READ', 'ACKNOWLEDGE'],
    medications: ['CREATE', 'READ', 'UPDATE', 'PRESCRIBE']
  },

  NURSE: {
    systemAdmin: false,
    patients: ['READ'],
    observations: ['CREATE', 'READ'],
    assessments: ['READ'],
    alerts: ['READ']
  },

  BILLING_ADMIN: {
    systemAdmin: false,
    patients: ['READ'],
    billing: ['READ', 'MANAGE'],
    reports: ['READ', 'CREATE'],
    compliance: ['READ']
  }
};
```

---

## Organization Management

### Creating a New Organization

**Endpoint:** `POST /api/organizations`

**Required Permission:** `ORG_CREATE` (SUPER_ADMIN only)

**Request Body:**
```json
{
  "name": "Riverside Medical Clinic",
  "type": "CLINIC",
  "email": "contact@riverside.clinic",
  "phone": "(555) 789-0123",
  "address": "456 River Road, Healthcare City, ST 67890",
  "website": "https://riverside.clinic",
  "settings": {
    "timezone": "America/New_York",
    "businessHours": "9:00-18:00",
    "appointmentDuration": 30,
    "enableSMSNotifications": true,
    "enableEmailNotifications": true,
    "hipaaCompliance": {
      "baaSigned": true,
      "securityOfficer": "Jane Smith",
      "privacyOfficer": "John Doe"
    }
  },
  "isActive": true
}
```

**Response:**
```json
{
  "id": "org_xyz789",
  "name": "Riverside Medical Clinic",
  "type": "CLINIC",
  "email": "contact@riverside.clinic",
  "isActive": true,
  "createdAt": "2025-10-11T10:00:00.000Z",
  "updatedAt": "2025-10-11T10:00:00.000Z"
}
```

### Database Schema for Organizations

```prisma
model Organization {
  id                String              @id @default(cuid())
  name              String              @unique
  type              OrganizationType    // HOSPITAL, CLINIC, PRACTICE, etc.
  email             String?             @unique
  phone             String?
  address           String?
  website           String?
  isActive          Boolean             @default(true)
  settings          Json?               // Flexible settings storage
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  // Relationships
  userOrganizations UserOrganization[]
  carePrograms      CareProgram[]
  patients          Patient[]
  clinicians        Clinician[]
  enrollments       Enrollment[]
}

model UserOrganization {
  id             String       @id @default(cuid())
  userId         String
  organizationId String
  role           UserRole     // SUPER_ADMIN, ORG_ADMIN, CLINICIAN, etc.
  permissions    Permission[] // Granular permissions array
  isActive       Boolean      @default(true)
  joinedAt       DateTime     @default(now())

  // Relationships
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
}
```

---

## User Management

### Creating Organization Admin User

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "admin@newclinic.com",
  "password": "SecurePassword123!",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "organizationId": "org_xyz789",
  "role": "ORG_ADMIN"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user_abc123",
    "email": "admin@newclinic.com",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "role": "ORG_ADMIN",
    "organization": {
      "id": "org_xyz789",
      "name": "Riverside Medical Clinic"
    }
  },
  "requiresEmailVerification": true
}
```

### Assigning Additional Users to Organization

**Endpoint:** `POST /auth/users/:userId/assign-role`

**Required Permission:** `USER_ROLE_ASSIGN` (ORG_ADMIN or SUPER_ADMIN)

**Request Body:**
```json
{
  "organizationId": "org_xyz789",
  "role": "CLINICIAN"
}
```

**Use Cases:**
1. **ORG_ADMIN assigns staff to their own organization**
2. **SUPER_ADMIN assigns users to any organization**
3. **User can be assigned to multiple organizations with different roles**

---

## Implementation Examples

### Example 1: Platform Admin Onboarding New Hospital

```javascript
// Step 1: SUPER_ADMIN creates organization
const createOrganization = async () => {
  const response = await fetch('http://localhost:3000/api/organizations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Memorial Hospital',
      type: 'HOSPITAL',
      email: 'admin@memorial.hospital',
      phone: '(555) 321-9876',
      address: '789 Medical Plaza, Healthcare City, ST 11111',
      settings: {
        timezone: 'America/Chicago',
        businessHours: '7:00-19:00'
      }
    })
  });

  const org = await response.json();
  console.log('Organization created:', org.id);
  return org.id;
};

// Step 2: SUPER_ADMIN creates initial ORG_ADMIN user
const createOrgAdmin = async (organizationId) => {
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${superAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@memorial.hospital',
      password: 'TempPassword123!',
      firstName: 'Michael',
      lastName: 'Chen',
      organizationId: organizationId,
      role: 'ORG_ADMIN'
    })
  });

  const result = await response.json();
  console.log('ORG_ADMIN created:', result.user.id);
  return result;
};

// Step 3: ORG_ADMIN logs in and creates care programs
const setupCarePrograms = async (orgAdminToken, organizationId) => {
  const response = await fetch('http://localhost:3000/api/care-programs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${orgAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      organizationId: organizationId,
      name: 'Pain Management RTM',
      type: 'PAIN_MANAGEMENT',
      description: 'Remote therapeutic monitoring for chronic pain patients',
      isActive: true
    })
  });

  const program = await response.json();
  console.log('Care program created:', program.id);
};
```

### Example 2: ORG_ADMIN Inviting Clinician

```javascript
const inviteClinician = async (orgAdminToken) => {
  // Step 1: Create user account
  const userResponse = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${orgAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'dr.smith@memorial.hospital',
      password: 'TempClinician123!',
      firstName: 'Emily',
      lastName: 'Smith',
      role: 'CLINICIAN'
    })
  });

  const user = await userResponse.json();

  // Step 2: Assign to organization with clinician role
  const assignResponse = await fetch(
    `http://localhost:3000/auth/users/${user.user.id}/assign-role`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${orgAdminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organizationId: 'org_abc123',
        role: 'CLINICIAN'
      })
    }
  );

  const assignment = await assignResponse.json();
  console.log('Clinician invited:', assignment);

  // Step 3: Send welcome email (implement separately)
  await sendWelcomeEmail(user.user.email, {
    organizationName: 'Memorial Hospital',
    temporaryPassword: 'TempClinician123!',
    loginUrl: 'https://app.yourplatform.com/login'
  });
};
```

### Example 3: User Login with Multiple Organizations

```javascript
const loginWithOrgSelection = async () => {
  // Step 1: Initial login
  const loginResponse = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dr.consultant@healthcare.com',
      password: 'SecurePassword123!'
    })
  });

  const loginData = await loginResponse.json();

  // Step 2: Check if organization selection is needed
  if (loginData.requiresOrganizationSelection) {
    console.log('Available organizations:');
    loginData.availableOrganizations.forEach(org => {
      console.log(`- ${org.name} (${org.type}) as ${org.role}`);
    });

    // Step 3: Select organization
    const selectedOrgId = loginData.availableOrganizations[0].id;

    const selectResponse = await fetch(
      'http://localhost:3000/auth/select-organization',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${loginData.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: selectedOrgId
        })
      }
    );

    const finalAuth = await selectResponse.json();
    console.log('Logged into organization:', finalAuth.organization.name);
    return finalAuth.token;
  }

  // Single organization - use token directly
  return loginData.token;
};
```

---

## Security Considerations

### Multi-Tenant Data Isolation

**How it works:**
1. Every JWT token includes `currentOrganization` claim
2. Middleware validates organization access on every request
3. All database queries automatically filter by `organizationId`
4. Cross-organization access attempts are logged and blocked

**Example JWT Payload:**
```json
{
  "userId": "user_abc123",
  "email": "dr.smith@hospital.com",
  "currentOrganization": "org_xyz789",
  "role": "CLINICIAN",
  "permissions": [
    "PATIENT_READ",
    "PATIENT_UPDATE",
    "OBSERVATION_CREATE",
    "OBSERVATION_READ"
  ],
  "organizations": [
    {
      "organizationId": "org_xyz789",
      "role": "CLINICIAN"
    }
  ],
  "iat": 1697040000,
  "exp": 1697126400
}
```

### Audit Logging

All administrative actions are logged:

```javascript
// Example audit log entries
{
  action: 'ORG_CREATED',
  userId: 'super_admin_id',
  metadata: {
    organizationId: 'org_xyz789',
    organizationName: 'Memorial Hospital'
  },
  hipaaRelevant: true
}

{
  action: 'USER_ASSIGNED_TO_ORG',
  userId: 'org_admin_id',
  organizationId: 'org_xyz789',
  metadata: {
    targetUserId: 'user_abc123',
    role: 'CLINICIAN'
  },
  hipaaRelevant: true
}

{
  action: 'CROSS_ORG_ACCESS_ATTEMPT',
  userId: 'user_malicious',
  organizationId: 'org_xyz789',
  metadata: {
    attemptedResource: '/api/patients/patient_from_other_org',
    deniedReason: 'organizationId mismatch'
  },
  hipaaRelevant: true
}
```

---

## Troubleshooting Common Issues

### Issue 1: User Can't Access Organization Data

**Symptoms:**
- 403 Forbidden errors
- "Organization context required" errors

**Resolution:**
```sql
-- Check user's organization assignments
SELECT
  u.email,
  uo.role,
  uo.permissions,
  o.name as organization_name,
  uo.isActive
FROM users u
JOIN user_organizations uo ON u.id = uo.userId
JOIN organizations o ON uo.organizationId = o.id
WHERE u.email = 'user@example.com';

-- Verify user is active in organization
UPDATE user_organizations
SET isActive = true
WHERE userId = 'user_id_here' AND organizationId = 'org_id_here';
```

### Issue 2: Organization Admin Can't Create Users

**Symptoms:**
- Permission denied when trying to invite users

**Resolution:**
```javascript
// Verify ORG_ADMIN has correct permissions
const verifyOrgAdminPermissions = async (userId, organizationId) => {
  const userOrg = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId
      }
    }
  });

  const requiredPermissions = [
    'USER_CREATE',
    'USER_INVITE',
    'USER_ROLE_ASSIGN'
  ];

  const missingPermissions = requiredPermissions.filter(
    perm => !userOrg.permissions.includes(perm)
  );

  if (missingPermissions.length > 0) {
    // Update permissions
    await prisma.userOrganization.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId
        }
      },
      data: {
        permissions: [
          ...userOrg.permissions,
          ...missingPermissions
        ]
      }
    });
  }
};
```

### Issue 3: User Belongs to Multiple Organizations

**Symptoms:**
- "Organization selection required" on login

**Expected Behavior:**
This is normal! Users who work at multiple healthcare facilities should:
1. Login with credentials
2. Receive list of available organizations
3. Select which organization to work with
4. Receive new token with selected organization context

**Frontend Implementation:**
```javascript
// Show organization selector
const OrganizationSelector = ({ organizations, onSelect }) => {
  return (
    <div>
      <h2>Select Organization</h2>
      {organizations.map(org => (
        <button key={org.id} onClick={() => onSelect(org.id)}>
          {org.name} - {org.type}
          <br />
          <small>Your role: {org.role}</small>
        </button>
      ))}
    </div>
  );
};
```

---

## Quick Reference Commands

### As SUPER_ADMIN:

```bash
# List all organizations
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN"

# Create new organization
curl -X POST http://localhost:3000/api/organizations \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Hospital",
    "type": "HOSPITAL",
    "email": "admin@newhospital.com"
  }'

# Create ORG_ADMIN user
curl -X POST http://localhost:3000/auth/register \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@newhospital.com",
    "password": "TempPassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "organizationId": "org_id_here",
    "role": "ORG_ADMIN"
  }'
```

### As ORG_ADMIN:

```bash
# List users in my organization
curl -X GET "http://localhost:3000/auth/users?organizationId=$ORG_ID" \
  -H "Authorization: Bearer $ORG_ADMIN_TOKEN"

# Invite clinician to organization
curl -X POST http://localhost:3000/auth/register \
  -H "Authorization: Bearer $ORG_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.new@hospital.com",
    "password": "TempPassword123!",
    "firstName": "New",
    "lastName": "Doctor",
    "role": "CLINICIAN"
  }'

# Assign user to organization
curl -X POST http://localhost:3000/auth/users/$USER_ID/assign-role \
  -H "Authorization: Bearer $ORG_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "$ORG_ID",
    "role": "CLINICIAN"
  }'
```

---

## Next Steps

After onboarding is complete:

1. **Configure Care Programs** - Set up RTM, RPM, CCM programs
2. **Import Patient Data** - Bulk import or manual entry
3. **Create Assessment Templates** - Configure standard assessments
4. **Set Up Alert Rules** - Define clinical alert thresholds
5. **Train Staff** - Provide training on the platform
6. **Go Live** - Begin patient enrollments

**Documentation:**
- User training guides
- Care program configuration
- Assessment template creation
- Alert rule configuration
- Reporting and analytics

---

## Support & Contact

For platform administration support:
- **Technical Issues:** support@yourplatform.com
- **Security Concerns:** security@yourplatform.com
- **HIPAA Compliance:** compliance@yourplatform.com

This completes the Platform Administration & Client Onboarding Guide.
