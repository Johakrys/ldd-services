import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

const logo = require('@/assets/images/logo.png');

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { session, signOut } = useSession();
  const t = useT();
  const border = scheme === 'dark' ? '#232B37' : '#E4E9F0';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* Marca */}
        <View style={[styles.logoBadge]}>
          <Image source={logo} style={styles.logo} contentFit="contain" />
        </View>

        {/* Items de navegación */}
        <View style={styles.items}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      {/* Pie: tema, usuario, salir */}
      <View style={[styles.footer, { borderTopColor: border }]}>
        <ThemeSwitcher />
        <LanguageSwitcher />
        <View style={styles.userRow}>
          <Ionicons name="person-circle-outline" size={22} color={c.icon} />
          <Text style={[styles.email, { color: c.icon }]} numberOfLines={1}>
            {session?.user.email}
          </Text>
        </View>
        <Pressable onPress={signOut} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.signOutText}>{t('common.signout')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingTop: 8 },
  logoBadge: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  logo: { width: 130, height: 62 },
  items: { paddingHorizontal: 4 },
  footer: {
    borderTopWidth: 1,
    padding: 16,
    gap: 14,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  email: { fontSize: 13, flex: 1 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#004aad',
    borderRadius: 10,
    paddingVertical: 12,
  },
  signOutText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
