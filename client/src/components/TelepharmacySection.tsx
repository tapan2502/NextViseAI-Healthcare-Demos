"use client"

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RetellWebClient } from "retell-client-js-sdk"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { DEMO_PRODUCTS, type PharmacyProduct } from "@/data/product"
import { I18N } from "@/lib/i18n"

/** ==== ENV (URLs) ===== */
const VOICE_AGENT_URL = import.meta.env.VITE_VOICE_AGENT_URL || "#"

/** ===== D-ID config (env) ===== */
const DID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_DID_PUBLIC_KEY ||
  "YXV0aDB8NjhjZDMzZmIyZmJmN2RmMjY0ODkzOTA2OnFyVjFwWDlaWkktUk1JRUhDVVowNA=="
const DID_AGENT_ID = (import.meta as any).env?.VITE_DID_AGENT_ID || "v2_agt_rlPFem2o"
const DID_TARGET_ID = "did-container"

/** ===== Retell config (env) ===== */
const RETELL_API_KEY = (import.meta as any).env?.VITE_RETELL_API_KEY || "key_98fef97480c54d6bf0698564addb"
const RETELL_AGENT_ID = (import.meta as any).env?.VITE_RETELL_AGENT_ID || "agent_d48b138d06ab53eba3ecaaf8d6"

/** ===== Webhook (env) ===== */
const WEBHOOK_URL =
  (import.meta as any).env?.VITE_SUMMARY_WEBHOOK_URL || "https://hook.us2.make.com/qsoqu0ftv2du42qn02bm1q33gybaeiww"

/** ===== Types ===== */
interface TelepharmacySectionProps {
  contactData: {
    name: string
    phone: string
    email: string
    consent: boolean
  }
  /** i18n translate function: (key: string) => string */
  t: any
  lang: string
}

type CallStatus = "not-started" | "active" | "inactive"
type TranscriptMsg = { role: "agent" | "user" | "assistant"; content: string }

/** ===== D-ID helpers (robust reload) ===== */
const DID_SCRIPT_SRC = "https://agent.d-id.com/v2/index.js"

function waitForChildMount(containerId: string, timeout = 6000) {
  return new Promise<void>((resolve, reject) => {
    const container = document.getElementById(containerId)
    if (!container) {
      reject(new Error("Missing D-ID container"))
      return
    }
    if (container.children.length > 0) {
      resolve()
      return
    }
    const observer = new MutationObserver(() => {
      if (container.children.length > 0) {
        observer.disconnect()
        clearTimeout(timer)
        resolve()
      }
    })
    observer.observe(container, { childList: true })
    const timer = setTimeout(() => {
      observer.disconnect()
      reject(new Error("D-ID did not mount in time"))
    }, timeout)
  })
}

function unloadDid(): void {
  const container = document.getElementById(DID_TARGET_ID)
  if (container && container.parentNode) {
    const fresh = container.cloneNode(false) as HTMLElement
    fresh.id = DID_TARGET_ID
    container.parentNode.replaceChild(fresh, container)
  }
  Array.from(document.scripts)
    .filter((s) => s.src && s.src.includes("agent.d-id.com/v2/index.js"))
    .forEach((s) => s.parentNode?.removeChild(s))
}

function loadDidScript(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement("script")
    s.type = "module"
    s.src = `${DID_SCRIPT_SRC}?cb=${Date.now()}`
    s.setAttribute("data-mode", "full")
    s.setAttribute("data-client-key", DID_PUBLIC_KEY)
    s.setAttribute("data-agent-id", DID_AGENT_ID)
    s.setAttribute("data-name", "did-agent")
    s.setAttribute("data-monitor", "true")
    s.setAttribute("data-target-id", DID_TARGET_ID)
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("Failed to load D-ID agent script"))
    document.body.appendChild(s)
  })
}

/** ===== Retell helpers ===== */
const retellClient = new RetellWebClient()

async function registerRetellCall(
  agentId: string,
  userCtx: { name: string; email: string },
): Promise<{ access_token: string; call_id?: string; sampleRate: number }> {
  const sampleRate = 16000
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
  })
  if (!resp.ok) throw new Error(`Retell register failed: ${resp.status}`)
  const data = await resp.json()
  return { access_token: data.access_token, call_id: data.call_id, sampleRate }
}

/** ===== Localized product helpers ===== */
type LangKey = "en" | "de" | "ar"

