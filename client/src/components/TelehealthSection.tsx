import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
// import { apiRequest } from "@/lib/queryClient"; // ⬅️ Not needed now that we generate PDF client-side
import { RetellWebClient } from "retell-client-js-sdk";

/** === NEW: PDF libs (client-side) === */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

/** ===== Webhook (env) ===== */
const WEBHOOK_URL =
  (import.meta as any).env?.VITE_SUMMARY_WEBHOOK_URL ||
  "https://hook.us2.make.com/qsoqu0ftv2du42qn02bm1q33gybaeiww"; // set in .env

/** ===== D-ID (script embed) ===== */
const DID_TARGET_ID = "did-container";
const DID_SRC = "https://agent.d-id.com/v2/index.js";

/** ========= D-ID helpers (Fix A) ========= */

/** Wait until the D-ID SDK has mounted content into the target container */
function waitForChildMount(containerId: string, timeout = 6000) {
  return new Promise<void>((resolve, reject) => {
    const container = document.getElementById(containerId);
    if (!container) return reject(new Error("Missing DID container"));
    if (container.children.length > 0) return resolve();

    const observer = new MutationObserver(() => {
      if (container.children.length > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(container, { childList: true });

    const t = setTimeout(() => {
      observer.disconnect();
      reject(new Error("D-ID did not mount in time"));
    }, timeout);
  });
}

/** Load (or reload) the D-ID module with a cache-buster to force execution */
function loadDidScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.type = "module";
    s.src = `${DID_SRC}?cb=${Date.now()}`;
    s.setAttribute("data-mode", "full");
    s.setAttribute("data-client-key", DID_PUBLIC_KEY);
    s.setAttribute("data-agent-id", DID_AGENT_ID);
    s.setAttribute("data-name", "did-agent");
    s.setAttribute("data-monitor", "true");
    s.setAttribute("data-target-id", DID_TARGET_ID);

    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load D-ID agent script"));
    document.body.appendChild(s);
  });
}

/** Remove any mounted player and all prior copies of the script */
function unloadDid(): void {
  // 1) Reset the container (removes mounted player/iframe/etc.)
  const container = document.getElementById(DID_TARGET_ID);
  if (container && container.parentNode) {
    const fresh = container.cloneNode(false) as HTMLElement;
    fresh.id = DID_TARGET_ID;
    container.parentNode.replaceChild(fresh, container);
  }
  // 2) Remove all D-ID script tags
  Array.from(document.scripts)
    .filter((s) => s.src.includes("agent.d-id.com/v2/index.js"))
    .forEach((s) => s.parentNode?.removeChild(s));
}

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

