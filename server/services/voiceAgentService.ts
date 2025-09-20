import OpenAI from 'openai';
import { storage } from '../storage';
import { securityService } from './securityService';

interface VoiceAgentConfig {
  patientId?: string;
  language?: string;
  consultationType?: 'telehealth' | 'telepharmacy';
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface VoiceAgentResponse {
  textResponse: string;
  audioUrl?: string;
  actions?: {
    type: 'appointment_request' | 'consultation_request' | 'pharmacy_inquiry';
    data: any;
  }[];
  conversationId?: string;
}

class VoiceAgentService {
  private openai: OpenAI;
  private readonly systemPrompts = {
    telehealth: `You are NextViseAI's helpful telehealth assistant. You help patients schedule appointments, understand their symptoms, and guide them through healthcare services. 

Key capabilities:
- Schedule telehealth appointments
- Provide basic health information
- Guide users through the consultation process
- Collect patient symptoms and concerns
- Explain next steps in their care

Guidelines:
- Be empathetic and professional
- Ask clarifying questions about symptoms
- Suggest appropriate appointment types
- Always remind patients this is for guidance only, not medical diagnosis
- Keep responses concise and clear
- If urgent symptoms, recommend immediate medical attention`,

    telepharmacy: `You are NextViseAI's helpful telepharmacy assistant. You help patients with medication questions, pharmacy services, and prescription management.

Key capabilities:
- Answer medication questions
- Help with prescription refills
- Explain drug interactions and side effects
- Guide users through pharmacy services
- Provide medication adherence support

Guidelines:
- Be knowledgeable about medications
- Ask about allergies and current medications
- Explain medication instructions clearly
- Recommend consulting pharmacist for complex questions
- Keep responses professional and informative
- Always remind this is for guidance only, not medical advice`
  };

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️  No OpenAI API key found. Voice agent will use demo mode.");
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'demo-key'
    });
  }

  async transcribeAudio(audioBuffer: Buffer, config: VoiceAgentConfig = {}): Promise<string> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        // Demo mode - return simulated transcription
        if (process.env.NODE_ENV !== 'production') {
          console.log("VOICE DEMO: Would transcribe audio buffer");
        }
        return "Hello, I would like to schedule an appointment for a general consultation.";
      }

      // Use OpenAI's toFile utility for proper file handling
      const tempFile = await this.openai.toFile(audioBuffer, 'audio.webm');
      
      const response = await this.openai.audio.transcriptions.create({
        file: tempFile,
        model: 'whisper-1',
        language: config.language || 'en',
        response_format: 'text'
      });

      return response;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      // Fall back to demo mode
      if (process.env.NODE_ENV !== 'production') {
        console.log("VOICE DEMO (fallback): Audio transcription failed, using demo response");
      }
      return "I'm having trouble with my audio, but I'd like to schedule a consultation.";
    }
  }

  async generateTextToSpeech(text: string, config: VoiceAgentConfig = {}): Promise<Buffer | null> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        // Demo mode - return null (no audio generated)
        if (process.env.NODE_ENV !== 'production') {
          console.log("VOICE DEMO: Would generate TTS for:", text.substring(0, 50) + '...');
        }
        return null;
      }

      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3'
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      console.error('Error generating text-to-speech:', error);
      if (process.env.NODE_ENV !== 'production') {
        console.log("VOICE DEMO (fallback): TTS generation failed");
      }
      return null;
    }
  }

  async processVoiceInput(
    transcribedText: string, 
    conversationHistory: ConversationMessage[],
    config: VoiceAgentConfig = {}
  ): Promise<VoiceAgentResponse> {
    try {
      const consultationType = config.consultationType || 'telehealth';
      const systemPrompt = this.systemPrompts[consultationType];

      if (!process.env.OPENAI_API_KEY) {
        // Demo mode response
        const demoResponse = this.generateDemoResponse(transcribedText, consultationType);
        if (process.env.NODE_ENV !== 'production') {
          console.log("VOICE DEMO: Generated response:", demoResponse.textResponse.substring(0, 50) + '...');
        }
        return demoResponse;
      }

      // Build conversation context
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: transcribedText }
      ];

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7,
        tools: [
          {
            type: 'function',
            function: {
              name: 'schedule_appointment',
              description: 'Schedule a healthcare appointment',
              parameters: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['telehealth', 'telepharmacy'] },
                  reason: { type: 'string' },
                  urgency: { type: 'string', enum: ['routine', 'urgent', 'emergency'] },
                  preferredTime: { type: 'string' }
                },
                required: ['type', 'reason']
              }
            }
          }
        ],
        tool_choice: 'auto'
      });

      const assistantMessage = completion.choices[0].message;
      let actions: any[] = [];

      // Check if tool was called
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type === 'function' && toolCall.function.name === 'schedule_appointment') {
            const functionData = JSON.parse(toolCall.function.arguments);
            actions.push({
              type: 'appointment_request',
              data: functionData
            });
          }
        }
      }

      const textResponse = assistantMessage.content || "I understand. How else can I help you?";
      
      return {
        textResponse,
        actions,
        conversationId: securityService.generateSecureToken()
      };

    } catch (error) {
      console.error('Error processing voice input:', error);
      
      // Fallback to demo mode
      const demoResponse = this.generateDemoResponse(transcribedText, config.consultationType || 'telehealth');
      if (process.env.NODE_ENV !== 'production') {
        console.log("VOICE DEMO (fallback): API failed, using demo response");
      }
      return demoResponse;
    }
  }

  private generateDemoResponse(input: string, consultationType: string): VoiceAgentResponse {
    const lowerInput = input.toLowerCase();
    
    // Detect appointment scheduling intent
    if (lowerInput.includes('appointment') || lowerInput.includes('schedule') || lowerInput.includes('book')) {
      return {
        textResponse: `I'd be happy to help you schedule a ${consultationType} appointment. I can see you're interested in booking a consultation. Let me connect you with our scheduling system to find an available time that works for you.`,
        actions: [{
          type: 'appointment_request',
          data: {
            type: consultationType,
            reason: 'General consultation',
            urgency: 'routine'
          }
        }],
        conversationId: securityService.generateSecureToken()
      };
    }

    // Detect symptom discussion
    if (lowerInput.includes('pain') || lowerInput.includes('hurt') || lowerInput.includes('feel') || lowerInput.includes('symptom')) {
      return {
        textResponse: "I understand you're experiencing some symptoms. While I can provide general information, it's important to speak with a healthcare provider for proper evaluation. Would you like me to help you schedule a consultation?",
        actions: [{
          type: 'consultation_request',
          data: {
            type: consultationType,
            reason: 'Symptom consultation'
          }
        }],
        conversationId: securityService.generateSecureToken()
      };
    }

    // Detect medication questions
    if (lowerInput.includes('medication') || lowerInput.includes('prescription') || lowerInput.includes('drug') || lowerInput.includes('pill')) {
      return {
        textResponse: "I can help you with medication-related questions. For specific medication advice, I recommend speaking with our pharmacist. Would you like me to connect you with our telepharmacy service?",
        actions: [{
          type: 'pharmacy_inquiry',
          data: {
            type: 'telepharmacy',
            reason: 'Medication consultation'
          }
        }],
        conversationId: securityService.generateSecureToken()
      };
    }

    // Default response
    return {
      textResponse: `Thank you for reaching out to NextViseAI ${consultationType} services. I'm here to help you with your healthcare needs. How can I assist you today?`,
      conversationId: securityService.generateSecureToken()
    };
  }

  async saveConversationToDatabase(
    patientId: string,
    messages: ConversationMessage[],
    consultationType: 'telehealth' | 'telepharmacy'
  ): Promise<string> {
    try {
      // Create a consultation record
      const consultation = await storage.createConsultation({
        patientId,
        consultationType,
        status: 'in_progress',
        reason: 'Voice agent consultation',
        transcript: JSON.stringify(messages),
        notes: 'Voice agent conversation'
      });

      // Create a medical record for the conversation
      const transcript = messages.map(msg => 
        `[${msg.timestamp?.toLocaleString() || 'Unknown time'}] ${msg.role}: ${msg.content}`
      ).join('\n');

      await storage.createMedicalRecord({
        patientId,
        recordType: 'consultation',
        title: `Voice Agent ${consultationType} Consultation`,
        content: transcript,
        doctorName: 'NextViseAI Voice Agent',
        facilityName: 'NextViseAI Platform'
      });

      return consultation.id;
    } catch (error) {
      console.error('Error saving conversation to database:', error);
      throw new Error('Failed to save conversation');
    }
  }
}

export const voiceAgentService = new VoiceAgentService();