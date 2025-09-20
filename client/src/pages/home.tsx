import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import ContactForm from "@/components/ContactForm";
import ServiceTabs from "@/components/ServiceTabs";
import TelehealthSection from "@/components/TelehealthSection";
import TelepharmacySection from "@/components/TelepharmacySection";
import SickNoteModal from "@/components/SickNoteModal";

export default function Home() {
  const { t, lang, setLang, isRtl } = useI18n();
  const [activeTab, setActiveTab] = useState<"telehealth" | "telepharmacy">("telehealth");
  const [sickNoteModalOpen, setSickNoteModalOpen] = useState(false);
  
  // Contact form state
  const [contactData, setContactData] = useState({
    name: "",
    phone: "",
    email: "",
    consent: false
  });

  return (
    <div className={`min-h-screen bg-background text-foreground ${isRtl ? 'rtl' : ''}`}>
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95" data-testid="header">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-heartbeat text-primary-foreground text-xl"></i>
            </div>
            <h1 className="font-bold text-xl text-foreground" data-testid="brand-title">
              {t.brand}
            </h1>
          </div>
          
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t.lang}:</span>
            <div className="flex gap-1">
              {(["en", "de", "ar"] as const).map((langCode) => (
                <button
                  key={langCode}
                  onClick={() => setLang(langCode)}
                  className={`px-3 py-1.5 rounded-md border-2 font-medium text-sm transition-colors ${
                    lang === langCode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  data-testid={`language-${langCode}`}
                >
                  {langCode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Contact Form */}
        <ContactForm
          contactData={contactData}
          setContactData={setContactData}
          t={t}
        />

        {/* Service Tabs */}
        <ServiceTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          t={t}
        />

        {/* Service Sections */}
        {activeTab === "telehealth" ? (
          <TelehealthSection
            contactData={contactData}
            t={t}
            onOpenSickNote={() => setSickNoteModalOpen(true)}
          />
        ) : (
          <TelepharmacySection
            contactData={contactData}
            t={t}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <i className="fas fa-shield-alt text-primary"></i>
            <span className="font-medium text-foreground">HIPAA/GDPR Compliant Demo Platform</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            {t.footer}
          </p>
          <div className="flex justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <span>• Demo Only</span>
            <span>• Privacy Aware</span>
            <span>• No Real Medical Advice</span>
          </div>
        </div>
      </footer>

      {/* Sick Note Modal */}
      <SickNoteModal
        isOpen={sickNoteModalOpen}
        onClose={() => setSickNoteModalOpen(false)}
        contactData={contactData}
        t={t}
      />
    </div>
  );
}
