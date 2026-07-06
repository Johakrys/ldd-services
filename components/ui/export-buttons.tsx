import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Par de botones para exportar a PDF y Excel. */
export function ExportButtons({ onPdf, onExcel }: { onPdf: () => void; onExcel: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;

  return (
    <View style={styles.row}>
      <Pressable onPress={onPdf} style={[styles.btn, { borderColor: accent, backgroundColor: c.card }]}>
        <Ionicons name="download-outline" size={17} color={accent} />
        <Text style={[styles.txt, { color: accent }]}>PDF</Text>
      </Pressable>
      <Pressable onPress={onExcel} style={[styles.btn, { borderColor: accent, backgroundColor: c.card }]}>
        <Ionicons name="download-outline" size={17} color={accent} />
        <Text style={[styles.txt, { color: accent }]}>Excel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 11,
  },
  txt: { fontWeight: '700', fontSize: 14 },
});
