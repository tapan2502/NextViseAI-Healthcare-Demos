import { useState } from "react";
import { I18N, type LangKey } from "@/lib/i18n";

export function useI18n() {
  const [lang, setLang] = useState<LangKey>("en");
  
  const t = I18N[lang];
  const isRtl = lang === "ar";

  return {
    t,
    lang,
    setLang,
    isRtl
  };
}
