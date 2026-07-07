import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { WebTitle } from '@/components/web-title';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/ctx/auth';
import { I18nProvider } from '@/ctx/i18n';
import { AppThemeProvider } from '@/ctx/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(admin)',
};

// Mantiene el splash visible hasta saber si hay sesión guardada.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <I18nProvider>
        <SessionProvider>
          <ThemedNavigation />
        </SessionProvider>
      </I18nProvider>
    </AppThemeProvider>
  );
}

function ThemedNavigation() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: c.background,
      card: c.background,
      text: c.text,
      border: c.border,
      primary: scheme === 'dark' ? BrandLight : Brand,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <RootNavigator />
      <WebTitle />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading, mustChangePassword } = useSession();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // Aún restaurando la sesión: el splash sigue visible.
  if (isLoading) return null;

  return (
    <Stack>
      {/* App: con sesión y sin cambio de contraseña pendiente. */}
      <Stack.Protected guard={!!session && !mustChangePassword}>
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Primer inicio: debe crear su propia contraseña. */}
      <Stack.Protected guard={!!session && mustChangePassword}>
        <Stack.Screen name="change-password" options={{ headerShown: false }} />
      </Stack.Protected>

      {/* Login: sin sesión. */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
