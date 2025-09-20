class SMSService {
  private twilioAccountSid?: string;
  private twilioAuthToken?: string;
  private twilioPhoneNumber?: string;

  constructor() {
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!to) {
      console.log("No phone number provided");
      return false;
    }

    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        console.log("SMS DEMO: Would send to", to, "Message:", message);
        return true; // Demo mode - simulate success
      }

      // In production, use Twilio SDK
      const twilio = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);
      
      await twilio.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to
      });

      return true;
    } catch (error) {
      console.error("Error sending SMS:", error);
      return false;
    }
  }

  async sendWhatsApp(to: string, message: string): Promise<boolean> {
    if (!to) {
      console.log("No phone number provided");
      return false;
    }

    try {
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        console.log("WHATSAPP DEMO: Would send to", to, "Message:", message);
        return true; // Demo mode - simulate success
      }

      // In production, use Twilio SDK for WhatsApp
      const twilio = require('twilio')(this.twilioAccountSid, this.twilioAuthToken);
      
      await twilio.messages.create({
        body: message,
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: `whatsapp:${to}`
      });

      return true;
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      return false;
    }
  }
}

export const smsService = new SMSService();
