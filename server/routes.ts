import type { Express } from "express";
import { createServer, type Server } from "http";
import { emailService } from "./services/emailService";
import { smsService } from "./services/smsService";
import { prescriptionService } from "./services/prescriptionService";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Telehealth endpoints
  app.post("/api/telehealth/summary", async (req, res) => {
    try {
      const { contactData, channel, summaryType } = req.body;
      
      if (!contactData.consent) {
        return res.status(400).json({ error: "User consent required" });
      }

      const summary = {
        context: "telehealth",
        type: summaryType || "consultation",
        patient: contactData.name || "Demo User",
        timestamp: new Date().toISOString(),
        content: {
          reason: "Follow-up for lab results (demo)",
          preferredSlot: "Tomorrow 10:00",
          nextSteps: "Confirmation & reminders via SMS/WhatsApp"
        }
      };

      let sent = false;
      
      switch (channel) {
        case "email":
          sent = await emailService.sendSummary(contactData.email, summary);
          break;
        case "sms":
          sent = await smsService.sendSMS(contactData.phone, `Telehealth Summary: ${summary.content.reason}. Next steps: ${summary.content.nextSteps}`);
          break;
        case "whatsapp":
          sent = await smsService.sendWhatsApp(contactData.phone, `📋 *Telehealth Summary*\n\nReason: ${summary.content.reason}\nNext: ${summary.content.nextSteps}`);
          break;
        default:
          return res.status(400).json({ error: "Invalid channel" });
      }

      if (sent) {
        res.json({ success: true, message: "Summary sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send summary" });
      }
    } catch (error) {
      console.error("Error sending telehealth summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/telehealth/prescription", async (req, res) => {
    try {
      const { contactData, items = [] } = req.body;
      
      const prescription = await prescriptionService.generatePrescription({
        patient: {
          name: contactData.name || "Demo User",
          email: contactData.email,
          phone: contactData.phone
        },
        items,
        context: "telehealth"
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(prescription);
    } catch (error) {
      console.error("Error generating prescription:", error);
      res.status(500).json({ error: "Failed to generate prescription" });
    }
  });

  app.post("/api/telehealth/sick-note", async (req, res) => {
    try {
      const { contactData, reason, startDate, duration, country, employerEmail } = req.body;
      
      const sickNote = await prescriptionService.generateSickNote({
        patient: {
          name: contactData.name || "Demo User",
          email: contactData.email,
          phone: contactData.phone
        },
        reason: reason || "(not specified)",
        startDate: startDate || new Date().toISOString().split('T')[0],
        duration: duration || 3,
        country: country || "DE",
        employerEmail
      });

      res.setHeader('Content-Type', 'text/html');
      res.send(sickNote);
    } catch (error) {
      console.error("Error generating sick note:", error);
      res.status(500).json({ error: "Failed to generate sick note" });
    }
  });

  // Tele-pharmacy endpoints
  app.post("/api/telepharmacy/summary", async (req, res) => {
    try {
      const { contactData, channel, summaryType, cart = [] } = req.body;
      
      if (!contactData.consent) {
        return res.status(400).json({ error: "User consent required" });
      }

      const summary = {
        context: "telepharmacy",
        type: summaryType || "product",
        patient: contactData.name || "Demo User",
        timestamp: new Date().toISOString(),
        content: {
          products: cart.length ? cart.map((c: any) => `${c.id}x${c.qty}`).join(", ") : "(none)",
          advice: "Demo label guidance; check contraindications and interactions.",
          nextSteps: "Follow instructions; seek help if symptoms persist."
        }
      };

      let sent = false;
      
      switch (channel) {
        case "email":
          sent = await emailService.sendSummary(contactData.email, summary);
          break;
        case "sms":
          sent = await smsService.sendSMS(contactData.phone, `Pharmacy Summary: Products: ${summary.content.products}. Advice: ${summary.content.advice}`);
          break;
        case "whatsapp":
          sent = await smsService.sendWhatsApp(contactData.phone, `🏥 *Pharmacy Summary*\n\nProducts: ${summary.content.products}\nAdvice: ${summary.content.advice}`);
          break;
        default:
          return res.status(400).json({ error: "Invalid channel" });
      }

      if (sent) {
        res.json({ success: true, message: "Summary sent successfully" });
      } else {
        res.status(500).json({ error: "Failed to send summary" });
      }
    } catch (error) {
      console.error("Error sending telepharmacy summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
