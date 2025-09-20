import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { emailService } from "./services/emailService";
import { smsService } from "./services/smsService";
import { prescriptionService } from "./services/prescriptionService";
import { voiceAgentService } from "./services/voiceAgentService";
import { storage } from "./storage";
import multer from 'multer';
import { requireAuth, validatePatientAccess, AuthenticatedRequest } from './middleware/auth';

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only audio files
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    }
  });

  // Multer error handling middleware
  const handleMulterError = (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        error: 'File upload error',
        message: error.message
      });
    }
    if (error.message === 'Only audio files are allowed') {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only audio files are allowed'
      });
    }
    next(error);
  };

  // Voice Agent endpoints (secured)
  app.post("/api/voice/transcribe", requireAuth, validatePatientAccess, upload.single('audio'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { patientId, language, consultationType } = req.body;
      
      const transcript = await voiceAgentService.transcribeAudio(req.file.buffer, {
        patientId,
        language: language || 'en',
        consultationType: consultationType || 'telehealth'
      });

      res.json({ 
        success: true, 
        transcript,
        message: "Audio transcribed successfully"
      });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/voice/chat", requireAuth, validatePatientAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const { 
        message, 
        conversationHistory = [], 
        patientId, 
        consultationType = 'telehealth',
        language = 'en'
      } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await voiceAgentService.processVoiceInput(
        message,
        conversationHistory,
        { patientId, language, consultationType }
      );

      // Generate audio response if requested
      let audioBuffer = null;
      if (req.body.generateAudio) {
        audioBuffer = await voiceAgentService.generateTextToSpeech(response.textResponse, {
          language,
          consultationType
        });
      }

      res.json({
        success: true,
        response: response.textResponse,
        actions: response.actions || [],
        conversationId: response.conversationId,
        hasAudio: !!audioBuffer,
        audioData: audioBuffer ? audioBuffer.toString('base64') : null,
        message: "Voice agent response generated"
      });

      // Save conversation to database if patientId provided
      if (patientId && response.conversationId) {
        try {
          const messages = [
            ...conversationHistory,
            { role: 'user', content: message, timestamp: new Date() },
            { role: 'assistant', content: response.textResponse, timestamp: new Date() }
          ];
          
          await voiceAgentService.saveConversationToDatabase(
            patientId,
            messages,
            consultationType
          );
        } catch (dbError) {
          console.warn("Failed to save conversation to database:", dbError);
        }
      }
    } catch (error) {
      console.error("Error processing voice chat:", error);
      res.status(500).json({ error: "Failed to process voice chat" });
    }
  });

  app.post("/api/voice/tts", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { text, language = 'en', consultationType = 'telehealth' } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const audioBuffer = await voiceAgentService.generateTextToSpeech(text, {
        language,
        consultationType
      });

      if (!audioBuffer) {
        return res.json({ 
          success: true, 
          demoMode: true,
          message: "TTS demo mode - no audio generated" 
        });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'attachment; filename="voice-response.mp3"');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error generating text-to-speech:", error);
      res.status(500).json({ error: "Failed to generate text-to-speech" });
    }
  });

  app.get("/api/voice/conversations/:patientId", requireAuth, validatePatientAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const { patientId } = req.params;
      const { consultationType } = req.query;

      // Get consultations for the patient
      const consultations = await storage.getConsultationsByPatient(patientId);
      
      // Filter by consultation type if specified
      const filteredConsultations = consultationType 
        ? consultations.filter(c => c.consultationType === consultationType)
        : consultations;

      // Extract voice agent conversations (those with transcripts)
      const voiceConversations = filteredConsultations
        .filter(c => c.transcript)
        .map(c => ({
          id: c.id,
          consultationType: c.consultationType,
          reason: c.reason,
          status: c.status,
          createdAt: c.createdAt,
          transcript: c.transcript ? JSON.parse(c.transcript) : [],
          duration: c.duration
        }));

      res.json({
        success: true,
        conversations: voiceConversations,
        total: voiceConversations.length
      });
    } catch (error) {
      console.error("Error fetching voice conversations:", error);
      res.status(500).json({ error: "Failed to fetch voice conversations" });
    }
  });

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

  // Pharmacy endpoints
  app.get("/api/pharmacy/categories", async (req, res) => {
    try {
      const categories = await storage.getPharmacyCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching pharmacy categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/pharmacy/products", async (req, res) => {
    try {
      const { categoryId } = req.query;
      
      let products;
      if (categoryId && typeof categoryId === 'string') {
        products = await storage.getPharmacyProductsByCategory(categoryId);
      } else {
        products = await storage.getPharmacyProducts();
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching pharmacy products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/pharmacy/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const product = await storage.getPharmacyProduct(id);
      
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching pharmacy product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Add global error handling middleware
  app.use(handleMulterError);
  
  const httpServer = createServer(app);
  return httpServer;
}
