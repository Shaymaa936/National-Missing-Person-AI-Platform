import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translate } from "./translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("en"); // 'en' | 'ur'

  useEffect(() => {
    document.body.classList.toggle("rtl", lang === "ur");
    document.documentElement.setAttribute("dir", lang === "ur" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const t = useCallback((path) => translate(lang, path), [lang]);

  const value = { lang, setLang, t, isUrdu: lang === "ur" };
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
