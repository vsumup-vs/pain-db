const { PrismaClient } = require('../../generated/prisma');
const nodemailer = require('nodemailer'); // You'll need to install this
// const twilio = require('twilio'); // For SMS - optional

const prisma = new PrismaClient();

class NotificationService {
  constructor() {
    // Configure email transporter (example with Gmail)
    this.emailTransporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
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
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@painmanagement.com',
        to: email,
        subject: message.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Pain Management System</h2>
            <p>${message.body}</p>
            <a href="${process.env.FRONTEND_URL}${message.actionUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Complete Assessment
            </a>
            <p style="margin-top: 20px; color: #666; font-size: 14px;">
              If you have any questions, please contact your healthcare provider.
            </p>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
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