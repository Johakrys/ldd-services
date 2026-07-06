import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { STRINGS, type Lang, type StringKey } from '@/lib/i18n/strings';

export type LangPreference = 'es' | 'en' | 'system';

type TVars = Record<string, string | number>;
type TFn = (key: StringKey, vars?: TVars) => string;

type I18nContextType = {
  preference: LangPreference;
  lang: Lang;
  setPreference: (p: LangPreference) => void;
  t: TFn;
};

const STORAGE_KEY = 'ldd.lang-preference';
const I18nContext = createContext<I18nContextType | null>(null);

function deviceLang(): Lang {
  const code = Localization.getLocales?.()[0]?.languageCode ?? 'es';
  return code.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  return value;
}

/** Atajo para traducir. */
export function useT(): TFn {
  return useI18n().t;
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<LangPreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'es' || stored === 'en' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((p: LangPreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const lang: Lang = preference === 'system' ? deviceLang() : preference;

  const t = useCallback<TFn>(
    (key, vars) => {
      let s = STRINGS[lang][key] ?? STRINGS.es[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ preference, lang, setPreference, t }), [preference, lang, setPreference, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
