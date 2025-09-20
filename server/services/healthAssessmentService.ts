import OpenAI from 'openai';

interface SymptomAnalysisConfig {
  patientAge?: number;
  patientGender?: string;
  medicalHistory?: string[];
  currentMedications?: string[];
  allergies?: string[];
}

interface HealthAssessmentRequest {
  symptoms: string[];
  severity: Record<string, number>; // 1-10 scale
  duration: Record<string, string>; // e.g., "2 days", "1 week"
  additionalInfo: string;
  patientConfig?: SymptomAnalysisConfig;
}

interface AIHealthAnalysis {
  diagnosis: string[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  referralNeeded: boolean;
  riskScore: number; // 0-100
  followUpDays?: number;
  emergencyWarning?: string;
}

interface HealthQuestionnaire {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: 'multiple_choice' | 'scale' | 'text' | 'boolean';
    question: string;
    options?: string[];
    required: boolean;
  }>;
}

class HealthAssessmentService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️  No OpenAI API key found. Health assessment will use demo mode.");
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey || 'demo-key'
    });
  }

  async analyzeSymptoms(request: HealthAssessmentRequest): Promise<AIHealthAnalysis> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        // Demo mode response
        if (process.env.NODE_ENV !== 'production') {
          console.log("HEALTH DEMO: Would analyze symptoms:", request.symptoms.join(', '));
        }
        return this.generateDemoAnalysis(request);
      }

      const prompt = this.buildHealthAssessmentPrompt(request);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a medical AI assistant helping with preliminary health assessment. 
            
IMPORTANT DISCLAIMERS:
- This is NOT a medical diagnosis and should not replace professional medical advice
- Always recommend consulting with healthcare professionals for proper diagnosis
- In case of emergency symptoms, always recommend immediate medical attention

Your role is to:
1. Analyze reported symptoms and provide possible explanations
2. Assess urgency level and risk factors
3. Provide general health recommendations
4. Determine if professional medical consultation is needed

