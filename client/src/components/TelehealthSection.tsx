import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TelehealthSectionProps {
  contactData: {
    name: string;
    phone: string;
    email: string;
    consent: boolean;
  };
  t: any;
  onOpenSickNote: () => void;
}

export default function TelehealthSection({ contactData, t, onOpenSickNote }: TelehealthSectionProps) {
  const { toast } = useToast();
  const [summaryChannel, setSummaryChannel] = useState<"sms" | "whatsapp" | "email">("sms");
  const [didScriptLoaded, setDidScriptLoaded] = useState<boolean | null>(null); // null = loading, true = success, false = fallback

  // Load D-ID script when component mounts with fallback
  useEffect(() => {
    const DID_CLIENT_KEY = import.meta.env.VITE_DID_CLIENT_KEY;
    const DID_AGENT_ID = import.meta.env.VITE_DID_AGENT_ID;

    // Listen for unhandled rejections from D-ID (setup outside loadDIDScript for proper cleanup)
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('Failed to fetch')) {
        console.warn('D-ID network error detected, falling back to local avatar');
        setDidScriptLoaded(false);
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // Initialization check function (used for both new and existing scripts)
    const checkInitialization = () => {
      setTimeout(() => {
        const container = document.getElementById('did-avatar-agent');
        if (container && container.children.length <= 1) {
          console.warn('D-ID agent failed to initialize, falling back to local avatar');
          setDidScriptLoaded(false);
        }
      }, 8000);
    };

    const loadDIDScript = () => {
      // Check if D-ID credentials are available
      if (!DID_CLIENT_KEY || !DID_AGENT_ID) {
        console.warn('D-ID credentials not configured, using fallback avatar interface');
        setTimeout(() => setDidScriptLoaded(false), 1000);
        return;
      }

      // Check if script already exists
      const existingScript = document.querySelector('script[src="https://agent.d-id.com/v2/index.js"]');
      if (existingScript) {
        setDidScriptLoaded(true);
        checkInitialization(); // Run init check even for existing scripts
        return;
      }

      // Create and configure the D-ID script
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://agent.d-id.com/v2/index.js';
      script.setAttribute('data-mode', 'full');
      script.setAttribute('data-client-key', DID_CLIENT_KEY);
      script.setAttribute('data-agent-id', DID_AGENT_ID);
      script.setAttribute('data-name', 'did-agent');
      script.setAttribute('data-monitor', 'true');
      script.setAttribute('data-target-id', 'did-avatar-agent');

      script.onload = () => {
        console.log('D-ID script loaded successfully');
        setDidScriptLoaded(true);
        checkInitialization();
      };

      script.onerror = (error) => {
        console.error('Failed to load D-ID script:', error);
        setDidScriptLoaded(false);
      };

      // Append to document head
      document.head.appendChild(script);
    };

    // Load script with a slight delay to ensure DOM is ready
    const timer = setTimeout(loadDIDScript, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telehealth/summary", {
        contactData,
        channel: summaryChannel,
        summaryType: "consultation"
      });
    },
    onSuccess: () => {
      toast({
        title: "Summary Sent",
        description: `Visit summary has been sent via ${summaryChannel.toUpperCase()}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send summary. Please try again.",
        variant: "destructive",
      });
    }
  });

  const generatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telehealth/prescription", {
        contactData,
        items: []
      });
    },
    onSuccess: async (response) => {
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast({
        title: "Prescription Generated",
        description: "E-prescription has been generated and opened in a new tab",
      });
    }
  });

  const voiceAgentUrl = import.meta.env.VITE_VOICE_AGENT_URL || "#";
  const calendarUrl = import.meta.env.VITE_CALENDAR_URL || "#";
  const doctorHandoffUrl = import.meta.env.VITE_DOCTOR_HANDOFF_URL || "#";

  return (
    <section className="space-y-8" data-testid="telehealth-section">
      {/* Service Hero */}
      <div className="medical-card rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{t.thTitle}</h2>
          <p className="text-lg text-white/90 mb-6">{t.thSub}</p>
          <div className="flex flex-wrap gap-4">
            <Button
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => window.open(voiceAgentUrl, "_blank")}
              data-testid="button-start-agent"
            >
              <i className="fas fa-microphone mr-2"></i>
              {t.startAgent}
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              onClick={() => window.open(calendarUrl, "_blank")}
              data-testid="button-schedule"
            >
              <i className="fas fa-calendar mr-2"></i>
              {t.scheduleNow}
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Agent and Avatar Consultation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card data-testid="voice-agent-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-microphone-alt text-primary"></i>
              Voice Agent Interface
            </h3>
            <div className="bg-muted/30 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 consultation-active">
                  <i className="fas fa-microphone text-primary-foreground text-xl"></i>
                </div>
                <p className="text-muted-foreground">Voice agent widget will embed here</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Integration with voice agent provider
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="avatar-consultation-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-user-md text-secondary"></i>
              Avatar Tele-Consultation
            </h3>
            <div 
              id="did-avatar-agent" 
              className="avatar-container rounded-lg p-0 min-h-[400px] border border-border overflow-hidden bg-background"
              data-testid="did-avatar-container"
            >
              {didScriptLoaded === false ? (
                // Fallback Avatar Interface
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <div className="text-center p-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <i className="fas fa-user-doctor text-white text-2xl"></i>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Dr. AI Assistant</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Voice-powered medical consultation available
                    </p>
                    <Button 
                      onClick={() => {
                        // Trigger voice agent interface (assuming it exists)
                        console.log('Starting voice consultation...');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="start-voice-consultation"
                    >
                      <i className="fas fa-microphone mr-2"></i>
                      Start Voice Consultation
                    </Button>
                    <p className="text-xs text-muted-foreground mt-3">
                      Powered by AI • Secure & Private
                    </p>
                  </div>
                </div>
              ) : didScriptLoaded === null ? (
                // Loading state
                <div className="flex items-center justify-center h-full">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading AI Avatar Agent...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Initializing virtual assistant
                    </p>
                  </div>
                </div>
              ) : (
                // D-ID will load here when working
                <div className="h-full" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consultation Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card data-testid="visit-summary-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-file-medical text-accent"></i>
              </div>
              <h3 className="font-semibold text-foreground">Visit Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <p className="text-muted-foreground">{t.visitSummaryDesc}</p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={summaryChannel}
                  onChange={(e) => setSummaryChannel(e.target.value as any)}
                  className="flex-1 px-2 py-1 text-xs border border-input rounded-md bg-background"
                  data-testid="select-summary-channel"
                >
                  <option value="sms">{t.sms}</option>
                  <option value="whatsapp">{t.whatsapp}</option>
                  <option value="email">{t.emailCh}</option>
                </select>
              </div>
              <Button
                className="w-full bg-accent hover:bg-accent/90"
                size="sm"
                onClick={() => sendSummaryMutation.mutate()}
                disabled={!contactData.consent || sendSummaryMutation.isPending}
                data-testid="button-send-summary"
              >
                {sendSummaryMutation.isPending ? "Sending..." : t.sendSummary}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="prescription-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-prescription-bottle text-primary"></i>
              </div>
              <h3 className="font-semibold text-foreground">E-Prescription</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <p className="text-muted-foreground">{t.ePrescriptionDesc}</p>
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                size="sm"
                onClick={() => generatePrescriptionMutation.mutate()}
                disabled={generatePrescriptionMutation.isPending}
                data-testid="button-generate-prescription"
              >
                {generatePrescriptionMutation.isPending ? "Generating..." : t.genErx}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="sick-note-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
                <i className="fas fa-file-medical-alt text-secondary"></i>
              </div>
              <h3 className="font-semibold text-foreground">Sick Note</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-muted/50 p-3 rounded-md text-sm">
                <p className="text-muted-foreground">{t.sickNoteDesc}</p>
              </div>
              <Button
                className="w-full bg-secondary hover:bg-secondary/90"
                size="sm"
                onClick={onOpenSickNote}
                data-testid="button-sick-note"
              >
                {t.sickNote}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor Handoff */}
      <Card data-testid="doctor-handoff-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <i className="fas fa-user-doctor text-primary text-xl"></i>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{t.doctorHandoffTitle}</h3>
              <p className="text-muted-foreground">{t.doctorHandoffDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => window.open(doctorHandoffUrl, "_blank")}
              data-testid="button-book-doctor"
            >
              <i className="fas fa-calendar-check mr-2"></i>
              {t.bookDoctor}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(doctorHandoffUrl, "_blank")}
              data-testid="button-emergency"
            >
              <i className="fas fa-phone mr-2"></i>
              {t.emergencyConsult}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
