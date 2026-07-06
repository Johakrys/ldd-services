import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CustomDrawerContent } from '@/components/drawer-content';
import { TaskNotification } from '@/components/task-notification';
import { HeaderLeft } from '@/components/ui/header-left';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const icon =
  (name: IoniconName) =>
  ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );

const hide = { drawerItemStyle: { display: 'none' as const } };

export default function AdminLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const t = useT();
  const { role } = useSession();
  const isAdmin = role === 'admin';

  // admin ve todo; manager/empleado solo: Proyectos, Mis horas, Mi pago.
  // Todos ven "Cuenta".
  const shown = isAdmin
    ? ['index', 'clientes', 'proyectos', 'empleados', 'pagos', 'horas', 'cuenta']
    : ['proyectos', 'mis-horas', 'mi-pago', 'cuenta'];
  const vis = (name: string) => (shown.includes(name) ? {} : hide);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TaskNotification />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerTintColor: c.text,
          headerStyle: { backgroundColor: c.background },
          headerShadowVisible: false,
          headerLeft: () => <HeaderLeft variant="menu" />,
          drawerActiveTintColor: accent,
          drawerInactiveTintColor: c.icon,
          drawerActiveBackgroundColor: accent + '1A',
          sceneStyle: { backgroundColor: c.background },
        }}>
        <Drawer.Screen
          name="index"
          options={{ title: t('nav.dashboard'), drawerLabel: t('nav.dashboard'), drawerIcon: icon('grid-outline'), ...vis('index') }}
        />
        <Drawer.Screen
          name="clientes"
          options={{ title: t('nav.clients'), drawerLabel: t('nav.clients'), drawerIcon: icon('people-outline'), headerShown: false, ...vis('clientes') }}
        />
        <Drawer.Screen
          name="proyectos"
          options={{ title: t('nav.projects'), drawerLabel: t('nav.projects'), drawerIcon: icon('briefcase-outline'), headerShown: false, ...vis('proyectos') }}
        />
        <Drawer.Screen
          name="empleados"
          options={{ title: t('nav.employees'), drawerLabel: t('nav.employees'), drawerIcon: icon('construct-outline'), headerShown: false, ...vis('empleados') }}
        />
        <Drawer.Screen
          name="pagos"
          options={{ title: t('nav.payments'), drawerLabel: t('nav.payments'), drawerIcon: icon('cash-outline'), ...vis('pagos') }}
        />
        <Drawer.Screen
          name="horas"
          options={{ title: t('nav.hours'), drawerLabel: t('nav.hours'), drawerIcon: icon('time-outline'), headerShown: false, ...vis('horas') }}
        />
        <Drawer.Screen
          name="mis-horas"
          options={{ title: t('nav.my_hours'), drawerLabel: t('nav.my_hours'), drawerIcon: icon('time-outline'), ...vis('mis-horas') }}
        />
        <Drawer.Screen
          name="mi-pago"
          options={{ title: t('nav.my_pay'), drawerLabel: t('nav.my_pay'), drawerIcon: icon('cash-outline'), ...vis('mi-pago') }}
        />
        <Drawer.Screen
          name="cuenta"
          options={{ title: t('nav.account'), drawerLabel: t('nav.account'), drawerIcon: icon('person-circle-outline'), ...vis('cuenta') }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