function getLocalizedProductStrings(productId: string, lang: LangKey) {
  const byLang = (I18N as any)?.[lang]?.products?.[productId]
  const byEn = (I18N as any)?.en?.products?.[productId]
  const name = byLang?.name ?? byEn?.name ?? productId
  const subtitle = byLang?.subtitle ?? byEn?.subtitle ?? ""
  const description = byLang?.description ?? byEn?.description ?? ""
  // For cards, we can show description and optionally subtitle as a prefix
  const longDescription = subtitle ? `${subtitle} — ${description}` : description
  return { name, subtitle, description: longDescription, rawDescription: description }
}

/** ===== Build webhook payload (now pulls name/desc from i18n) ===== */
function buildWebhookPayload(opts: {
  contactData: TelepharmacySectionProps["contactData"]
  products: PharmacyProduct[]
  cart: { id: string; qty: number }[]
  summaryType: "consultation" | "product" | "prescription"
  summaryChannel: "sms" | "whatsapp" | "email"
  transcript: TranscriptMsg[]
  lang?: LangKey
}) {
  const { contactData, products, cart, summaryType, summaryChannel, transcript, lang = "en" } = opts

  const items = cart.map((c) => {
    const p = products.find((x) => x.id === c.id)
    const loc = getLocalizedProductStrings(c.id, lang)
    return {
      id: c.id,
      qty: c.qty,
      name: loc.name,
      description: loc.description,
      price: p?.price ?? null,
      currency: p?.currency ?? null,
      activeIngredient: p?.activeIngredient ?? null,
      dosage: p?.dosage ?? null,
      requiresPrescription: p?.requiresPrescription ?? false,
      stockQuantity: p?.stockQuantity ?? null,
    }
  })

  const subtotal = items.reduce((sum, it) => {
    const n = Number.parseFloat(String(it.price ?? "0"))
    return sum + (isNaN(n) ? 0 : n) * (it.qty ?? 0)
  }, 0)

  return {
    source: "telepharmacy-ui",
    timestamp: new Date().toISOString(),
    lang,
    patient: {
      name: contactData.name,
      phone: contactData.phone,
      email: contactData.email,
      consent: contactData.consent,
    },
    summary: {
      type: summaryType,
      channel: summaryChannel,
    },
    cart: {
      items,
      totals: {
        itemCount: cart.reduce((s, it) => s + it.qty, 0),
        subtotal,
      },
    },
    transcript,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  }
}

