import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useAppTheme, type ThemePreference } from '@/ctx/theme';
import type { StringKey } from '@/lib/i18n/strings';

const OPTIONS: {
  key: ThemePreference;
  tkey: StringKey;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'light', tkey: 'theme.light', icon: 'sunny-outline' },
  { key: 'dark', tkey: 'theme.dark', icon: 'moon-outline' },
  { key: 'system', tkey: 'theme.auto', icon: 'phone-portrait-outline' },
];

export function ThemeSwitcher() {
  const { preference, scheme, setPreference } = useAppTheme();
  const t = useT();
  const dark = scheme === 'dark';

  const trackBg = dark ? '#1A212C' : '#EDEFF3';
  const trackBorder = dark ? '#2A3441' : '#E2E7EE';
  const activeBg = dark ? BrandLight : Brand;
  const idleText = dark ? '#8A94A2' : '#5B6673';

  return (
    <View style={[styles.track, { backgroundColor: trackBg, borderColor: trackBorder }]}>
      {OPTIONS.map((opt) => {
        const active = preference === opt.key;
        const color = active ? '#fff' : idleText;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            style={[styles.pill, active && { backgroundColor: activeBg }]}>
            <Ionicons name={opt.icon} size={15} color={color} />
            <Text style={[styles.label, { color }]}>{t(opt.tkey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    alignSelf: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
