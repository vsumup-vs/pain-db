# Security Monitoring & Alerting Setup

## 📊 Audit Logging System

### Current Implementation

The application now logs all security-relevant events through the `auditService`:

**Events Being Logged:**
- ✅ Access denials (cross-organization access attempts)
- ✅ Permission denials
- ✅ Role access denials
- ✅ Program access denials
- ✅ Organization access denials

**Audit Log Schema:**
```javascript
{
  userId: String,
  organizationId: String,
  action: String,
  resource: String,
  resourceId: String,
  ipAddress: String,
  userAgent: String,
  oldValues: JSON,
  newValues: JSON,
  metadata: JSON,
  hipaaRelevant: Boolean,
  createdAt: DateTime
}
```

### Key Audit Actions

**Security Events:**
- `CROSS_ORG_ACCESS_ATTEMPT` - User tried to access data from another organization
- `ACCESS_DENIED` - Permission check failed
- `ROLE_ACCESS_DENIED` - Role check failed
- `PROGRAM_ACCESS_DENIED` - Program access check failed
- `ORGANIZATION_ACCESS_DENIED` - Organization membership check failed

**All HIPAA-relevant events are flagged** with `hipaaRelevant: true` for compliance reporting.

---

## 🔍 Monitoring Queries

### 1. Cross-Organization Access Attempts

```sql
-- Find all cross-org access attempts in the last 24 hours
SELECT
  al.*,
  u.email as user_email,
  u.firstName,
  u.lastName
FROM audit_logs al
LEFT JOIN users u ON al.userId = u.id
WHERE
  al.action = 'CROSS_ORG_ACCESS_ATTEMPT'
  AND al.createdAt >= NOW() - INTERVAL '24 hours'
ORDER BY al.createdAt DESC;
```

### 2. Failed Permission Checks by User

```sql
-- Identify users with multiple failed permission checks
SELECT
  userId,
  COUNT(*) as failed_attempts,
  MAX(createdAt) as last_attempt
FROM audit_logs
WHERE
  action IN ('ACCESS_DENIED', 'PERMISSION_DENIED', 'ROLE_ACCESS_DENIED')
  AND createdAt >= NOW() - INTERVAL '24 hours'
GROUP BY userId
HAVING COUNT(*) > 5
ORDER BY failed_attempts DESC;
```

### 3. HIPAA-Relevant Events

```sql
-- All HIPAA-relevant security events
SELECT
  action,
  COUNT(*) as count,
  MAX(createdAt) as last_occurrence
FROM audit_logs
WHERE
  hipaaRelevant = true
  AND createdAt >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;
```

### 4. Organization Switching Patterns

```sql
-- Detect unusual organization switching
SELECT
  userId,
  metadata->>'organizationId' as target_org,
  COUNT(*) as switch_count
FROM audit_logs
WHERE
  action = 'ORGANIZATION_SWITCH'
  AND createdAt >= NOW() - INTERVAL '1 hour'
GROUP BY userId, metadata->>'organizationId'
HAVING COUNT(*) > 10;
```

---

## 🚨 Alerting Rules

### Critical Alerts (Immediate Response)

#### 1. Repeated Cross-Org Access Attempts
**Trigger:** Same user attempts cross-org access >3 times in 5 minutes
**Action:**
- Lock user account
- Notify security team
- Log incident for HIPAA audit

**Implementation:**
```javascript
// In auditOrganizationAccess middleware
const recentAttempts = await prisma.auditLog.count({
  where: {
    userId: req.user.userId,
    action: 'CROSS_ORG_ACCESS_ATTEMPT',
    createdAt: {
      gte: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes
    }
  }
});

if (recentAttempts >= 3) {
  // Lock account
  await prisma.user.update({
    where: { id: req.user.userId },
    data: { isActive: false }
  });

  // Send alert
  await sendSecurityAlert({
    type: 'ACCOUNT_LOCKED',
    userId: req.user.userId,
    reason: 'Multiple cross-organization access attempts'
  });
}
```

