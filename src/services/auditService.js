const { prisma } = require('./db');

class AuditService {
  async log({
    userId = null,
    organizationId = null,
    action,
    resource = null,
    resourceId = null,
    ipAddress = null,
    userAgent = null,
    oldValues = null,
    newValues = null,
    metadata = null,
    hipaaRelevant = false
  }) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId,
          organizationId,
          action,
          resource,
          resourceId,
          ipAddress,
          userAgent,
          oldValues,
          newValues,
          metadata,
          hipaaRelevant,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break the main flow
    }
  }

  async logUserAction(req, action, resource = null, resourceId = null, oldValues = null, newValues = null) {
    const userId = req.user?.userId;
    const organizationId = req.user?.currentOrganization?.id;
    
    return this.log({
      userId,
      organizationId,
      action,
      resource,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      oldValues,
      newValues,
      hipaaRelevant: this.isHIPAARelevant(action, resource)
    });
  }

  isHIPAARelevant(action, resource) {
    const hipaaActions = ['VIEW_PATIENT', 'UPDATE_PATIENT', 'CREATE_OBSERVATION', 'VIEW_OBSERVATION'];
    const hipaaResources = ['patient', 'observation', 'enrollment', 'medication'];
    
    return hipaaActions.includes(action) || hipaaResources.includes(resource);
  }

  async getComplianceReport(organizationId, startDate, endDate) {
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        hipaaRelevant: true,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      totalEvents: logs.length,
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      actionBreakdown: this.groupBy(logs, 'action'),
      timelineData: this.groupByDate(logs)
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  groupByDate(logs) {
    return logs.reduce((result, log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      result[date] = (result[date] || 0) + 1;
      return result;
    }, {});
  }
}

module.exports = new AuditService();