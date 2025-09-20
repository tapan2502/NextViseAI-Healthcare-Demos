interface ServiceTabsProps {
  activeTab: "telehealth" | "telepharmacy";
  setActiveTab: (tab: "telehealth" | "telepharmacy") => void;
  t: any;
}

export default function ServiceTabs({ activeTab, setActiveTab, t }: ServiceTabsProps) {
  return (
    <div className="flex gap-2 mb-8 p-1 bg-muted rounded-xl" data-testid="service-tabs">
      <button
        onClick={() => setActiveTab("telehealth")}
        className={`flex-1 px-6 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 ${
          activeTab === "telehealth"
            ? "bg-card text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
        }`}
        data-testid="tab-telehealth"
      >
        <i className="fas fa-video"></i>
        {t.tabs.th}
      </button>
      <button
        onClick={() => setActiveTab("telepharmacy")}
        className={`flex-1 px-6 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2 ${
          activeTab === "telepharmacy"
            ? "bg-card text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-card/50"
        }`}
        data-testid="tab-telepharmacy"
      >
        <i className="fas fa-pills"></i>
        {t.tabs.tp}
      </button>
    </div>
  );
}
