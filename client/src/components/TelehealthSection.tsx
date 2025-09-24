// import { useState, useEffect } from "react";
// import { useMutation } from "@tanstack/react-query";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { useToast } from "@/hooks/use-toast";
// import { apiRequest } from "@/lib/queryClient";

// interface TelehealthSectionProps {
//   contactData: {
//     name: string;
//     phone: string;
//     email: string;
//     consent: boolean;
//   };
//   t: any;
//   onOpenSickNote: () => void;
// }

// export default function TelehealthSection({ contactData, t, onOpenSickNote }: TelehealthSectionProps) {
//   const { toast } = useToast();
//   const [summaryChannel, setSummaryChannel] = useState<"sms" | "whatsapp" | "email">("sms");

//   const sendSummaryMutation = useMutation({
//     mutationFn: async () => {
//       return apiRequest("POST", "/api/telehealth/summary", {
//         contactData,
//         channel: summaryChannel,
//         summaryType: "consultation"
//       });
//     },
//     onSuccess: () => {
//       toast({
//         title: "Summary Sent",
//         description: `Visit summary has been sent via ${summaryChannel.toUpperCase()}`,
//       });
//     },
//     onError: () => {
//       toast({
//         title: "Error",
//         description: "Failed to send summary. Please try again.",
//         variant: "destructive",
//       });
//     }
//   });

//   const generatePrescriptionMutation = useMutation({
//     mutationFn: async () => {
//       return apiRequest("POST", "/api/telehealth/prescription", {
//         contactData,
//         items: []
//       });
//     },
//     onSuccess: async (response) => {
//       const htmlContent = await response.text();
//       const blob = new Blob([htmlContent], { type: "text/html" });
//       const url = URL.createObjectURL(blob);
//       window.open(url, "_blank");
//       toast({
//         title: "Prescription Generated",
//         description: "E-prescription has been generated and opened in a new tab",
//       });
//     }
//   });

//   const voiceAgentUrl = import.meta.env.VITE_VOICE_AGENT_URL || "#";
//   const calendarUrl = import.meta.env.VITE_CALENDAR_URL || "#";
//   const doctorHandoffUrl = import.meta.env.VITE_DOCTOR_HANDOFF_URL || "#";

//   return (
//     <section className="space-y-8" data-testid="telehealth-section">
//       {/* Service Hero */}
//       <div className="medical-card rounded-2xl p-8 text-white">
//         <div className="max-w-2xl">
//           <h2 className="text-3xl font-bold mb-4">{t.thTitle}</h2>
//           <p className="text-lg text-white/90 mb-6">{t.thSub}</p>
//           <div className="flex flex-wrap gap-4">
//             <Button
//               className="bg-white text-primary hover:bg-white/90"
//               onClick={() => window.open(voiceAgentUrl, "_blank")}
//               data-testid="button-start-agent"
//             >
//               <i className="fas fa-microphone mr-2"></i>
//               {t.startAgent}
//             </Button>
//             <Button
//               variant="outline"
//               className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
//               onClick={() => window.open(calendarUrl, "_blank")}
//               data-testid="button-schedule"
//             >
//               <i className="fas fa-calendar mr-2"></i>
//               {t.scheduleNow}
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Voice Agent and Avatar Consultation */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
//         <Card data-testid="voice-agent-card">
//           <CardContent className="p-6">
//             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
//               <i className="fas fa-microphone-alt text-primary"></i>
//               Voice Agent Interface
//             </h3>
//             <div className="bg-muted/30 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
//               <div className="text-center">
//                 <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 consultation-active">
//                   <i className="fas fa-microphone text-primary-foreground text-xl"></i>
//                 </div>
//                 <p className="text-muted-foreground">Voice agent widget will embed here</p>
//                 <p className="text-xs text-muted-foreground mt-2">
//                   Integration with voice agent provider
//                 </p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         <Card data-testid="avatar-consultation-card">
//           <CardContent className="p-6">
//             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
//               <i className="fas fa-user-md text-secondary"></i>
//               Avatar Tele-Consultation
//             </h3>
//             <div
//               className="avatar-container rounded-lg p-0 min-h-[400px] border border-border overflow-hidden bg-background"
//               data-testid="did-avatar-container"
//             >
//               {/* Direct iframe embed as alternative to script integration */}
//               <iframe
//                 src="https://agent.d-id.com/v2/index.html?client-key=YXV0aDB8NjhjZDMzZmIyZmJmN2RmMjY0ODkzOTA2OnFyVjFwWDlaWkktUk1JRUhDVVowNA==&agent-id=v2_agt_rlPFem2o"
//                 className="w-full h-full border-0 rounded-lg"
//                 allow="microphone; camera"
//                 title="D-ID Avatar Agent"
//                 onLoad={() => console.log('D-ID iframe loaded')}
//                 onError={() => console.log('D-ID iframe failed to load')}
//               />
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Consultation Tools */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         <Card data-testid="visit-summary-card">
//           <CardContent className="p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
//                 <i className="fas fa-file-medical text-accent"></i>
//               </div>
//               <h3 className="font-semibold text-foreground">Visit Summary</h3>
//             </div>
//             <div className="space-y-3">
//               <div className="bg-muted/50 p-3 rounded-md text-sm">
//                 <p className="text-muted-foreground">{t.visitSummaryDesc}</p>
//               </div>
//               <div className="flex items-center gap-2 mb-2">
//                 <select
//                   value={summaryChannel}
//                   onChange={(e) => setSummaryChannel(e.target.value as any)}
//                   className="flex-1 px-2 py-1 text-xs border border-input rounded-md bg-background"
//                   data-testid="select-summary-channel"
//                 >
//                   <option value="sms">{t.sms}</option>
//                   <option value="whatsapp">{t.whatsapp}</option>
//                   <option value="email">{t.emailCh}</option>
//                 </select>
//               </div>
//               <Button
//                 className="w-full bg-accent hover:bg-accent/90"
//                 size="sm"
//                 onClick={() => sendSummaryMutation.mutate()}
//                 disabled={!contactData.consent || sendSummaryMutation.isPending}
//                 data-testid="button-send-summary"
//               >
//                 {sendSummaryMutation.isPending ? "Sending..." : t.sendSummary}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>