#### 2. Unauthorized Admin Actions
**Trigger:** Non-admin user attempts admin-only operations
**Action:**
- Log incident
- Alert security team
- Flag user for review

#### 3. After-Hours Data Access
**Trigger:** Data access outside business hours (configurable per org)
**Action:**
- Log with high priority
- Notify organization admin
- Require additional verification

### High Priority Alerts

#### 4. Bulk Data Export
**Trigger:** User downloads >100 patient records in 1 hour
**Action:**
- Log incident
- Notify compliance team
- Review for data breach

#### 5. Failed Login Patterns
**Trigger:** >5 failed logins from same IP in 10 minutes
**Action:**
- Temporarily block IP
- Log for security review
- Notify user via email

### Medium Priority Alerts

#### 6. Permission Escalation Attempts
**Trigger:** User repeatedly tries actions above their permission level
**Action:**
- Log pattern
- Review user permissions
- Notify manager

---

## 📈 Monitoring Dashboard Metrics

### Key Performance Indicators (KPIs)

**Security Metrics:**
1. **Cross-Org Access Attempts per Day** - Should be 0 in normal operations
2. **Failed Permission Checks** - Monitor for spikes
3. **Active Users per Organization** - Detect unusual patterns
4. **Average API Response Time** - Monitor for DDoS attempts
5. **Audit Log Volume** - Ensure logging is working

**Compliance Metrics:**
1. **HIPAA-Relevant Events** - Track all PHI access
2. **Data Access by Role** - Ensure least privilege
3. **Organization Isolation Rate** - Should be 100%
4. **Audit Log Retention** - Ensure 6-year retention (HIPAA)

### Recommended Tools

**Log Aggregation:**
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk** (Enterprise)
- **Datadog** (Cloud-native)

**Alerting:**
- **PagerDuty** - On-call alerts
- **Slack/Teams** - Team notifications
- **Email** - Daily digest reports

**Visualization:**
- **Grafana** - Real-time dashboards
- **Kibana** - Log analytics
- **Tableau** - Compliance reporting

---

## 🛠️ Implementation Checklist

### Phase 1: Basic Monitoring (Week 1)
- ✅ Audit logging implemented
- ✅ Cross-org access tracking
- ✅ HIPAA event flagging
- ⏳ Daily log review process
- ⏳ Manual alert monitoring

### Phase 2: Automated Alerting (Week 2-3)
- ⏳ Set up log aggregation (ELK/Splunk)
- ⏳ Configure critical alerts
- ⏳ Integrate with PagerDuty
- ⏳ Create Slack webhooks
- ⏳ Build monitoring dashboard

### Phase 3: Advanced Analytics (Week 4+)
- ⏳ Machine learning anomaly detection
- ⏳ Behavioral analysis patterns
- ⏳ Predictive security alerts
- ⏳ Automated incident response
- ⏳ Integration with SIEM tools

---

## 📋 Daily Security Review Process

### Morning Check (9:00 AM)
```bash
# Run daily security report
npm run security:daily-report

# Check for overnight incidents
npm run security:check-incidents --since "last 24 hours"

# Review cross-org attempts
npm run security:cross-org-report
```

### Weekly Review (Friday 3:00 PM)
```bash
# Generate weekly compliance report
npm run security:weekly-report

# Review all HIPAA events
npm run security:hipaa-audit

# Export for compliance archive
npm run security:export-audit --week $(date +%V)
```

### Monthly Security Audit
1. Review all high-priority incidents
2. Analyze permission escalation patterns
3. Update security policies
4. Train staff on new threats
5. Generate HIPAA compliance report

---

## 🔐 Incident Response Playbook

### Level 1: Cross-Org Access Attempt

**Detection:** Audit log shows `CROSS_ORG_ACCESS_ATTEMPT`

**Immediate Actions:**
1. Lock user account if >3 attempts
2. Review user's recent activity
3. Check if data was accessed (should be 404)
4. Document incident

