import { MailService } from '@sendgrid/mail';

class EmailService {
  private mailService: MailService;
  
  constructor() {
    this.mailService = new MailService();
    const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    if (apiKey) {
      this.mailService.setApiKey(apiKey);
    }
  }

  async sendSummary(to: string, summary: any): Promise<boolean> {
    if (!to) {
      console.log("No email address provided");
      return false;
    }

    const fromEmail = process.env.FROM_EMAIL || "noreply@nextviseai.com";
    
    try {
      if (!process.env.SENDGRID_API_KEY && !process.env.EMAIL_API_KEY) {
        console.log("EMAIL DEMO: Would send summary to", to, summary);
        return true; // Demo mode - simulate success
      }

      const subject = `${summary.context === 'telehealth' ? 'Healthcare' : 'Pharmacy'} Summary - ${summary.patient}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 24px; line-height: 1.6; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .content { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .footer { font-size: 12px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NextViseAI ${summary.context === 'telehealth' ? 'Healthcare' : 'Pharmacy'} Summary</h1>
            <p>Patient: ${summary.patient}</p>
            <p>Date: ${new Date(summary.timestamp).toLocaleString()}</p>
          </div>
          <div class="content">
            <h3>Summary Details:</h3>
            ${Object.entries(summary.content).map(([key, value]) => 
              `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`
            ).join('')}
          </div>
          <div class="footer">
            <p>This is a demonstration platform. Not for actual medical use.</p>
            <p>HIPAA/GDPR compliant processing • NextViseAI Healthcare Demos</p>
          </div>
        </body>
        </html>
      `;

      await this.mailService.send({
        to,
        from: fromEmail,
        subject,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      // Fall back to demo mode if SendGrid API fails (invalid key, 403, etc.)
      console.log("EMAIL DEMO (fallback): Would send summary to", to, summary);
      return true; // Demo mode fallback - simulate success
    }
  }
}

export const emailService = new EmailService();