Respond in JSON format with the following structure:
{
  "diagnosis": ["possible condition 1", "possible condition 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "urgencyLevel": "low|medium|high|emergency",
  "referralNeeded": true|false,
  "riskScore": 0-100,
  "followUpDays": number,
  "emergencyWarning": "string if emergency"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error('No response from AI');
      }

      // Parse JSON response
      const analysis: AIHealthAnalysis = JSON.parse(responseText);
      
      // Validate and sanitize response
      return this.validateAnalysis(analysis);

    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      
      // Fallback to demo mode
      if (process.env.NODE_ENV !== 'production') {
        console.log("HEALTH DEMO (fallback): AI analysis failed, using demo response");
      }
      return this.generateDemoAnalysis(request);
    }
  }

  private buildHealthAssessmentPrompt(request: HealthAssessmentRequest): string {
    const { symptoms, severity, duration, additionalInfo, patientConfig } = request;

    let prompt = `Health Assessment Request:

Symptoms reported:
${symptoms.map((symptom, index) => {
  const sev = severity[symptom] ? ` (severity: ${severity[symptom]}/10)` : '';
  const dur = duration[symptom] ? ` (duration: ${duration[symptom]})` : '';
  return `- ${symptom}${sev}${dur}`;
}).join('\n')}

Additional information: ${additionalInfo || 'None provided'}
`;

    if (patientConfig) {
      prompt += `
Patient context:
- Age: ${patientConfig.patientAge || 'Not specified'}
- Gender: ${patientConfig.patientGender || 'Not specified'}
- Medical history: ${patientConfig.medicalHistory?.join(', ') || 'None reported'}
- Current medications: ${patientConfig.currentMedications?.join(', ') || 'None reported'}
- Known allergies: ${patientConfig.allergies?.join(', ') || 'None reported'}
`;
    }

    prompt += `
Please provide a comprehensive health assessment including possible explanations for these symptoms, urgency level, and recommendations. Remember this is for preliminary assessment only and not a substitute for professional medical care.`;

    return prompt;
  }

  private generateDemoAnalysis(request: HealthAssessmentRequest): AIHealthAnalysis {
    const { symptoms } = request;
    
    // Generate realistic demo analysis based on symptoms
    const hasSeveSymptoms = symptoms.some(s => 
      s.toLowerCase().includes('chest pain') || 
      s.toLowerCase().includes('difficulty breathing') ||
      s.toLowerCase().includes('severe')
    );

    const hasCommonSymptoms = symptoms.some(s =>
      s.toLowerCase().includes('headache') ||
      s.toLowerCase().includes('fatigue') ||
      s.toLowerCase().includes('cough')
    );

    if (hasSeveSymptoms) {
      return {
        diagnosis: ['Requires immediate medical evaluation', 'Possible cardiac or respiratory concern'],
        recommendations: [
          'Seek immediate medical attention',
          'Do not delay in consulting a healthcare provider',
          'Monitor symptoms closely'
        ],
        urgencyLevel: 'high',
        referralNeeded: true,
        riskScore: 75,
        followUpDays: 1,
        emergencyWarning: 'These symptoms may require immediate medical attention'
      };
    }

    if (hasCommonSymptoms) {
      return {
        diagnosis: ['Possible viral infection', 'Common cold or flu', 'Stress-related symptoms'],
        recommendations: [
          'Get adequate rest and hydration',
          'Monitor symptoms for changes',
          'Consider over-the-counter symptom relief',
          'Consult healthcare provider if symptoms worsen'
        ],
        urgencyLevel: 'low',
        referralNeeded: false,
        riskScore: 25,
        followUpDays: 7
      };
    }

    return {
      diagnosis: ['General health concern', 'Requires further evaluation'],
      recommendations: [
        'Schedule consultation with healthcare provider',
        'Keep a symptom diary',
        'Monitor for any changes or new symptoms',
        'Maintain healthy lifestyle habits'
      ],
      urgencyLevel: 'medium',
      referralNeeded: true,
      riskScore: 40,
      followUpDays: 3
    };
  }

  private validateAnalysis(analysis: AIHealthAnalysis): AIHealthAnalysis {
    return {
      diagnosis: Array.isArray(analysis.diagnosis) ? analysis.diagnosis : ['Requires medical evaluation'],
      recommendations: Array.isArray(analysis.recommendations) ? analysis.recommendations : ['Consult healthcare provider'],
      urgencyLevel: ['low', 'medium', 'high', 'emergency'].includes(analysis.urgencyLevel) 
        ? analysis.urgencyLevel : 'medium',
      referralNeeded: typeof analysis.referralNeeded === 'boolean' ? analysis.referralNeeded : true,
      riskScore: typeof analysis.riskScore === 'number' && analysis.riskScore >= 0 && analysis.riskScore <= 100 
        ? analysis.riskScore : 50,
      followUpDays: analysis.followUpDays,
      emergencyWarning: analysis.emergencyWarning
    };
  }

  getHealthQuestionnaires(): HealthQuestionnaire[] {
    return [
      {
        id: 'symptom_checker',
        title: 'Symptom Checker',
        description: 'Answer questions about your current symptoms for AI-powered health assessment',
        questions: [
          {
            id: 'primary_symptoms',
            type: 'multiple_choice',
            question: 'What are your primary symptoms? (Select all that apply)',
            options: [
              'Headache', 'Fever', 'Cough', 'Sore throat', 'Fatigue',
              'Nausea', 'Vomiting', 'Diarrhea', 'Abdominal pain',
              'Chest pain', 'Difficulty breathing', 'Dizziness',
              'Muscle aches', 'Joint pain', 'Skin rash', 'Other'
            ],
            required: true
          },
          {
            id: 'symptom_onset',
            type: 'multiple_choice',
            question: 'When did your symptoms start?',
            options: [
              'Less than 24 hours ago',
              '1-3 days ago',
              '4-7 days ago',
              '1-2 weeks ago',
              'More than 2 weeks ago'
            ],
            required: true
          },
          {
            id: 'symptom_severity',
            type: 'scale',
            question: 'Rate the overall severity of your symptoms (1 = mild, 10 = severe)',
            required: true
          },
          {
            id: 'temperature',
            type: 'multiple_choice',
            question: 'Have you measured your temperature?',
            options: [
              'No fever (under 100°F/37.8°C)',
              'Low fever (100-101°F/37.8-38.3°C)',
              'Moderate fever (101-103°F/38.3-39.4°C)',
              'High fever (over 103°F/39.4°C)',
              'Haven\'t measured'
            ],
            required: false
          },
          {
            id: 'additional_symptoms',
            type: 'text',
            question: 'Please describe any additional symptoms or details',
            required: false
          },
          {
            id: 'medical_history',
            type: 'boolean',
            question: 'Do you have any chronic medical conditions?',
            required: false
          },
          {
            id: 'current_medications',
            type: 'boolean',
            question: 'Are you currently taking any medications?',
            required: false
          }
        ]
      },
      {
        id: 'wellness_check',
        title: 'General Wellness Assessment',
        description: 'Comprehensive wellness evaluation for preventive health',
        questions: [
          {
            id: 'energy_level',
            type: 'scale',
            question: 'Rate your overall energy level (1 = very low, 10 = very high)',
            required: true
          },
          {
            id: 'sleep_quality',
            type: 'scale',
            question: 'Rate your sleep quality (1 = very poor, 10 = excellent)',
            required: true
          },
          {
            id: 'stress_level',
            type: 'scale',
            question: 'Rate your stress level (1 = very low, 10 = very high)',
            required: true
          },
          {
            id: 'exercise_frequency',
            type: 'multiple_choice',
            question: 'How often do you exercise?',
            options: [
              'Daily',
              '3-5 times per week',
              '1-2 times per week',
              'Rarely',
              'Never'
            ],
            required: true
          },
          {
            id: 'diet_quality',
            type: 'multiple_choice',
            question: 'How would you describe your diet?',
            options: [
              'Very healthy',
              'Mostly healthy',
              'Average',
              'Somewhat unhealthy',
              'Very unhealthy'
            ],
            required: true
          }
        ]
      }
    ];
  }

  getEmergencySymptoms(): string[] {
    return [
      'chest pain',
      'difficulty breathing',
      'severe abdominal pain',
      'loss of consciousness',
      'severe headache',
      'confusion',
      'high fever with rash',
      'severe allergic reaction',
      'signs of stroke',
      'severe bleeding',
      'thoughts of self-harm'
    ];
  }
}

export const healthAssessmentService = new HealthAssessmentService();
export type { HealthAssessmentRequest, AIHealthAnalysis, HealthQuestionnaire };