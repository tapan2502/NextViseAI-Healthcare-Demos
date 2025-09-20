import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Stethoscope,
  FileText,
  TrendingUp
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { SymptomChecker } from '@/components/SymptomChecker';
import { AssessmentHistory } from '@/components/AssessmentHistory';

interface AIHealthAnalysis {
  diagnosis: string[];
  recommendations: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  referralNeeded: boolean;
  riskScore: number;
  followUpDays?: number;
  emergencyWarning?: string;
}

interface HealthAssessment {
  id: string;
  assessmentType: string;
  symptoms: string[];
  aiAnalysis: AIHealthAnalysis;
  followUpRequired: boolean;
  consultationRecommended: boolean;
  createdAt: string;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options?: string[];
    required: boolean;
  }>;
}

export function HealthAssessment() {
  const [activeTab, setActiveTab] = useState<'checker' | 'history'>('checker');
  const [currentAssessment, setCurrentAssessment] = useState<HealthAssessment | null>(null);
  const queryClient = useQueryClient();

  // Fetch available questionnaires
  const { data: questionnairesData } = useQuery({
    queryKey: ['/api/health/questionnaires'],
    enabled: true
  });

  // Emergency symptoms (handled client-side for demo)
  const emergencySymptoms = [
    'chest pain', 'difficulty breathing', 'severe bleeding',
    'loss of consciousness', 'severe allergic reaction'
  ];

  // Fetch recent assessments for the current patient (demo patient for now)
  const { data: assessmentsData } = useQuery({
    queryKey: ['/api/health/assessments/demo-patient-id'],
    enabled: activeTab === 'history'
  });

  const createAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      const response = await apiRequest('POST', `/api/health/assessment`, {
        ...assessmentData,
        patientId: 'demo-patient-id' // Using demo patient ID
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setCurrentAssessment(data.assessment);
      queryClient.invalidateQueries({ queryKey: ['/api/health/assessments/demo-patient-id'] });
    }
  });

  const handleSymptomSubmission = async (symptomData: any) => {
    try {
      await createAssessmentMutation.mutateAsync(symptomData);
    } catch (error) {
      console.error('Error creating assessment:', error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  if (createAssessmentMutation.isPending) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <Brain className="h-12 w-12 mx-auto animate-pulse text-primary" />
          <h2 className="text-2xl font-bold">AI Health Assessment in Progress</h2>
          <p className="text-muted-foreground">Analyzing your symptoms and generating recommendations...</p>
          <Progress value={65} className="w-full max-w-md mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-primary" />
          AI Health Assessment
        </h1>
        <p className="text-muted-foreground">
          Get AI-powered health insights and recommendations based on your symptoms
        </p>
      </div>

      {/* Emergency Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Emergency Symptoms:</strong> If you experience chest pain, difficulty breathing, 
          severe bleeding, or loss of consciousness, call emergency services immediately.
        </AlertDescription>
      </Alert>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'checker' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('checker')}
          className="flex items-center gap-2"
          data-testid="tab-symptom-checker"
        >
          <Stethoscope className="h-4 w-4" />
          Symptom Checker
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2"
          data-testid="tab-assessment-history"
        >
          <FileText className="h-4 w-4" />
          Assessment History
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'checker' && (
        <>
          {!currentAssessment ? (
            <SymptomChecker
              questionnaires={(questionnairesData as any)?.questionnaires || []}
              onSubmit={handleSymptomSubmission}
              isLoading={createAssessmentMutation.isPending}
            />
          ) : (
            <AssessmentResults 
              assessment={currentAssessment}
              onNewAssessment={() => setCurrentAssessment(null)}
            />
          )}
        </>
      )}

      {activeTab === 'history' && (
        <AssessmentHistory 
          assessments={(assessmentsData as any)?.assessments || []}
          onViewAssessment={setCurrentAssessment}
        />
      )}
    </div>
  );
}

interface AssessmentResultsProps {
  assessment: HealthAssessment;
  onNewAssessment: () => void;
}

function AssessmentResults({ assessment, onNewAssessment }: AssessmentResultsProps) {
  const { aiAnalysis } = assessment;

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Heart className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Assessment Results
          </CardTitle>
          <CardDescription>
            AI analysis based on your symptoms from {new Date(assessment.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Emergency Warning */}
      {aiAnalysis.emergencyWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> {aiAnalysis.emergencyWarning}
          </AlertDescription>
        </Alert>
      )}

      {/* Urgency & Risk Score */}
      <Card>
        <CardHeader>
          <CardTitle>Health Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Urgency Level:</span>
            <Badge variant={getUrgencyColor(aiAnalysis.urgencyLevel)} className="flex items-center gap-1">
              {getUrgencyIcon(aiAnalysis.urgencyLevel)}
              {aiAnalysis.urgencyLevel.charAt(0).toUpperCase() + aiAnalysis.urgencyLevel.slice(1)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Risk Score:</span>
              <span className="font-bold">{aiAnalysis.riskScore}/100</span>
            </div>
            <Progress value={aiAnalysis.riskScore} className="w-full" />
          </div>

          {aiAnalysis.followUpDays && (
            <div className="flex items-center justify-between">
              <span className="font-medium">Recommended Follow-up:</span>
              <span>{aiAnalysis.followUpDays} days</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Possible Diagnoses */}
      <Card>
        <CardHeader>
          <CardTitle>Possible Conditions</CardTitle>
          <CardDescription>
            These are preliminary assessments. Consult a healthcare provider for proper diagnosis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {aiAnalysis.diagnosis.map((diagnosis, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{diagnosis}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {aiAnalysis.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessment.consultationRecommended && (
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                A healthcare consultation is recommended based on your symptoms.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Button onClick={onNewAssessment} data-testid="button-new-assessment">
              Start New Assessment
            </Button>
            {assessment.consultationRecommended && (
              <Button variant="outline" data-testid="button-book-consultation">
                Book Consultation
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Medical Disclaimer:</strong> This AI assessment is for informational purposes only 
          and should not replace professional medical advice, diagnosis, or treatment. Always consult 
          with a qualified healthcare provider for medical concerns.
        </AlertDescription>
      </Alert>
    </div>
  );
}