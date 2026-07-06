import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Lado izquierdo del header: menú (☰) o atrás (‹) según la pantalla,
 * seguido de un botón de inicio (🏠) que lleva a la pantalla principal.
 */
export function HeaderLeft({ variant }: { variant: 'menu' | 'back' }) {
  const navigation = useNavigation();
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;

  return (
    <View style={styles.row}>
      {variant === 'menu' ? (
        <Pressable
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          hitSlop={8}
          style={styles.btn}>
          <Ionicons name="menu" size={26} color={c.text} />
        </Pressable>
      ) : (
        <Pressable
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : router.navigate('/'))}
          hitSlop={8}
          style={styles.btn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
      )}
      <Pressable onPress={() => router.navigate('/')} hitSlop={8} style={styles.btn}>
        <Ionicons name="home" size={22} color={accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 8, gap: 6 },
  btn: { padding: 4 },
});
