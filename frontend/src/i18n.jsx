import { useCallback, useEffect, useMemo, useState } from 'react';
import { translations } from './translations.js';

import { LanguageContext } from './useLanguage.js';
const storageKey = 'trustdapp.language';

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'fa'; }
    catch { return 'fa'; }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    try { localStorage.setItem(storageKey, language); }
    catch { /* Language switching still works when storage is unavailable. */ }
  }, [language]);

  const t = useCallback((text) => {
    if (language !== 'en') return text;
    if (translations[text]) return translations[text];
    // Translate canonical message prefixes while preserving transaction hashes and RPC details.
    const prefix = Object.keys(translations).find(key => key.endsWith(': ') && text.startsWith(key));
    return prefix ? translations[prefix] + text.slice(prefix.length) : text;
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t, locale: language === 'fa' ? 'fa-IR' : 'en-US' }), [language, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
