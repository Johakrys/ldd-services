import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type Option = { label: string; value: string };

type Props = {
  label: string;
  required?: boolean;
  value: string | null;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
  onChange: (value: string) => void;
};

/** Campo tipo "select": abre un modal con las opciones. */
export function SelectField({
  label,
  required,
  value,
  options,
  placeholder = 'Seleccionar...',
  disabled,
  emptyText = 'Sin opciones disponibles',
  onChange,
}: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: c.text }]}>
        {label}
        {required ? <Text style={styles.req}> *</Text> : null}
      </Text>

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[
          styles.field,
          { backgroundColor: c.inputBg, borderColor: c.border, opacity: disabled ? 0.5 : 1 },
        ]}>
        <Text style={{ color: selected ? c.text : c.icon, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
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
                  const active = item.value === value;
                  return (
                    <Pressable
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      style={styles.option}>
                      <Text style={{ color: active ? accent : c.text, fontSize: 16, fontWeight: active ? '700' : '400' }}>
                        {item.label}
                      </Text>
                      {active ? <Ionicons name="checkmark" size={20} color={accent} /> : null}
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  req: { color: '#E5544B' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { borderRadius: 16, borderWidth: 1, maxHeight: '70%', paddingVertical: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
