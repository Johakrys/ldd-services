import { Stack } from 'expo-router';

import { HeaderLeft } from '@/components/ui/header-left';
import { useT } from '@/ctx/i18n';

export default function ProyectosLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerLeft: () => <HeaderLeft variant="back" /> }}>
      <Stack.Screen
        name="index"
        options={{ title: t('nav.projects'), headerLeft: () => <HeaderLeft variant="menu" /> }}
      />
      <Stack.Screen name="nuevo" options={{ title: t('projects.new') }} />
      <Stack.Screen name="[id]" options={{ title: t('projects.title') }} />
      <Stack.Screen name="tarea" options={{ title: t('projects.new_task') }} />
      <Stack.Screen name="tarea-detalle" options={{ title: t('tasks.detail_title') }} />
    </Stack>
  );
}
