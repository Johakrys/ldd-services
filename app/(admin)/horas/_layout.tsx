import { Stack } from 'expo-router';

import { HeaderLeft } from '@/components/ui/header-left';
import { useT } from '@/ctx/i18n';

export default function HorasLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerLeft: () => <HeaderLeft variant="back" /> }}>
      <Stack.Screen
        name="index"
        options={{ title: t('nav.hours'), headerLeft: () => <HeaderLeft variant="menu" /> }}
      />
      <Stack.Screen name="nuevo" options={{ title: t('hours.register') }} />
    </Stack>
  );
}
