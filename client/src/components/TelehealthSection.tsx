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
              className="avatar-container rounded-lg p-0 min-h-[400px] border border-border overflow-hidden bg-background"
              data-testid="did-avatar-container"
            >
              {/* Direct iframe embed as alternative to script integration */}
              <iframe
                src="https://agent.d-id.com/v2/index.html?client-key=YXV0aDB8NjhjZDMzZmIyZmJmN2RmMjY0ODkzOTA2OnFyVjFwWDlaWkktUk1JRUhDVVowNA==&agent-id=v2_agt_rlPFem2o"
                className="w-full h-full border-0 rounded-lg"
                allow="microphone; camera"
                title="D-ID Avatar Agent"
                onLoad={() => console.log('D-ID iframe loaded')}
                onError={() => console.log('D-ID iframe failed to load')}
              />
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