/** ===== Client-side PDF ===== */
function generatePrescriptionPdf(opts: {
  contactData: TelepharmacySectionProps["contactData"]
  products: PharmacyProduct[]
  cart: { id: string; qty: number }[]
  lang: LangKey
}) {
  const { contactData, products, cart, lang } = opts
  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text("Telepharmacy — Demo e-Prescription (e-Rx)", 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text("This e-Rx is for demonstration purposes only and not valid for dispensing.", 14, 22)

  doc.setTextColor(0)
  doc.setFontSize(10)
  const rxNumber = `RX-${Date.now()}`
  doc.text(`Rx No.: ${rxNumber}`, 150, 16)

  doc.setFontSize(12)
  doc.text("Patient Details", 14, 34)
  doc.setFontSize(10)
  const patientLines = [
    `Name: ${contactData?.name || "-"}`,
    `Contact: ${contactData?.email || contactData?.phone || "-"}`,
    `Consent: ${contactData?.consent ? "Yes" : "No"}`,
    `Date: ${new Date().toLocaleString()}`,
  ]
  patientLines.forEach((l, i) => doc.text(l, 14, 42 + i * 6))

  const rows = cart.map((c) => {
    const p = products.find((x) => x.id === c.id)
    const loc = getLocalizedProductStrings(c.id, lang)
    const price = p ? Number(p.price) : 0
    const lineTotal = (price || 0) * c.qty

    return [
      loc.name,
      p?.activeIngredient ? `${p.activeIngredient}${p?.dosage ? ` ${p.dosage}` : ""}` : (p?.dosage ?? "-"),
      String(c.qty),
      p?.currency ?? "USD",
      isNaN(price) ? "-" : price.toFixed(2),
      isNaN(lineTotal) ? "-" : lineTotal.toFixed(2),
    ]
  })

  const subtotal = rows.reduce((sum, r) => {
    const n = Number.parseFloat(String(r[5]))
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  autoTable(doc, {
    startY: 70,
    head: [["Medication", "Strength", "Qty", "Curr", "Price", "Total"]],
    body: rows.length ? rows : [["-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [33, 111, 219] },
    columnStyles: {
      2: { halign: "right", cellWidth: 16 },
      4: { halign: "right", cellWidth: 22 },
      5: { halign: "right", cellWidth: 24 },
    },
    foot: [["", "", "", "", "Subtotal", subtotal.toFixed(2)]],
    footStyles: { halign: "right", fontStyle: "bold" },
  })

  let y = (doc as any).lastAutoTable?.finalY ?? 70
  y = Math.min(y + 10, 270)
  doc.setFontSize(12)
  doc.text("Directions", 14, y)
  doc.setFontSize(10)
  doc.setTextColor(80)
  doc.text("Take as prescribed by your pharmacist. If symptoms persist, seek medical advice.", 14, y + 8)

  doc.setTextColor(120)
  doc.setFontSize(9)
  doc.text("Telepharmacy Demo • Not for actual medical use", 14, 290)

  const url = doc.output("bloburl")
  window.open(url, "_blank")
}

/** ===== Component ===== */
export default function TelepharmacySection({ contactData, t, lang }: TelepharmacySectionProps) {
  const { toast } = useToast()

  /** current language from translator */
  const currentLang: LangKey = lang as LangKey

  const [cart, setCart] = useState<{ id: string; qty: number }[]>([])
  const [summaryChannel] = useState<"sms" | "whatsapp" | "email">("sms")
  const [summaryType, setSummaryType] = useState<"consultation" | "product" | "prescription">("product")

  const [callStatus, setCallStatus] = useState<CallStatus>("not-started")
  const [callInProgress, setCallInProgress] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptMsg[]>([])
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const [avatarStatus, setAvatarStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [avatarBusy, setAvatarBusy] = useState(false)

  /** Products */
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/pharmacy/products/hardcoded"],
    queryFn: async () => DEMO_PRODUCTS as PharmacyProduct[],
  })

  /** Cart helpers */
  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === productId)
      if (existing) {
        return prev.map((i) => (i.id === productId ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { id: productId, qty: 1 }]
    })
    toast({
      title: t.add || "Add",
      description: t.productAdded || "Product added to your cart",
    })
  }
  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId))
  }

  /** Retell listeners */
  useEffect(() => {
    const onStarted = () => {
      setCallStatus("active")
      setCallInProgress(false)
    }
    const onEnded = () => {
      setCallStatus("inactive")
      setCallInProgress(false)
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
      mediaStreamRef.current = null
    }
    const onError = () => {
      setCallStatus("inactive")
      setCallInProgress(false)
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
      mediaStreamRef.current = null
    }
    const onUpdate = (update: any) => {
      if (!update?.transcript) return
      if (Array.isArray(update.transcript)) {
        setTranscript(update.transcript)
      } else if (typeof update.transcript === "object") {
        setTranscript([update.transcript])
      } else if (typeof update.transcript === "string") {
        const msgs: TranscriptMsg[] = update.transcript
          .split("\n")
          .filter((line: string) => line.trim())
          .map((line: string) => ({ role: "assistant", content: line.trim() }))
        setTranscript(msgs)
      }
    }

    retellClient.on("conversationStarted", onStarted)
    retellClient.on("conversationEnded", onEnded)
    retellClient.on("error", onError)
    retellClient.on("update", onUpdate)

    const handleBeforeUnload = () => {
      try {
        ;(retellClient as any).stopCall?.()
      } catch {}
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
      mediaStreamRef.current = null
    }
    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      retellClient.off("conversationStarted", onStarted)
      retellClient.off("conversationEnded", onEnded)
      retellClient.off("error", onError)
      retellClient.off("update", onUpdate)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      handleBeforeUnload()
    }
  }, [])

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [transcript])

  const toggleCall = async () => {
    if (callInProgress) return
    setCallInProgress(true)

    if (callStatus === "active") {
      try {
        if (typeof (retellClient as any).stopCall === "function") {
          await (retellClient as any).stopCall()
        } else if (typeof (retellClient as any).endCall === "function") {
          await (retellClient as any).endCall()
        }
      } catch (e) {
        console.error("Retell stop error:", e)
      } finally {
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
        } catch {}
        mediaStreamRef.current = null
        setCallStatus("inactive")
        setCallInProgress(false)
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream

      if (!RETELL_API_KEY) {
        throw new Error("Missing Retell API key. Set VITE_RETELL_API_KEY")
      }
      const reg = await registerRetellCall(RETELL_AGENT_ID, {
        name: contactData?.name || "",
        email: contactData?.email || "",
      })

      await retellClient.startCall({
        accessToken: reg.access_token,
        sampleRate: reg.sampleRate,
        enableUpdate: true,
      })

      setCallStatus("active")
    } catch (e) {
      console.error("Error starting call:", e)
      try {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
      } catch {}
      mediaStreamRef.current = null
      setCallStatus("inactive")
    } finally {
      setCallInProgress(false)
    }
  }

  /** Avatar init */
  useEffect(() => {
    const init = async () => {
      if (!DID_PUBLIC_KEY || !DID_AGENT_ID) {
        console.error("Missing D-ID keys")
        return
      }
      setAvatarStatus("loading")
      try {
        await loadDidScript()
        await waitForChildMount(DID_TARGET_ID, 6000)
        setAvatarStatus("ready")
      } catch (err) {
        console.error("D-ID init error:", err)
        setAvatarStatus("error")
      }
    }
    init()
    return () => {
      unloadDid()
      setAvatarStatus("idle")
    }
  }, [])

  const stopAvatar = () => {
    try {
      unloadDid()
    } finally {
      setAvatarStatus("idle")
    }
  }

  const reloadAvatar = async () => {
    if (avatarBusy) return
    setAvatarBusy(true)
    try {
      unloadDid()
      setAvatarStatus("loading")
      await loadDidScript()
      await waitForChildMount(DID_TARGET_ID, 6000)
      setAvatarStatus("ready")
    } catch (e) {
      console.error("Avatar reload failed:", e)
      setAvatarStatus("error")
    } finally {
      setAvatarBusy(false)
    }
  }

  /** ===== Mutations ===== */
  const sendSummaryMutation = useMutation({
    mutationFn: async () => {
      let webhookOk = true
      if (WEBHOOK_URL) {
        const payload = buildWebhookPayload({
          contactData,
          products,
          cart,
          summaryType,
          summaryChannel,
          transcript,
          lang: currentLang,
        })
        try {
          const res = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          webhookOk = res.ok
        } catch (e) {
          webhookOk = false
          console.error("Webhook POST failed:", e)
        }
      }
      return { webhookOk }
    },
    onSuccess: ({ webhookOk }) => {
      const extra = WEBHOOK_URL ? (webhookOk ? " • Webhook ✓" : " • Webhook ✕") : ""
      toast({
        title: t.sendSummary || "Send summary",
        description: `${t.productCatalog || "Pharmacy summary"} ${t.sentVia || "sent via"} ${summaryChannel.toUpperCase()}${extra}`,
      })
    },
    onError: () => {
      toast({
        title: t.error || "Error",
        description: t.sendFailed || "Failed to send summary. Please try again.",
        variant: "destructive",
      })
    },
  })

  const generatePrescriptionMutation = useMutation({
    mutationFn: async () => {
      generatePrescriptionPdf({ contactData, products, cart, lang: currentLang })
      return true
    },
    onSuccess: () => {
      toast({
        title: t.ePrescriptionGenerated || "e-Prescription Generated",
        description: t.ePrescriptionOpened || "A demo PDF has been opened in a new tab.",
      })
    },
    onError: () => {
      toast({
        title: t.error || "Error",
        description: t.ePrescriptionFailed || "Failed to generate e-prescription PDF. Please try again.",
        variant: "destructive",
      })
    },
  })

  /** ===== UI ===== */
  return (
    <section className="space-y-8" data-testid="telepharmacy-section">
      {/* Service Hero */}
      <div className="bg-gradient-to-r from-secondary to-accent rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">{t.tpTitle}</h2>
          <p className="text-lg text-white/90 mb-6">{t.tpSub}</p>
          <div className="flex flex-wrap gap-4">
            <Button
              className={`${
                callStatus === "active" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
              }`}
              onClick={toggleCall}
              disabled={callInProgress}
            >
              <i className={`fas ${callStatus === "active" ? "fa-stop" : "fa-play"} mr-2`} />
              {callStatus === "active"
                ? (t.endCall ?? "End Voice Agent")
                : callInProgress
                  ? (t.loadingAgent ?? "Starting…")
                  : (t.startAgent ?? "Start Voice Agent")}
            </Button>
          </div>
        </div>
      </div>

      {/* Product Catalog + Right column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Catalog */}
        <div className="lg:col-span-2">
          <Card data-testid="product-catalog">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-pills text-secondary"></i>
                {t.productCatalog}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {productsLoading ? (
                  <div className="col-span-full text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p>{t.loading || "Loading products..."}</p>
                  </div>
                ) : (
                  products.map((product) => {
                    const loc = getLocalizedProductStrings(product.id, currentLang)

                    return (
                      <div
                        key={product.id}
                        className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-tablets text-muted-foreground"></i>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground">{loc.name}</h4>
                            {product.dosage && (
                              <p className="text-sm text-muted-foreground">
                                {product.activeIngredient} {product.dosage}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{loc.description}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-medium">${product.price}</span>
                              <Button
                                size="sm"
                                className="bg-secondary hover:bg-secondary/90"
                                onClick={() => addToCart(product.id)}
                                data-testid={`button-add-${product.id.replace(/[^a-z0-9]/gi, "_")}`}
                                disabled={product.stockQuantity <= 0}
                              >
                                {product.stockQuantity <= 0 ? t.outOfStock || "Out of Stock" : t.add}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Shopping Cart */}
              {cart.length > 0 && (
                <div className="border-t border-border pt-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <i className="fas fa-shopping-cart text-accent"></i>
                    {t.cart} ({cart.length} {t.items || "items"})
                  </h4>
                  <div className="space-y-2 mb-4" data-testid="cart-items">
                    {cart.map((item) => {
                      const product = products.find((p) => p.id === item.id)
                      const name = getLocalizedProductStrings(item.id, currentLang).name

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-md"
                        >
                          <span className="text-sm">
                            {name} × {item.qty}
                            {product && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ${(Number.parseFloat(product.price) * item.qty).toFixed(2)}
                              </span>
                            )}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive/80 text-xs h-auto p-1"
                            onClick={() => removeFromCart(item.id)}
                            data-testid={`button-remove-${item.id.replace(/[^a-z0-9]/gi, "_")}`}
                          >
                            {t.remove || "Remove"}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Avatar + Voice Agent */}
        <div className="flex flex-col gap-8">
          {/* Pharmacist Avatar */}
          <Card data-testid="pharmacist-avatar">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-user-graduate text-accent"></i>
                {t.pharmacistAvatar ?? "Pharmacist Avatar"}
              </h3>

              <div
                id={DID_TARGET_ID}
                className="relative w-full aspect-[3/4] sm:aspect-[4/3] lg:aspect-video min-h-[300px] rounded-xl border border-gray-200 bg-black/85 overflow-hidden grid place-items-center text-white/70 text-xs sm:text-sm"
              >
                {avatarStatus === "loading" && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="w-4 h-4 rounded-full animate-ping bg-white/80" />
                      <span>{t.loadingAvatar ?? "Loading avatar…"}</span>
                    </div>
                  </div>
                )}
                {avatarStatus === "error" && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center text-red-200">
                      <p>{t.avatarLoadFailed ?? "Avatar failed to load."}</p>
                      <p className="text-xs opacity-70 mt-1">{t.avatarLoadHint ?? "Check keys / network / CSP."}</p>
                    </div>
                  </div>
                )}
                {avatarStatus === "idle" && <span>{t.demoVideoPlaceholder ?? "Avatar will appear here"}</span>}
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={reloadAvatar} disabled={avatarBusy}>
                  <i className="fas fa-rotate mr-2" />
                  {t.reloadAvatar ?? "Reload Avatar"}
                </Button>
                <Button size="sm" variant="outline" onClick={stopAvatar}>
                  <i className="fas fa-stop mr-2" />
                  {t.stopAvatar ?? "Stop Avatar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Voice Agent */}
          <Card data-testid="voice-agent-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <i className="fas fa-microphone-alt text-primary"></i>
                {t.voiceAgent ?? "Voice Agent"}
                <span className="ml-auto flex items-center gap-2 text-xs">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full ${callStatus === "active" ? "bg-green-500" : "bg-gray-300"}`}
                  />
                  {callStatus === "active" ? t.live || "Live" : t.idle || "Idle"}
                </span>
              </h3>

              <div className="mb-4">
                <Button
                  className={`${callStatus === "active" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`}
                  onClick={toggleCall}
                  disabled={callInProgress}
                >
                  <i className={`fas ${callStatus === "active" ? "fa-stop" : "fa-play"} mr-2`} />
                  {callStatus === "active"
                    ? (t.endCall ?? "End Voice Agent")
                    : callInProgress
                      ? (t.loadingAgent ?? "Starting…")
                      : (t.startAgent ?? "Start Voice Agent")}
                </Button>
              </div>

              <div ref={transcriptRef} className="h-64 overflow-auto border border-gray-200 rounded-xl p-4 bg-muted/30">
                {transcript.length ? (
                  <div className="space-y-3">
                    {transcript.map((m, idx) => {
                      const isAgent = m.role === "agent" || m.role === "assistant"
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
                            {isAgent ? t.agent || "Agent" : t.patient || "Patient"}
                          </div>
                          <div className="text-sm leading-relaxed">{m.content}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full grid place-items-center text-muted-foreground text-sm">
                    {callStatus === "active"
                      ? t.listeningSpeakNow || "Listening… Speak now."
                      : t.noMessagesYet || 'No messages yet. Click "Start Voice Agent" to begin.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* e-Prescription */}
      <Card data-testid="e-prescription-section" className="mt-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-file-medical text-blue-600"></i>
            {t.genErx || "Generate e-Prescription (e-Rx)"}
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-8 bg-muted/30 rounded-lg">
              <i className="fas fa-prescription-bottle text-4xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground mb-2">{t.noMedsInCart || "No medications in cart"}</p>
              <p className="text-sm text-muted-foreground">
                {t.addMedsToGenerate || "Add prescription medications to your cart to generate an e-Rx"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-pills text-blue-600"></i>
                  {t.prescriptionItems || "Prescription Items"} ({cart.length})
                </h4>
                <div className="space-y-2">
                  {cart.map((item) => {
                    const product = products.find((p) => p.id === item.id)
                    const name = getLocalizedProductStrings(item.id, currentLang).name

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border"
                      >
                        <div className="flex-1">
                          <span className="font-medium text-sm">{name}</span>
                          {product?.activeIngredient && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({product.activeIngredient} {product.dosage})
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-blue-600 font-medium">
                          {t.qty || "Qty"}: {item.qty}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {t.patient || "Patient"}: <span className="font-medium text-foreground">{contactData.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t.contactInfo || "Contact"}:{" "}
                    <span className="font-medium text-foreground">{contactData.email || contactData.phone}</span>
                  </p>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => generatePrescriptionMutation.mutate()}
                  disabled={
                    !contactData.consent || (generatePrescriptionMutation as any).isPending || cart.length === 0
                  }
                  data-testid="button-generate-prescription"
                >
                  {(generatePrescriptionMutation as any).isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      {t.generating || "Generating..."}
                    </>
                  ) : (
                    <>
                      <i className="fas fa-file-medical mr-2"></i>
                      {t.genErx || "Generate e-Rx"}
                    </>
                  )}
                </Button>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>
                    {t.erxDisclaimer ||
                      "This is a demonstration e-prescription system. Generated prescriptions are for demo purposes only and are not valid for dispensing medications."}
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Channels */}
      <Card data-testid="communication-channels">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <i className="fas fa-paper-plane text-primary"></i>
            {t.sendFollowup}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.language}</label>
              <select
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                data-testid="select-language"
                defaultValue={currentLang}
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
              </select>
            </div>

            {/* Summary Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.summaryType}</label>
              <select
                value={summaryType}
                onChange={(e) => setSummaryType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
                data-testid="select-summary-type"
              >
                <option value="consultation">{t.consultationSummary}</option>
                <option value="product">{t.productInfo}</option>
                <option value="prescription">{t.prescriptionDetails}</option>
              </select>
            </div>

            {/* Send button */}
            <div className="self-end">
              <Button
                className="bg-primary hover:bg-primary/90 px-12 py-6 rounded-lg w-full md:w-auto md:justify-self-start"
                onClick={() => sendSummaryMutation.mutate()}
                disabled={!contactData.consent || (sendSummaryMutation as any).isPending}
                data-testid="button-send-summary"
              >
                {(sendSummaryMutation as any).isPending ? t.sending || "Sending..." : t.sendSummary}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
