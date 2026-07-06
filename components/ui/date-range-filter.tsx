import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useI18n } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type FieldProps = {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

/** Campo de fecha: botón que abre un mini-calendario para elegir un día. */
export function DateField({ label, value, onChange, minimumDate, maximumDate }: FieldProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const { lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(() => startOfDay(value));

  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        // 1 ene 2023 fue domingo → nombres cortos localizados, domingo primero.
        new Date(2023, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }),
      ),
    [locale],
  );

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const startPad = new Date(year, month, 1).getDay(); // 0=domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const isDisabled = (d: Date): boolean => {
    if (minimumDate && startOfDay(d) < startOfDay(minimumDate)) return true;
    if (maximumDate && startOfDay(d) > startOfDay(maximumDate)) return true;
    return false;
  };

  function openPicker() {
    setCursor(startOfDay(value));
    setOpen(true);
  }
  function pick(d: Date) {
    onChange(startOfDay(d));
    setOpen(false);
  }

  const valueLabel = value.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  const monthLabel = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: c.icon }]}>{label}</Text>
      <Pressable onPress={openPicker} style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
        <Ionicons name="calendar-outline" size={16} color={accent} />
        <Text style={[styles.valueText, { color: c.text }]} numberOfLines={1}>
          {valueLabel}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.calendar, { backgroundColor: c.background, borderColor: c.border }]} onPress={() => {}}>
            <View style={styles.navRow}>
              <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} hitSlop={12} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={22} color={c.text} />
              </Pressable>
              <Text style={[styles.monthText, { color: c.text }]}>{monthLabel}</Text>
              <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} hitSlop={12} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={22} color={c.text} />
              </Pressable>
            </View>

            <View style={styles.weekHeader}>
              {weekdays.map((w, i) => (
                <Text key={i} style={[styles.weekday, { color: c.icon }]}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={i} style={styles.cell} />;
                const selected = sameDay(d, value);
                const off = isDisabled(d);
                return (
                  <Pressable key={i} disabled={off} onPress={() => pick(d)} style={styles.cell}>
                    <View style={[styles.dayInner, selected && { backgroundColor: accent }]}>
                      <Text style={[styles.dayText, { color: selected ? '#fff' : off ? c.border : c.text }]}>{d.getDate()}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type RangeProps = {
  from: Date;
  to: Date;
  onChange: (from: Date, to: Date) => void;
};

/** Filtro "Desde / Hasta" con botón para volver al mes actual. */
export function DateRangeFilter({ from, to, onChange }: RangeProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const { t } = useI18n();

  function thisMonth() {
    const n = new Date();
    onChange(new Date(n.getFullYear(), n.getMonth(), 1), n);
  }

  return (
    <View style={[styles.wrap, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.row}>
        <DateField label={t('filter.from')} value={from} maximumDate={to} onChange={(d) => onChange(d, to)} />
        <DateField label={t('filter.to')} value={to} minimumDate={from} onChange={(d) => onChange(from, d)} />
      </View>
      <Pressable onPress={thisMonth} style={styles.preset} hitSlop={6}>
        <Ionicons name="refresh" size={13} color={accent} />
        <Text style={[styles.presetText, { color: accent }]}>{t('filter.this_month')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  valueText: { fontSize: 14, fontWeight: '600', flex: 1 },
  preset: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, paddingVertical: 2 },
  presetText: { fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  calendar: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 16, padding: 16 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 4 },
  monthText: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  weekHeader: { flexDirection: 'row', marginBottom: 6 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '600' },
});