//         <Card data-testid="prescription-card">
//           <CardContent className="p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
//                 <i className="fas fa-prescription-bottle text-primary"></i>
//               </div>
//               <h3 className="font-semibold text-foreground">E-Prescription</h3>
//             </div>
//             <div className="space-y-3">
//               <div className="bg-muted/50 p-3 rounded-md text-sm">
//                 <p className="text-muted-foreground">{t.ePrescriptionDesc}</p>
//               </div>
//               <Button
//                 className="w-full bg-primary hover:bg-primary/90"
//                 size="sm"
//                 onClick={() => generatePrescriptionMutation.mutate()}
//                 disabled={generatePrescriptionMutation.isPending}
//                 data-testid="button-generate-prescription"
//               >
//                 {generatePrescriptionMutation.isPending ? "Generating..." : t.genErx}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>

//         <Card data-testid="sick-note-card">
//           <CardContent className="p-6">
//             <div className="flex items-center gap-3 mb-4">
//               <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
//                 <i className="fas fa-file-medical-alt text-secondary"></i>
//               </div>
//               <h3 className="font-semibold text-foreground">Sick Note</h3>
//             </div>
//             <div className="space-y-3">
//               <div className="bg-muted/50 p-3 rounded-md text-sm">
//                 <p className="text-muted-foreground">{t.sickNoteDesc}</p>
//               </div>
//               <Button
//                 className="w-full bg-secondary hover:bg-secondary/90"
//                 size="sm"
//                 onClick={onOpenSickNote}
//                 data-testid="button-sick-note"
//               >
//                 {t.sickNote}
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Doctor Handoff */}
//       <Card data-testid="doctor-handoff-card">
//         <CardContent className="p-6">
//           <div className="flex items-center gap-3 mb-6">
//             <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
//               <i className="fas fa-user-doctor text-primary text-xl"></i>
//             </div>
//             <div>
//               <h3 className="text-lg font-semibold text-foreground">{t.doctorHandoffTitle}</h3>
//               <p className="text-muted-foreground">{t.doctorHandoffDesc}</p>
//             </div>
//           </div>
//           <div className="flex flex-wrap gap-4">
//             <Button
//               className="bg-primary hover:bg-primary/90"
//               onClick={() => window.open(doctorHandoffUrl, "_blank")}
//               data-testid="button-book-doctor"
//             >
//               <i className="fas fa-calendar-check mr-2"></i>
//               {t.bookDoctor}
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => window.open(doctorHandoffUrl, "_blank")}
//               data-testid="button-emergency"
//             >
//               <i className="fas fa-phone mr-2"></i>
//               {t.emergencyConsult}
//             </Button>
//           </div>
//         </CardContent>
//       </Card>
//     </section>
//   );
// }

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RetellWebClient } from "retell-client-js-sdk";

/** ==== ENV (URLs) ===== */
const VOICE_AGENT_URL = import.meta.env.VITE_VOICE_AGENT_URL || "#";
const CALENDAR_URL = import.meta.env.VITE_CALENDAR_URL || "#";
const DOCTOR_HANDOFF_URL = import.meta.env.VITE_DOCTOR_HANDOFF_URL || "#";

/** ===== D-ID config (env) ===== */
const DID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_DID_PUBLIC_KEY ||
  "YXV0aDB8NjhkMDdlOTE4M2NmNGQzZTQ1MjhkOWQ5Okpnb2tyaVNkY0RjSlVDTG9FYnVibw==";
