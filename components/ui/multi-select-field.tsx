import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Option } from '@/components/ui/select-field';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  label: string;
  values: string[];
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  onChange: (values: string[]) => void;
};

/** Campo de selección múltiple: abre un modal con checkboxes. */
export function MultiSelectField({ label, values, options, placeholder, emptyText, onChange }: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const t = useT();
  const [open, setOpen] = useState(false);

  const selected = options.filter((o) => values.includes(o.value));
  const summary =
    selected.length === 0
      ? (placeholder ?? '')
      : selected.length <= 2
        ? selected.map((o) => o.label).join(', ')
        : t('common.selected_count', { n: selected.length });

  function toggle(v: string) {
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>

      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        <Text style={{ color: selected.length ? c.text : c.icon, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {summary}
        </Text>
        <Ionicons name="chevron-down" size={18} color={c.icon} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>{label}</Text>
            {options.length === 0 ? (
              <Text style={{ color: c.icon, padding: 16 }}>{emptyText}</Text>
            ) : (
              <FlatList
                data={options}
                keyExtractor={(o) => o.value}
                renderItem={({ item }) => {
                  const on = values.includes(item.value);
                  return (
                    <Pressable onPress={() => toggle(item.value)} style={styles.option}>
                      <View
                        style={[
                          styles.checkbox,
                          { borderColor: on ? accent : c.border, backgroundColor: on ? accent : 'transparent' },
                        ]}>
                        {on ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
                      </View>
                      <Text style={{ color: c.text, fontSize: 16, flex: 1 }}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            )}
            <Pressable onPress={() => setOpen(false)} style={[styles.done, { backgroundColor: accent }]}>
              <Text style={styles.doneText}>{t('common.done')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, borderWidth: 1, maxHeight: '70%', paddingTop: 8, paddingBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: { marginHorizontal: 16, marginTop: 8, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  doneText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
