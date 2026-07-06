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

import { ExportButtons } from '@/components/ui/export-buttons';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportHtml, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';

type Row = { employee_id: string; full_name: string; total_hours: number };
type ProjHours = { project_name: string; address: string | null; total_hours: number };

export default function HorasList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [rows, setRows] = useState<Row[]>([]);
  const [breakdown, setBreakdown] = useState<Record<string, ProjHours[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [totals, detail] = await Promise.all([
      supabase.from('v_employee_hours').select('employee_id, full_name, total_hours').order('full_name'),
      supabase
        .from('v_employee_project_hours')
        .select('employee_id, project_name, project_address, project_city, total_hours')
        .order('project_name'),
    ]);
    setRows((totals.data as Row[] | null) ?? []);
    const map: Record<string, ProjHours[]> = {};
    (detail.data ?? []).forEach((r) => {
      if (!r.employee_id) return;
      (map[r.employee_id] ??= []).push({
        project_name: r.project_name ?? '—',
        address: [r.project_address, r.project_city].filter(Boolean).join(', ') || null,
        total_hours: Number(r.total_hours),
      });
    });
    setBreakdown(map);
    setLoading(false);
  }, []);

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

  async function exportPdf() {
    const { str, total } = flatRows();
    await sharePdf(
      reportHtml({ title: t('hours.report_title'), headers, rows: str, totalLabel: t('hours.total'), totalValue: fmt(total) }),
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
          rows.length > 0 ? (
            <View style={{ marginBottom: 4 }}>
              <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
            </View>
          ) : null
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
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
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