**Follow-up:**
1. Interview user (accidental vs. malicious)
2. Update user training if needed
3. File incident report
4. Update security controls if pattern found

### Level 2: Suspicious Data Export

**Detection:** Bulk data download detected

**Immediate Actions:**
1. Pause user's data access
2. Review downloaded records
3. Check for PHI exposure
4. Notify compliance team

**Follow-up:**
1. Investigate legitimate business need
2. File breach report if required (HIPAA)
3. Implement additional export controls
4. Update user permissions

### Level 3: Security Breach

**Detection:** Confirmed unauthorized access to PHI

**Immediate Actions:**
1. Lock all affected accounts
2. Isolate affected systems
3. Notify CISO/Legal/Compliance
4. Preserve all logs and evidence
5. Begin forensic analysis

**Follow-up:**
1. File HIPAA breach notification (if >500 records)
2. Notify affected individuals
3. Update security measures
4. Conduct post-incident review
5. Implement preventive controls

---

## 📊 Sample Monitoring Dashboard

### Security Overview Panel
```
┌─────────────────────────────────────────────────────┐
│ SECURITY MONITORING DASHBOARD                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Cross-Org Access Attempts (24h): 0        ✅         │
│ Failed Permissions (24h): 12              ⚠️          │
│ HIPAA Events (7d): 156                    📋         │
│ Active Alerts: 0                          ✅         │
│                                                      │
│ Top Security Events:                                 │
│  1. PERMISSION_DENIED: 8 events                      │
│  2. AUTH_TOKEN_INVALID: 4 events                     │
│  3. ORG_CONTEXT_MISSING: 0 events         ✅         │
│                                                      │
│ Organization Health:                                 │
│  └─ Hospital A: ✅ All checks passed                 │
│  └─ Hospital B: ✅ All checks passed                 │
│  └─ Clinic C: ⚠️  2 permission issues                │
│                                                      │
│ Last Security Scan: 2 minutes ago         ✅         │
│ Next Scheduled Audit: Friday 3:00 PM                 │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

```bash
# View recent audit logs
npm run audit:view --hours 24

# Check for security incidents
npm run security:check

# Generate compliance report
npm run security:hipaa-report --month $(date +%m)

# Test alerting system
npm run security:test-alerts

# Export audit logs
npm run audit:export --format json --output ./audits/
```

---

## 📝 Configuration Files

### Environment Variables
```bash
# Add to .env
SECURITY_ALERT_EMAIL=security@yourorg.com
SECURITY_ALERT_SLACK_WEBHOOK=https://hooks.slack.com/...
AUDIT_LOG_RETENTION_DAYS=2190  # 6 years for HIPAA
ENABLE_REALTIME_ALERTS=true
ALERT_COOLDOWN_MINUTES=15
```

### Alerting Configuration
```javascript
// config/security-alerts.js
module.exports = {
  alerts: {
    crossOrgAccess: {
      threshold: 3,
      window: 300, // 5 minutes
      action: 'LOCK_ACCOUNT'
    },
    bulkExport: {
      threshold: 100,
      window: 3600, // 1 hour
      action: 'NOTIFY_COMPLIANCE'
    },
    failedLogins: {
      threshold: 5,
      window: 600, // 10 minutes
      action: 'BLOCK_IP'
    }
  }
};
```

---

## ✅ Success Criteria

Your monitoring system is properly configured when:

- ✅ All cross-org access attempts are logged and alerted
- ✅ Zero unauthorized data access succeeds
- ✅ HIPAA-relevant events are flagged and retained
- ✅ Security team receives real-time alerts
- ✅ Weekly compliance reports are generated
- ✅ Incident response time <5 minutes
- ✅ All logs retained for 6 years (HIPAA requirement)

---

## 📚 Additional Resources

- [HIPAA Audit Log Requirements](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Security Logging Guide](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Healthcare SIEM Best Practices](https://www.healthcare.gov/siem-best-practices)
