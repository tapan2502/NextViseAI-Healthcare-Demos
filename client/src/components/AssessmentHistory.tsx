import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Heart
} from 'lucide-react';

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

interface AssessmentHistoryProps {
  assessments: HealthAssessment[];
  onViewAssessment: (assessment: HealthAssessment) => void;
}

export function AssessmentHistory({ assessments, onViewAssessment }: AssessmentHistoryProps) {
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

  const getAssessmentTypeDisplay = (type: string) => {
    switch (type) {
      case 'symptom_check':
        return 'Symptom Check';
      case 'wellness_check':
        return 'Wellness Check';
      case 'risk_assessment':
        return 'Risk Assessment';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  if (assessments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment History
          </CardTitle>
          <CardDescription>
            Your previous health assessments will appear here
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No assessments yet</h3>
          <p className="text-muted-foreground mb-4">
            Start your first health assessment to track your health over time
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            data-testid="button-start-first-assessment"
          >
            Start Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assessment History
          </CardTitle>
          <CardDescription>
            View and track your previous health assessments
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {assessments.map((assessment) => (
          <Card key={assessment.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {getAssessmentTypeDisplay(assessment.assessmentType)}
                  </CardTitle>
                  <CardDescription>
                    {new Date(assessment.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </CardDescription>
                </div>
                <Badge 
                  variant={getUrgencyColor(assessment.aiAnalysis.urgencyLevel)} 
                  className="flex items-center gap-1"
                >
                  {getUrgencyIcon(assessment.aiAnalysis.urgencyLevel)}
                  {assessment.aiAnalysis.urgencyLevel.charAt(0).toUpperCase() + 
                   assessment.aiAnalysis.urgencyLevel.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Symptoms Summary */}
              <div>
                <h4 className="font-medium mb-2">Symptoms ({assessment.symptoms.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {assessment.symptoms.slice(0, 4).map((symptom) => (
                    <Badge key={symptom} variant="outline" className="text-xs">
                      {symptom}
                    </Badge>
                  ))}
                  {assessment.symptoms.length > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{assessment.symptoms.length - 4} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span>Risk Score: {assessment.aiAnalysis.riskScore}/100</span>
                </div>
                
                {assessment.aiAnalysis.followUpDays && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Follow-up: {assessment.aiAnalysis.followUpDays} days</span>
                  </div>
                )}

                {assessment.consultationRecommended && (
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-red-600">Consultation Recommended</span>
                  </div>
                )}
              </div>

              {/* Primary Diagnosis */}
              {assessment.aiAnalysis.diagnosis.length > 0 && (
                <div>
                  <h4 className="font-medium mb-1">Primary Assessment</h4>
                  <p className="text-sm text-muted-foreground">
                    {assessment.aiAnalysis.diagnosis[0]}
                    {assessment.aiAnalysis.diagnosis.length > 1 && 
                      ` (and ${assessment.aiAnalysis.diagnosis.length - 1} other${
                        assessment.aiAnalysis.diagnosis.length > 2 ? 's' : ''
                      })`
                    }
                  </p>
                </div>
              )}

              {/* Emergency Warning */}
              {assessment.aiAnalysis.emergencyWarning && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">
                      {assessment.aiAnalysis.emergencyWarning}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onViewAssessment(assessment)}
                  data-testid={`button-view-assessment-${assessment.id}`}
                >
                  View Details
                </Button>
                
                {assessment.consultationRecommended && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    data-testid={`button-book-consultation-${assessment.id}`}
                  >
                    Book Consultation
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {assessments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{assessments.length}</p>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
              </div>
              
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(
                    assessments.reduce((sum, a) => sum + a.aiAnalysis.riskScore, 0) / 
                    assessments.length
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  {assessments.filter(a => a.consultationRecommended).length}
                </p>
                <p className="text-sm text-muted-foreground">Consultations Recommended</p>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  {assessments.filter(a => a.followUpRequired).length}
                </p>
                <p className="text-sm text-muted-foreground">Follow-ups Required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}