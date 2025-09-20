import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Thermometer, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Activity,
  Brain
} from 'lucide-react';

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

interface SymptomCheckerProps {
  questionnaires: Questionnaire[];
  onSubmit: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function SymptomChecker({ questionnaires, onSubmit, isLoading }: SymptomCheckerProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [symptomSeverity, setSymptomSeverity] = useState<Record<string, number>>({});
  const [symptomDuration, setSymptomDuration] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'symptoms' | 'details' | 'review'>('symptoms');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [temperature, setTemperature] = useState('');

  const { register, handleSubmit, setValue, watch } = useForm();

  // Get the symptom checker questionnaire
  const symptomQuestionnaire = questionnaires.find(q => q.id === 'symptom_checker');
  const symptomsQuestion = symptomQuestionnaire?.questions.find(q => q.id === 'primary_symptoms');

  const commonSymptoms = symptomsQuestion?.options || [
    'Headache', 'Fever', 'Cough', 'Sore throat', 'Fatigue',
    'Nausea', 'Vomiting', 'Diarrhea', 'Abdominal pain',
    'Chest pain', 'Difficulty breathing', 'Dizziness',
    'Muscle aches', 'Joint pain', 'Skin rash'
  ];

  const emergencySymptoms = [
    'Chest pain', 'Difficulty breathing', 'Severe bleeding', 
    'Loss of consciousness', 'Severe allergic reaction'
  ];

  const durationOptions = [
    'Less than 24 hours',
    '1-3 days',
    '4-7 days', 
    '1-2 weeks',
    'More than 2 weeks'
  ];

  const temperatureOptions = [
    'No fever (under 100°F/37.8°C)',
    'Low fever (100-101°F/37.8-38.3°C)',
    'Moderate fever (101-103°F/38.3-39.4°C)',
    'High fever (over 103°F/39.4°C)',
    'Haven\'t measured'
  ];

  const handleSymptomToggle = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const isSelected = prev.includes(symptom);
      if (isSelected) {
        // Remove symptom and its associated data
        const newSymptoms = prev.filter(s => s !== symptom);
        setSymptomSeverity(prevSev => {
          const newSev = { ...prevSev };
          delete newSev[symptom];
          return newSev;
        });
        setSymptomDuration(prevDur => {
          const newDur = { ...prevDur };
          delete newDur[symptom];
          return newDur;
        });
        return newSymptoms;
      } else {
        return [...prev, symptom];
      }
    });
  };

  const handleSeverityChange = (symptom: string, severity: number[]) => {
    setSymptomSeverity(prev => ({
      ...prev,
      [symptom]: severity[0]
    }));
  };

  const handleDurationChange = (symptom: string, duration: string) => {
    setSymptomDuration(prev => ({
      ...prev,
      [symptom]: duration
    }));
  };

  const canProceedToDetails = selectedSymptoms.length > 0;
  const canProceedToReview = selectedSymptoms.length > 0 && selectedSymptoms.every(symptom => 
    symptomSeverity[symptom] !== undefined && symptomDuration[symptom] !== undefined && symptomDuration[symptom] !== ''
  );

  const hasEmergencySymptoms = selectedSymptoms.some(symptom =>
    emergencySymptoms.some(emergency => 
      symptom.toLowerCase().includes(emergency.toLowerCase())
    )
  );

  const handleFinalSubmit = async () => {
    try {
      await onSubmit({
        assessmentType: 'symptom_check',
        symptoms: selectedSymptoms,
        severity: symptomSeverity,
        duration: symptomDuration,
        additionalInfo,
        responses: {
          temperature,
          additional_info: additionalInfo
        }
      });
    } catch (error) {
      console.error('Error submitting assessment:', error);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center space-x-2 mb-6">
      {['symptoms', 'details', 'review'].map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${currentStep === step ? 'bg-primary text-primary-foreground' : 
              ['symptoms', 'details'].includes(step) && currentStep === 'review' ? 'bg-green-500 text-white' :
              'bg-muted text-muted-foreground'}
          `}>
            {currentStep === step ? (index + 1) : 
             ['symptoms', 'details'].includes(step) && currentStep === 'review' ? '✓' : (index + 1)}
          </div>
          {index < 2 && (
            <div className={`w-12 h-0.5 mx-2 ${
              currentStep === 'review' || (currentStep === 'details' && step === 'symptoms') 
                ? 'bg-green-500' : 'bg-muted'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  if (currentStep === 'symptoms') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Select Your Symptoms
          </CardTitle>
          <CardDescription>
            Choose all symptoms you are currently experiencing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepIndicator()}

          {hasEmergencySymptoms && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have selected symptoms that may require immediate medical attention. 
                Please consider seeking emergency care if symptoms are severe.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonSymptoms.map((symptom) => (
              <div key={symptom} className="flex items-center space-x-2">
                <Checkbox
                  id={symptom}
                  checked={selectedSymptoms.includes(symptom)}
                  onCheckedChange={() => handleSymptomToggle(symptom)}
                  data-testid={`symptom-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <Label 
                  htmlFor={symptom} 
                  className={`text-sm cursor-pointer ${
                    emergencySymptoms.some(emergency => 
                      symptom.toLowerCase().includes(emergency.toLowerCase())
                    ) ? 'text-red-600 font-medium' : ''
                  }`}
                >
                  {symptom}
                </Label>
              </div>
            ))}
          </div>

          {selectedSymptoms.length > 0 && (
            <div className="space-y-2">
              <p className="font-medium">Selected symptoms:</p>
              <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary">
                    {symptom}
                    <button
                      onClick={() => handleSymptomToggle(symptom)}
                      className="ml-2 hover:text-destructive"
                      data-testid={`remove-symptom-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={() => setCurrentStep('details')}
              disabled={!canProceedToDetails}
              data-testid="button-proceed-to-details"
            >
              Continue to Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'details') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Symptom Details
          </CardTitle>
          <CardDescription>
            Provide details about each symptom's severity and duration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepIndicator()}

          <div className="space-y-6">
            {selectedSymptoms.map((symptom) => (
              <Card key={symptom} className="p-4">
                <h4 className="font-medium mb-4">{symptom}</h4>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Severity (1 = mild, 10 = severe): {symptomSeverity[symptom] || 5}
                    </Label>
                    <Slider
                      value={[symptomSeverity[symptom] || 5]}
                      onValueChange={(value) => handleSeverityChange(symptom, value)}
                      max={10}
                      min={1}
                      step={1}
                      className="w-full"
                      data-testid={`severity-slider-${symptom.toLowerCase().replace(/\s+/g, '-')}`}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Duration</Label>
                    <RadioGroup
                      value={symptomDuration[symptom] || ''}
                      onValueChange={(value) => handleDurationChange(symptom, value)}
                    >
                      {durationOptions.map((duration) => (
                        <div key={duration} className="flex items-center space-x-2">
                          <RadioGroupItem 
                            value={duration} 
                            id={`${symptom}-${duration}`}
                            data-testid={`duration-${symptom.toLowerCase().replace(/\s+/g, '-')}-${duration.toLowerCase().replace(/\s+/g, '-')}`}
                          />
                          <Label htmlFor={`${symptom}-${duration}`} className="text-sm">
                            {duration}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Temperature Status
              </Label>
              <RadioGroup value={temperature} onValueChange={setTemperature}>
                {temperatureOptions.map((temp) => (
                  <div key={temp} className="flex items-center space-x-2">
                    <RadioGroupItem value={temp} id={temp} data-testid={`temperature-${temp.toLowerCase().replace(/\s+/g, '-')}`} />
                    <Label htmlFor={temp} className="text-sm">{temp}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="additional-info" className="text-sm font-medium mb-2 block">
                Additional Information (Optional)
              </Label>
              <Textarea
                id="additional-info"
                placeholder="Describe any other symptoms, relevant medical history, or concerns..."
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3}
                data-testid="input-additional-info"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('symptoms')}
              data-testid="button-back-to-symptoms"
            >
              Back
            </Button>
            <Button 
              onClick={() => setCurrentStep('review')}
              disabled={!canProceedToReview}
              data-testid="button-proceed-to-review"
            >
              Review & Submit
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'review') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Review Your Assessment
          </CardTitle>
          <CardDescription>
            Please review your information before submitting for AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepIndicator()}

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Symptoms ({selectedSymptoms.length})</h4>
              <div className="space-y-2">
                {selectedSymptoms.map((symptom) => (
                  <div key={symptom} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">{symptom}</span>
                    <div className="text-sm text-muted-foreground">
                      Severity: {symptomSeverity[symptom]}/10 • Duration: {symptomDuration[symptom]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {temperature && (
              <div>
                <h4 className="font-medium mb-2">Temperature</h4>
                <p className="text-sm text-muted-foreground">{temperature}</p>
              </div>
            )}

            {additionalInfo && (
              <div>
                <h4 className="font-medium mb-2">Additional Information</h4>
                <p className="text-sm text-muted-foreground">{additionalInfo}</p>
              </div>
            )}
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This assessment will be analyzed by AI to provide health insights. 
              Results are for informational purposes only and do not replace professional medical advice.
            </AlertDescription>
          </Alert>

          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('details')}
              data-testid="button-back-to-details"
            >
              Back to Edit
            </Button>
            <Button 
              onClick={handleFinalSubmit}
              disabled={isLoading}
              data-testid="button-submit-assessment"
            >
              {isLoading ? 'Analyzing...' : 'Submit for AI Analysis'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}