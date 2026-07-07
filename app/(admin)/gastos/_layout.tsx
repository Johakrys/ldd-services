import { Stack } from 'expo-router';

import { HeaderLeft } from '@/components/ui/header-left';
import { useT } from '@/ctx/i18n';

export default function GastosLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerLeft: () => <HeaderLeft variant="back" /> }}>
      <Stack.Screen
        name="index"
        options={{ title: t('nav.expenses'), headerLeft: () => <HeaderLeft variant="menu" /> }}
      />
      <Stack.Screen name="nuevo" options={{ title: t('gastos.new') }} />
      <Stack.Screen name="proyecto/[id]" options={{ title: t('gastos.project') }} />
      <Stack.Screen name="gasto/[id]" options={{ title: t('gastos.detail_title') }} />
      <Stack.Screen name="cliente/[id]" options={{ title: t('gastos.client') }} />
    </Stack>
  );
}
