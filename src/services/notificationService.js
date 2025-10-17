const { PrismaClient } = require('../../generated/prisma');
const nodemailer = require('nodemailer'); // You'll need to install this
// const twilio = require('twilio'); // For SMS - optional

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    // Configure email transporter (example with Gmail)
    // Only initialize if email credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        this.emailTransporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });
        console.log('Email transporter configured successfully');
      } catch (error) {
        console.warn('Email transporter initialization failed:', error.message);
        this.emailTransporter = null;
      }
    } else {
      console.log('Email credentials not configured - email notifications will be logged only');
      this.emailTransporter = null;
    }
  }

  /**
   * Send alert notification to clinician based on severity
   * LOW: in-app only (no email/SMS)
   * MEDIUM: email
   * HIGH: email + SMS
   * CRITICAL: email + SMS (+ phone call in future)
   */
  async sendAlertNotification(alert, clinician, patient) {
    try {
      if (!clinician || !clinician.email) {
        console.warn(`Clinician email not found for alert ${alert.id}`);
        return { sent: false, reason: 'No clinician email' };
      }

      const severity = alert.severity;
      const channels = this.getChannelsForSeverity(severity);

      const message = {
        subject: `${severity} Alert: ${patient.firstName} ${patient.lastName}`,
        body: `
          <strong>Alert Details:</strong><br/>
          Patient: ${patient.firstName} ${patient.lastName}<br/>
          Severity: ${severity}<br/>
          Message: ${alert.message}<br/>
          Risk Score: ${alert.riskScore || 'N/A'}<br/>
          Triggered: ${new Date(alert.triggeredAt).toLocaleString()}<br/>
          ${alert.slaBreachTime ? `SLA Breach: ${new Date(alert.slaBreachTime).toLocaleString()}` : ''}
        `,
        actionUrl: `/alerts/${alert.id}`
      };

      const results = { channels: {}, sent: false };

      // Send via appropriate channels based on severity
      if (channels.includes('email')) {
        results.channels.email = await this.sendEmail(clinician.email, message);
        results.sent = true;
      }

      if (channels.includes('sms') && clinician.phone) {
        results.channels.sms = await this.sendSMS(clinician.phone, message);
        results.sent = true;
      }

      // Future: phone call for CRITICAL alerts
      if (channels.includes('phone') && clinician.phone) {
        console.log(`Phone call would be placed to ${clinician.phone} for CRITICAL alert`);
        results.channels.phone = { status: 'not_implemented' };
      }

      console.log(`Alert notification sent to ${clinician.email} via ${channels.join(', ')}`);
      return results;
    } catch (error) {
      console.error('Error sending alert notification:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send escalation notification when SLA is breached
   */
  async sendEscalationNotification(alert, supervisor, patient, originalClinician) {
    try {
      if (!supervisor || !supervisor.email) {
        console.warn(`Supervisor email not found for alert ${alert.id}`);
        return { sent: false, reason: 'No supervisor email' };
      }

      const message = {
        subject: `🚨 SLA BREACH - Escalated Alert: ${patient.firstName} ${patient.lastName}`,
        body: `
          <strong>ESCALATION NOTICE:</strong><br/>
          This alert has not been acknowledged within the SLA timeframe and requires immediate attention.<br/><br/>

          <strong>Alert Details:</strong><br/>
          Patient: ${patient.firstName} ${patient.lastName}<br/>
          Severity: ${alert.severity}<br/>
          Message: ${alert.message}<br/>
          Risk Score: ${alert.riskScore || 'N/A'}<br/>
          Triggered: ${new Date(alert.triggeredAt).toLocaleString()}<br/>
          SLA Breach Time: ${new Date(alert.slaBreachTime).toLocaleString()}<br/>
          Assigned To: ${originalClinician ? `${originalClinician.firstName} ${originalClinician.lastName}` : 'Unassigned'}<br/>
        `,
        actionUrl: `/alerts/${alert.id}`
      };

      // Always send email for escalations
      await this.sendEmail(supervisor.email, message);

      // Also send SMS for HIGH and CRITICAL escalations
      if (['HIGH', 'CRITICAL'].includes(alert.severity) && supervisor.phone) {
        await this.sendSMS(supervisor.phone, message);
      }

      console.log(`Escalation notification sent to supervisor ${supervisor.email}`);
      return { sent: true, channels: ['email'] };
    } catch (error) {
      console.error('Error sending escalation notification:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Send assessment reminder to patient
   */
  async sendAssessmentReminder(patient, enrollment, assessmentTemplate) {
    try {
      if (!patient || !patient.email) {
        console.warn(`Patient email not found for reminder`);
        return { sent: false, reason: 'No patient email' };
      }

      const message = {
        subject: `Reminder: ${assessmentTemplate.name}`,
        body: `Hi ${patient.firstName}, it's time to complete your ${assessmentTemplate.name}.`,
        actionUrl: `/assessments/${enrollment.id}/complete`
      };

      await this.sendEmail(patient.email, message);

      console.log(`Assessment reminder sent to ${patient.email}`);
      return { sent: true, channels: ['email'] };
    } catch (error) {
      console.error('Error sending assessment reminder:', error);
      return { sent: false, error: error.message };
    }
  }

  /**
   * Determine notification channels based on alert severity
   */
  getChannelsForSeverity(severity) {
    switch (severity) {
      case 'LOW':
        return []; // In-app only, no email/SMS
      case 'MEDIUM':
        return ['email'];
      case 'HIGH':
        return ['email', 'sms'];
      case 'CRITICAL':
        return ['email', 'sms', 'phone'];
      default:
        return ['email'];
    }
  }

  async sendDailyReminder(patientId, enrollmentId, reminderSettings) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { email: true, phone: true, firstName: true }
      });

      if (!patient) {
        console.error(`Patient ${patientId} not found`);
        return;
      }

      const message = {
        subject: 'Daily Pain Assessment Reminder',
        body: `Hi ${patient.firstName}, it's time to complete your daily pain assessment.`,
        actionUrl: `/assessments/${enrollmentId}/daily`
      };

      // Send via configured methods
      if (reminderSettings.methods.includes('email') && patient.email) {
        await this.sendEmail(patient.email, message);
      }

      if (reminderSettings.methods.includes('sms') && patient.phone) {
        await this.sendSMS(patient.phone, message);
      }

      console.log(`Daily reminder sent to patient ${patient.firstName}`);
    } catch (error) {
      console.error('Error sending daily reminder:', error);
    }
  }

  async sendEmail(email, message) {
    try {
      const actionButton = message.actionUrl ? `
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}${message.actionUrl}"
           style="background-color: #2563eb; color: white; padding: 12px 24px;
                  text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px;">
          View Details
        </a>
      ` : '';

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@clinmetrics.com',
        to: email,
        subject: message.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="margin: 0; color: white;">ClinMetrics Pro</h2>
            </div>
            <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              ${message.body}
              ${actionButton}
              <p style="margin-top: 20px; color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                If you have any questions, please contact your healthcare provider.
              </p>
            </div>
          </div>
        `
      };

      // If no email transporter configured, just log
      if (!this.emailTransporter) {
        console.log(`[MOCK EMAIL] To: ${email}, Subject: ${message.subject}`);
        return { success: true, messageId: 'mock-' + Date.now(), mock: true };
      }

      const result = await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSMS(phone, message) {
    try {
      // Placeholder for SMS implementation
      // You can implement with Twilio, AWS SNS, or other SMS service
      console.log(`SMS would be sent to ${phone}: ${message.body}`);
      
      // Example with Twilio (uncomment if you set up Twilio):
      // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      // await client.messages.create({
      //   body: `${message.body} Complete at: ${process.env.FRONTEND_URL}${message.actionUrl}`,
      //   from: process.env.TWILIO_PHONE,
      //   to: phone
      // });
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }
}

module.exports = new NotificationService();