const DID_AGENT_ID =
  (import.meta as any).env?.VITE_DID_AGENT_ID || "v2_agt_AqsNAlRU";

/** ===== Retell config (env) ===== */
const RETELL_API_KEY =
  (import.meta as any).env?.VITE_RETELL_API_KEY ||
  "key_98fef97480c54d6bf0698564addb"; // dev fallback
const RETELL_AGENT_ID =
  (import.meta as any).env?.VITE_RETELL_AGENT_ID ||
  "agent_289aab3b3b0f0c434fb2e5a4e5"; // dev fallback

/** ===== Types ===== */
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

type CallStatus = "not-started" | "active" | "inactive";
type TranscriptMsg = { role: "agent" | "user" | "assistant"; content: string };

/** ===== Retell helpers ===== */
const retellClient = new RetellWebClient();

async function registerRetellCall(
  agentId: string,
  userCtx: { name: string; email: string },
): Promise<{ access_token: string; call_id: string; sampleRate: number }> {
  const sampleRate = 16000;
  const resp = await fetch("https://api.retellai.com/v2/create-web-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RETELL_API_KEY}`,
    },
    body: JSON.stringify({
      agent_id: agentId,
      retell_llm_dynamic_variables: {
        member_name: userCtx.name,
        email: userCtx.email,
      },
    }),
  });
  if (!resp.ok) throw new Error(`Retell register failed: ${resp.status}`);
  const data = await resp.json();
  return { access_token: data.access_token, call_id: data.call_id, sampleRate };
}

