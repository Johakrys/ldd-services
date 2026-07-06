import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight } from '@/constants/theme';
import { useI18n, type LangPreference } from '@/ctx/i18n';
import { useAppTheme } from '@/ctx/theme';

const OPTIONS: { key: LangPreference; label: string }[] = [
  { key: 'es', label: 'Español' },
  { key: 'en', label: 'English' },
  { key: 'system', label: 'Auto' },
];

export function LanguageSwitcher() {
  const { preference, setPreference, t } = useI18n();
  const { scheme } = useAppTheme();
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
        const label = opt.key === 'system' ? t('theme.auto') : opt.label;
        return (
          <Pressable
            key={opt.key}
            onPress={() => setPreference(opt.key)}
            style={[styles.pill, active && { backgroundColor: activeBg }]}>
            <Text style={[styles.label, { color }]}>{label}</Text>
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
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  label: { fontSize: 13, fontWeight: '600' },
});
