import { Stack } from 'expo-router';

import { HeaderLeft } from '@/components/ui/header-left';
import { useT } from '@/ctx/i18n';

export default function ClientesLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerLeft: () => <HeaderLeft variant="back" /> }}>
      <Stack.Screen
        name="index"
        options={{ title: t('nav.clients'), headerLeft: () => <HeaderLeft variant="menu" /> }}
      />
      <Stack.Screen name="nuevo" options={{ title: t('clients.new') }} />
      <Stack.Screen name="[id]" options={{ title: t('clients.title') }} />
      <Stack.Screen name="propiedad" options={{ title: t('props.title') }} />
    </Stack>
  );
}
