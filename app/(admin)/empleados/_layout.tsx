import { Stack } from 'expo-router';

import { HeaderLeft } from '@/components/ui/header-left';
import { useT } from '@/ctx/i18n';

export default function EmpleadosLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerLeft: () => <HeaderLeft variant="back" /> }}>
      <Stack.Screen
        name="index"
        options={{ title: t('nav.employees'), headerLeft: () => <HeaderLeft variant="menu" /> }}
      />
      <Stack.Screen name="form" options={{ title: t('employees.new') }} />
    </Stack>
  );
}
