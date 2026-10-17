import { createContext, useContext, useState, type ReactNode } from 'react';
import { t, type Locale } from './strings';

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: Parameters<typeof t>[0]) => string;
}

const LocaleContext = createContext<LocaleState>({
  locale: 'fr',
  setLocale: () => {},
  t: (k) => t(k, 'fr'),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('fame.locale');
    return saved === 'en' ? 'en' : 'fr';
  });

  const value: LocaleState = {
    locale,
    setLocale: (l) => {
      localStorage.setItem('fame.locale', l);
      setLocale(l);
    },
    t: (k) => t(k, locale),
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return useContext(LocaleContext);
}
