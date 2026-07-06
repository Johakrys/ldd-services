import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
type Scheme = 'light' | 'dark';

type ThemeContextType = {
  /** Lo que el usuario eligió: claro, oscuro o seguir al sistema. */
  preference: ThemePreference;
  /** Esquema efectivo ya resuelto (nunca 'system'). */
  scheme: Scheme;
  setPreference: (p: ThemePreference) => void;
};

const STORAGE_KEY = 'ldd.theme-preference';
const ThemeContext = createContext<ThemeContextType | null>(null);

/** Preferencia + acciones para cambiar el tema. */
export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useAppTheme debe usarse dentro de <AppThemeProvider>');
  }
  return value;
}

/** Esquema efectivo ('light' | 'dark'), con respaldo al sistema. */
export function useResolvedScheme(): Scheme {
  const ctx = useContext(ThemeContext);
  const system = useSystemColorScheme() ?? 'light';
  return ctx ? ctx.scheme : system;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useSystemColorScheme() ?? 'light';
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Restaura la preferencia guardada al abrir la app.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }

  const scheme: Scheme = preference === 'system' ? system : preference;

  return (
    <ThemeContext.Provider value={{ preference, scheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