/** ===== Component ===== */
export default function TelehealthSectionIntegrated({
  contactData,
  t,
  onOpenSickNote,
}: TelehealthSectionProps) {
  const { toast } = useToast();

  // === Visit Summary channel ===
  const [summaryChannel, setSummaryChannel] = useState<
    "sms" | "whatsapp" | "email"
  >("sms");

  // === Retell state ===
  const [callStatus, setCallStatus] = useState<CallStatus>("not-started");
  const [callInProgress, setCallInProgress] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([]);
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // === Avatar state ===
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // === react-query mutations (as in your upper code) ===
  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telehealth/summary", {
        contactData,
        channel: summaryChannel,
        summaryType: "consultation",
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
    },
  });

  const generatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/telehealth/prescription", {
        contactData,
        items: [],
      });
    },
    onSuccess: async (response: Response) => {
      const htmlContent = await response.text();
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      toast({
        title: "Prescription Generated",
        description:
          "E-prescription has been generated and opened in a new tab",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate prescription.",
        variant: "destructive",
      });
    },
  });

  // === Retell event listeners & cleanup ===
  useEffect(() => {
    const onStarted = () => {
      setCallStatus("active");
      setCallInProgress(false);
    };
    const onEnded = () => {
      setCallStatus("inactive");
      setCallInProgress(false);
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    };
    const onError = () => {
      setCallStatus("inactive");
      setCallInProgress(false);
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    };
    const onUpdate = (update: any) => {
      if (!update?.transcript) return;
      if (Array.isArray(update.transcript)) {
        setTranscript(update.transcript);
      } else if (typeof update.transcript === "object") {
        setTranscript([update.transcript]);
      } else if (typeof update.transcript === "string") {
        const msgs: TranscriptMsg[] = update.transcript
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => ({ role: "assistant", content: line.trim() }));
        setTranscript(msgs);
      }
    };

    retellClient.on("conversationStarted", onStarted);
    retellClient.on("conversationEnded", onEnded);
    retellClient.on("error", onError);
    retellClient.on("update", onUpdate);

    // Ensure call/mic stops on page unload
    const handleBeforeUnload = () => {
      try {
        (retellClient as any).stopCall?.();
      } catch {}
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      retellClient.off("conversationStarted", onStarted);
      retellClient.off("conversationEnded", onEnded);
      retellClient.off("error", onError);
      retellClient.off("update", onUpdate);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  // === Auto-scroll transcript ===
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // === Start/End Retell call (wired to the Voice Agent card) ===
  const toggleCall = async () => {
    if (callInProgress) return;
    setCallInProgress(true);

    if (callStatus === "active") {
      // End call
      try {
        if (typeof (retellClient as any).stopCall === "function") {
          await (retellClient as any).stopCall();
        } else if (typeof (retellClient as any).endCall === "function") {
          await (retellClient as any).endCall();
        }
      } catch (e) {
        console.error("Retell stop error:", e);
      } finally {
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch {}
        mediaStreamRef.current = null;
        setCallStatus("inactive");
        setCallInProgress(false);
      }
      return;
    }

    // Start call
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      if (!RETELL_API_KEY) {
        throw new Error("Missing Retell API key. Set VITE_RETELL_API_KEY");
      }
      const reg = await registerRetellCall(RETELL_AGENT_ID, {
        name: contactData?.name || "",
        email: contactData?.email || "",
      });

      await retellClient.startCall({
        accessToken: reg.access_token,
        callId: reg.call_id,
        sampleRate: reg.sampleRate,
        enableUpdate: true,
        // If SDK supports passing a stream, add: mediaStream: stream,
      });

      setCallStatus("active");
    } catch (e) {
      console.error("Error starting call:", e);
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
      setCallStatus("inactive");
    } finally {
      setCallInProgress(false);
    }
  };

  // === Iframe src for D-ID avatar (uses env keys) ===
  const avatarSrc = useMemo(() => {
    const url = new URL("https://agent.d-id.com/v2/index.html");
    url.searchParams.set("client-key", DID_PUBLIC_KEY);
    url.searchParams.set("agent-id", DID_AGENT_ID);
    return url.toString();
  }, []);

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
              onClick={() => window.open(VOICE_AGENT_URL, "_blank")}
              data-testid="button-start-agent"
            >
              <i className="fas fa-microphone mr-2"></i>
              {t.startAgent}
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              onClick={() => window.open(CALENDAR_URL, "_blank")}
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
        {/* Voice Agent Card (Retell) */}
        <Card data-testid="voice-agent-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-microphone-alt text-primary"></i>
              Voice Agent Interface
              <span className="ml-auto flex items-center gap-2 text-xs">
                <span
                  className={`inline-block w-2.5 h-2.5 rounded-full ${
                    callStatus === "active" ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                {callStatus === "active" ? "Live" : "Idle"}
              </span>
            </h3>

            {/* Inline mic button */}
            <div className="mb-4">
              <Button
                className={`${
                  callStatus === "active"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary hover:bg-primary/90"
                }`}
                onClick={toggleCall}
                disabled={callInProgress}
              >
                <i
                  className={`fas ${callStatus === "active" ? "fa-stop" : "fa-play"} mr-2`}
                />
                {callStatus === "active"
                  ? (t.endCall ?? "End Voice Agent")
                  : callInProgress
                    ? (t.loadingAgent ?? "Starting…")
                    : (t.startCall ?? "Start Voice Agent")}
              </Button>
            </div>

            {/* Transcript */}
            <div
              ref={transcriptRef}
              className="h-64 overflow-auto border border-gray-200 rounded-xl p-4 bg-muted/30"
            >
              {transcript.length ? (
                <div className="space-y-3">
                  {transcript.map((m, idx) => {
                    const isAgent =
                      m.role === "agent" || m.role === "assistant";
                    return (
                      <div
                        key={idx}
                        className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                          isAgent
                            ? "bg-white text-foreground border border-gray-200"
                            : "bg-primary text-primary-foreground ml-auto"
                        }`}
                      >
                        <div className="text-[10px] opacity-60 mb-0.5">
                          {isAgent ? "Agent" : "Patient"}
                        </div>
                        <div className="text-sm leading-relaxed">
                          {m.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full grid place-items-center text-muted-foreground text-sm">
                  {callStatus === "active"
                    ? "Listening… Speak now."
                    : 'No messages yet. Click "Start Voice Agent" to begin.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Avatar Card (D-ID) */}
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
              <iframe
                src={avatarSrc}
                className="w-full h-full border-0 rounded-lg"
                allow="microphone; camera"
                title="D-ID Avatar Agent"
                onLoad={() => {
                  setAvatarLoaded(true);
                  setAvatarError(null);
                  console.log("D-ID iframe loaded");
                }}
                onError={() => {
                  setAvatarLoaded(false);
                  setAvatarError("Failed to load");
                  console.log("D-ID iframe failed to load");
                }}
              />
            </div>
            {!avatarLoaded && !avatarError && (
              <p className="text-xs text-muted-foreground mt-2">
                {t.loadingAvatar ?? "Loading avatar…"}
              </p>
            )}
            {avatarError && (
              <p className="text-xs text-red-500 mt-2">
                Avatar failed to load. Check keys / network / CSP.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consultation Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Visit Summary */}
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

        {/* E-Prescription */}
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
                {generatePrescriptionMutation.isPending
                  ? "Generating..."
                  : t.genErx}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sick Note */}
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
              <h3 className="text-lg font-semibold text-foreground">
                {t.doctorHandoffTitle}
              </h3>
              <p className="text-muted-foreground">{t.doctorHandoffDesc}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => window.open(DOCTOR_HANDOFF_URL, "_blank")}
              data-testid="button-book-doctor"
            >
              <i className="fas fa-calendar-check mr-2"></i>
              {t.bookDoctor}
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(DOCTOR_HANDOFF_URL, "_blank")}
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
