import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '@/lib/supabase';

type SignInResult = { error: string | null };

type AuthContextType = {
  session: Session | null;
  /** true mientras se restaura la sesión guardada al abrir la app. */
  isLoading: boolean;
  /** Rol del usuario: 'admin' | 'manager' | 'employee' (o null si aún carga). */
  role: string | null;
  /** El usuario debe crear su propia contraseña antes de usar la app. */
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<SignInResult>;
  /** Llamar tras cambiar la contraseña para levantar la restricción. */
  markPasswordChanged: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

/** Acceso a la sesión y a las acciones de autenticación. */
export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession debe usarse dentro de <SessionProvider>');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [mustChange, setMustChange] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchFlag(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('must_change_password, role')
      .eq('id', userId)
      .single();
    setMustChange(!!data?.must_change_password);
    setRole(data?.role ?? null);
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) await fetchFlag(data.session.user.id);
      setIsLoading(false);
    });

    // No llamar a otras funciones de supabase de forma síncrona dentro del
    // callback (puede bloquear el lock de auth); las diferimos con setTimeout.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        setTimeout(() => fetchFlag(nextSession.user.id), 0);
      } else {
        setMustChange(false);
        setRole(null);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<SignInResult> {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string): Promise<SignInResult> {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    return { error: error?.message ?? null };
  }

  function markPasswordChanged() {
    setMustChange(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        role,
        mustChangePassword: mustChange,
        signIn,
        signOut,
        resetPassword,
        markPasswordChanged,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
