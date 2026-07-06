import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. Revisa tu archivo .env',
  );
}

// AsyncStorage usa window/localStorage, que NO existe durante el prerender
// de web en el servidor (Node). Solo persistimos la sesión cuando hay navegador
// o cuando corremos en nativo.
const canPersistSession =
  Platform.OS !== 'web' || typeof window !== 'undefined';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Guarda la sesión en el dispositivo (localStorage en web).
    storage: canPersistSession ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: canPersistSession,
    // En apps nativas no hay URL de retorno OAuth que detectar.
    detectSessionInUrl: false,
  },
});

// Refresca el token automáticamente según la app esté activa o en segundo plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