/** ===== Webhook payload builder ===== */
function buildWebhookPayload(opts: {
  contactData: TelehealthSectionProps["contactData"];
  summaryChannel: "sms" | "whatsapp" | "email";
  transcript: TranscriptMsg[];
  callStatus: CallStatus;
  t: any;
}) {
  const { contactData, summaryChannel, transcript, callStatus, t } = opts;

  return {
    source: "telehealth-ui",
    timestamp: new Date().toISOString(),
    lang: t?.lang ?? "en",
    patient: {
      name: contactData.name,
      phone: contactData.phone,
      email: contactData.email,
      consent: contactData.consent,
    },
    summary: {
      type: "consultation",
      channel: summaryChannel,
    },
    agent: {
      retell: {
        agentId: RETELL_AGENT_ID,
        callStatus,
      },
      did: {
        agentId: DID_AGENT_ID,
      },
    },
    transcript, // most recent transcript from Retell (if any)
    links: {
      voiceAgent: VOICE_AGENT_URL,
      calendar: CALENDAR_URL,
      doctorHandoff: DOCTOR_HANDOFF_URL,
    },
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
}

/** ===== NEW: Client-side PDF for e-Rx (dummy data) ===== */
function generatePrescriptionPdf(opts: {
  contactData: TelehealthSectionProps["contactData"];
  t: any;
}) {
  const { contactData, t } = opts;

  // Dummy items for now (can be wired to real selections later)
  const items: Array<{
    name: string;
    strength: string;
    qty: number;
    directions: string;
  }> = [
    { name: "Amoxicillin", strength: "500 mg", qty: 14, directions: "Take 1 capsule twice daily after meals" },
    { name: "Paracetamol", strength: "650 mg", qty: 10, directions: "Take 1 tablet every 8 hours as needed for fever" },
  ];

  const doc = new jsPDF();

  // Header
  doc.setFontSize(16);
  doc.text("Telehealth — Demo e-Prescription (e-Rx)", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    "This e-Rx is for demonstration purposes only and not valid for dispensing.",
    14,
    22
  );

  // Rx number + date
  doc.setTextColor(0);
  const rxNumber = `RX-${Date.now()}`;
  doc.text(`Rx No.: ${rxNumber}`, 150, 16);
  doc.text(`Date: ${new Date().toLocaleString()}`, 150, 22);

  // Patient block
  doc.setFontSize(12);
  doc.text("Patient Details", 14, 34);
  doc.setFontSize(10);
  const patientLines = [
    `Name: ${contactData?.name || "-"}`,
    `Contact: ${contactData?.email || contactData?.phone || "-"}`,
    `Consent: ${contactData?.consent ? "Yes" : "No"}`,
  ];
  patientLines.forEach((l, i) => doc.text(l, 14, 42 + i * 6));

  // Items table
  const rows = items.map((it) => [
    it.name,
    it.strength,
    String(it.qty),
    it.directions,
  ]);

  autoTable(doc, {
    startY: 70,
    head: [["Medication", "Strength", "Qty", "Directions"]],
    body: rows.length ? rows : [["-", "-", "-", "-"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [33, 111, 219] },
    columnStyles: {
      2: { halign: "right", cellWidth: 16 },
      3: { cellWidth: 110 },
    },
  });

  // Notes
  let y = (doc as any).lastAutoTable?.finalY ?? 70;
  y = Math.min(y + 10, 270);
  doc.setFontSize(12);
  doc.text("Notes", 14, y);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    "Take as prescribed. If symptoms persist or worsen, seek medical advice.",
    14,
    y + 8
  );

  // Footer
  doc.setTextColor(120);
  doc.setFontSize(9);
  doc.text("Telehealth Demo • Not for actual medical use", 14, 290);

  // Open in new tab (or: doc.save('e-prescription.pdf'))
  const url = doc.output("bloburl");
  window.open(url, "_blank", "noopener,noreferrer");
}

/** ===== Component ===== */
export default function TelehealthSection({
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

  // === Avatar (script embed) ===
  const [avatarStatus, setAvatarStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  // init D-ID (Fix A: cache-busted load + wait for mount)
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setAvatarStatus("loading");
      try {
        await loadDidScript();
        await waitForChildMount(DID_TARGET_ID, 6000);
        if (!cancelled) setAvatarStatus("ready");
      } catch (e) {
        console.error("D-ID init error:", e);
        if (!cancelled) setAvatarStatus("error");
      }
    };
    init();
    return () => {
      cancelled = true;
      unloadDid();
      setAvatarStatus("idle");
    };
  }, []);

  // === Retell listeners & cleanup ===
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

  // === Start/End Retell call ===
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
        sampleRate: reg.sampleRate,
        enableUpdate: true,
        // mediaStream: stream, // if supported by SDK
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

  /** ========= Send Summary: API + Webhook ========= */
  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      // Your internal API call is commented out here (optional)
      // await apiRequest("POST", "/api/telehealth/summary", { ... });

      // Webhook (optional)
      let webhookOk = true;
      if (WEBHOOK_URL) {
        const payload = buildWebhookPayload({
          contactData,
          summaryChannel,
          transcript,
          callStatus,
          t,
        });

        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          webhookOk = res.ok;
        } catch (e) {
          webhookOk = false;
          console.error("Webhook POST failed:", e);
        }
      }

      return { webhookOk };
    },
    onSuccess: ({ webhookOk }) => {
      const extra = WEBHOOK_URL
        ? webhookOk
          ? " • Webhook ✓"
          : " • Webhook ✕"
        : "";
      toast({
        title: "Summary Sent",
        description: `Visit summary sent via ${summaryChannel.toUpperCase()}${extra}`,
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

  // === e-Prescription generation (client-side PDF, no API) ===
  const generatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      generatePrescriptionPdf({ contactData, t });
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Prescription Generated",
        description: "A demo e-Rx PDF has been opened in a new tab.",
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

  return (
    <section className="space-y-8" data-testid="telehealth-section">
      {/* Service Hero */}
      <div className="medical-card rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{t.thTitle}</h2>
          <p className="text-lg text-white/90 mb-6">{t.thSub}</p>
          <div className="flex flex-wrap gap-4">
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
                className={`fas ${
                  callStatus === "active" ? "fa-stop" : "fa-play"
                } mr-2`}
              />
              {callStatus === "active"
                ? t.endCall ?? "End Voice Agent"
                : callInProgress
                ? t.loadingAgent ?? "Starting…"
                : t.startCall ?? "Start Voice Agent"}
            </Button>
            <Button
              variant="outline"
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30"
              onClick={() =>
                window.open("https://cal.com/nextviseai/30min", "_blank")
              }
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
                  className={`fas ${
                    callStatus === "active" ? "fa-stop" : "fa-play"
                  } mr-2`}
                />
                {callStatus === "active"
                  ? t.endCall ?? "End Voice Agent"
                  : callInProgress
                  ? t.loadingAgent ?? "Starting…"
                  : t.startCall ?? "Start Voice Agent"}
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

        {/* Avatar Card (D-ID script embed) */}
        <Card data-testid="avatar-consultation-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <i className="fas fa-user-md text-secondary"></i>
              Avatar Tele-Consultation
            </h3>

            {/* D-ID mounts its player here */}
            <div
              id={DID_TARGET_ID}
              className="relative w-full aspect-[3/4] sm:aspect-[4/3] lg:aspect-video min-h-[320px] sm:min-h-[360px] rounded-xl border border-gray-200 bg-black/85 overflow-hidden grid place-items-center text-white/70 text-xs sm:text-sm"
              data-testid="did-avatar-container"
            >
              {avatarStatus === "loading" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-3 text-white/90">
                    <span className="w-4 h-4 rounded-full animate-ping bg-white/80" />
                    <span>{t?.loadingAvatar ?? "Loading avatar…"}</span>
                  </div>
                </div>
              )}
              {avatarStatus === "error" && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center text-red-200">
                    <p>Avatar failed to load.</p>
                    <p className="text-xs opacity-70 mt-1">
                      Check keys / CSP / Allowed Origins.
                    </p>
                  </div>
                </div>
              )}
              {avatarStatus === "idle" && (
                <span>
                  {t?.demoVideoPlaceholder ?? "Click Start to load the avatar below."}
                </span>
              )}
            </div>

            {/* Optional quick controls */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (avatarStatus === "loading") return;
                  setAvatarStatus("loading");
                  try {
                    unloadDid();
                    await loadDidScript();
                    await waitForChildMount(DID_TARGET_ID, 6000);
                    setAvatarStatus("ready");
                  } catch (e) {
                    console.error(e);
                    setAvatarStatus("error");
                  }
                }}
              >
                <i className="fas fa-rotate-right mr-2" /> Reload
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  unloadDid();
                  setAvatarStatus("idle");
                }}
              >
                <i className="fas fa-stop mr-2" /> Stop
              </Button>
            </div>
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
                {/* channel selector is optional / commented */}
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
              onClick={() =>
                window.open("https://cal.com/nextviseai/30min", "_blank")
              }
              data-testid="button-book-doctor"
            >
              <i className="fas fa-calendar-check mr-2"></i>
              {t.bookDoctor}
            </Button>
            {/* <Button
              variant="outline"
              onClick={() => window.open(DOCTOR_HANDOFF_URL, "_blank")}
              data-testid="button-emergency"
            >
              <i className="fas fa-phone mr-2"></i>
              {t.emergencyConsult}
            </Button> */}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
