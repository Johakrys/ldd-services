import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { DateRangeFilter } from '@/components/ui/date-range-filter';
import { ExportButtons } from '@/components/ui/export-buttons';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useI18n } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { dayEndExclusiveISO, dayStartISO, firstOfMonth, rangeLabel } from '@/lib/dates';
import { reportHtml, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';

type Row = { employee_id: string; full_name: string; total_hours: number };
type ProjHours = { project_name: string; address: string | null; total_hours: number };

export default function HorasList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const [from, setFrom] = useState<Date>(() => firstOfMonth());
  const [to, setTo] = useState<Date>(() => new Date());
  const [rows, setRows] = useState<Row[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, ProjHours[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Solo las horas del rango elegido (clock_in entre desde y hasta).
    const { data } = await supabase
      .from('time_entries')
      .select('employee_id, hours, employees(first_name, last_name), projects(name, properties(address, city))')
      .not('clock_out', 'is', null)
      .gte('clock_in', dayStartISO(from))
      .lt('clock_in', dayEndExclusiveISO(to));

    const totals = new Map<string, Row>();
    const bdMap: Record<string, Map<string, ProjHours>> = {};
    (data ?? []).forEach((r: any) => {
      if (!r.employee_id) return;
      const h = r.hours == null ? 0 : Number(r.hours);
      const name = `${r.employees?.first_name ?? ''} ${r.employees?.last_name ?? ''}`.trim() || '—';
      const row = totals.get(r.employee_id) ?? { employee_id: r.employee_id, full_name: name, total_hours: 0 };
      row.total_hours += h;
      totals.set(r.employee_id, row);

      const projName = r.projects?.name ?? '—';
      const address = [r.projects?.properties?.address, r.projects?.properties?.city].filter(Boolean).join(', ') || null;
      const m = (bdMap[r.employee_id] ??= new Map());
      const key = projName + '|' + (address ?? '');
      const cur = m.get(key) ?? { project_name: projName, address, total_hours: 0 };
      cur.total_hours += h;
      m.set(key, cur);
    });

    setRows(
      [...totals.values()].filter((r) => r.total_hours > 0).sort((a, b) => a.full_name.localeCompare(b.full_name)),
    );
    const map: Record<string, ProjHours[]> = {};
    Object.entries(bdMap).forEach(([id, m]) => {
      map[id] = [...m.values()].sort((a, b) => a.project_name.localeCompare(b.project_name));
    });
    setBreakdown(map);
    setLoading(false);
  }, [from, to]);

  // Se recarga al enfocar la pantalla y cada vez que cambia el rango de fechas.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function flatRows() {
    const str: string[][] = [];
    const xlsx: (string | number)[][] = [];
    let total = 0;
    rows.forEach((r) => {
      const bd = breakdown[r.employee_id] ?? [];
      if (bd.length === 0) {
        str.push([r.full_name, '—', fmt(r.total_hours)]);
        xlsx.push([r.full_name, '—', Number(r.total_hours)]);
      } else {
        bd.forEach((d) => {
          str.push([r.full_name, d.project_name, fmt(d.total_hours)]);
          xlsx.push([r.full_name, d.project_name, Number(d.total_hours)]);
        });
      }
      total += Number(r.total_hours);
    });
    return { str, xlsx, total };
  }

  const headers = [t('hours.employee'), t('hours.project'), t('hours.hours')];
  const rangeText = rangeLabel(from, to, locale);

  async function exportPdf() {
    const { str, total } = flatRows();
    await sharePdf(
      reportHtml({
        title: `${t('hours.report_title')} · ${rangeText}`,
        headers,
        rows: str,
        totalLabel: t('hours.total'),
        totalValue: fmt(total),
      }),
      'Horas trabajadas',
    );
  }

  async function exportExcel() {
    const { xlsx } = flatRows();
    await shareExcel({ filename: 'horas-trabajadas', sheets: [{ name: t('nav.hours'), headers, rows: xlsx }] });
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.employee_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={accent}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 4 }}>
            <DateRangeFilter
              from={from}
              to={to}
              onChange={(f, tt) => {
                setFrom(f);
                setTo(tt);
              }}
            />
            {rows.length > 0 ? <ExportButtons onPdf={exportPdf} onExcel={exportExcel} /> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>{t('hours.empty')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded.has(item.employee_id);
          const detail = breakdown[item.employee_id] ?? [];
          return (
            <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable onPress={() => toggle(item.employee_id)} style={styles.rowHeader}>
                <Ionicons name="person-circle-outline" size={26} color={accent} />
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {item.full_name}
                </Text>
                <Text style={[styles.hours, { color: c.text }]}>{fmt(item.total_hours)} h</Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.icon}
                  style={{ marginLeft: 4 }}
                />
              </Pressable>

              {isOpen ? (
                <View style={[styles.detail, { borderTopColor: c.border }]}>
                  <Text style={[styles.detailTitle, { color: c.icon }]}>{t('pay.by_project')}</Text>
                  {detail.length === 0 ? (
                    <Text style={[styles.detailEmpty, { color: c.icon }]}>{t('pay.no_project_hours')}</Text>
                  ) : (
                    detail.map((d) => (
                      <View key={d.project_name} style={styles.detailRow}>
                        <Ionicons name="briefcase-outline" size={15} color={accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.detailProj, { color: c.text }]} numberOfLines={1}>
                            {d.project_name}
                          </Text>
                          {d.address ? (
                            <Text style={[styles.detailAddr, { color: c.icon }]} numberOfLines={1}>
                              {d.address}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.detailHours, { color: c.text }]}>{fmt(d.total_hours)} h</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          );
        }}
      />

      <Pressable onPress={() => router.push('/horas/nuevo')} style={[styles.fab, { backgroundColor: Brand }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

function fmt(n: number): string {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 100, gap: 10 },
  row: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  name: { fontSize: 16, fontWeight: '600', flex: 1 },
  hours: { fontSize: 16, fontWeight: '800' },
  detail: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  detailTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailProj: { fontSize: 14, fontWeight: '600' },
  detailAddr: { fontSize: 12, marginTop: 1 },
  detailHours: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  detailEmpty: { fontSize: 13 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
