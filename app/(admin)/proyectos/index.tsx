import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportHtml, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import { PROJECT_STATUS } from '@/lib/status';

type Row = {
  id: string;
  name: string;
  client_name: string | null;
  status: string;
  budgeted_hours: number | null;
  total_hours: number | null;
  remaining_hours: number | null;
};

const ACTIVE = ['in_progress', 'on_hold'];

export default function ProyectosList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();
  const { role } = useSession();

  const [rows, setRows] = useState<Row[]>([]);
  const [addrById, setAddrById] = useState<Record<string, string>>({});
  const [teamById, setTeamById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'activos' | 'completados' | 'todos'>('activos');

  const load = useCallback(async () => {
    const [summary, projects, teams] = await Promise.all([
      supabase
        .from('v_project_summary')
        .select('id, name, client_name, status, budgeted_hours, total_hours, remaining_hours')
        .order('name'),
      supabase.from('projects').select('id, properties(address, city)'),
      supabase.from('v_project_team').select('project_id, team'),
    ]);
    setRows((summary.data as Row[] | null) ?? []);
    const addr: Record<string, string> = {};
    (projects.data ?? []).forEach((p) => {
      const pr = p.properties as { address: string | null; city: string | null } | null;
      addr[p.id] = pr ? [pr.address, pr.city].filter(Boolean).join(', ') : '';
    });
    setAddrById(addr);
    const team: Record<string, string> = {};
    (teams.data ?? []).forEach((tm) => {
      if (tm.project_id) team[tm.project_id] = tm.team ?? '';
    });
    setTeamById(team);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    if (filter === 'activos') return rows.filter((r) => ACTIVE.includes(r.status));
    if (filter === 'completados') return rows.filter((r) => r.status === 'completed');
    return rows;
  }, [rows, filter]);

  const exportHeaders = [
    t('projects.name'),
    t('projects.client'),
    t('common.status'),
    t('props.address'),
    t('projects.budgeted'),
    t('projects.worked'),
    t('projects.remaining'),
    t('projects.team'),
  ];

  function buildExport() {
    const str: string[][] = [];
    const xlsx: (string | number)[][] = [];
    rows.forEach((r) => {
      const status = t(PROJECT_STATUS[r.status]?.tkey ?? 'status.lead');
      const addr = addrById[r.id] || '—';
      const team = teamById[r.id] || '—';
      str.push([
        r.name,
        r.client_name ?? '—',
        status,
        addr,
        r.budgeted_hours != null ? fmt(r.budgeted_hours) : '—',
        fmt(r.total_hours ?? 0),
        r.remaining_hours != null ? fmt(r.remaining_hours) : '—',
        team,
      ]);
      xlsx.push([
        r.name,
        r.client_name ?? '—',
        status,
        addr,
        r.budgeted_hours ?? 0,
        Number(r.total_hours ?? 0),
        r.remaining_hours ?? 0,
        team,
      ]);
    });
    return { str, xlsx };
  }

  async function exportPdf() {
    await sharePdf(reportHtml({ title: t('nav.projects'), headers: exportHeaders, rows: buildExport().str }), 'Proyectos');
  }
  async function exportExcel() {
    await shareExcel({ filename: 'proyectos', sheets: [{ name: t('nav.projects'), headers: exportHeaders, rows: buildExport().xlsx }] });
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
      {/* Filtros */}
      <View style={styles.filters}>
        {(['activos', 'completados', 'todos'] as const).map((f) => {
          const on = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: on ? accent : 'transparent' },
              ]}>
              <Text style={{ color: on ? '#fff' : c.icon, fontWeight: '600', fontSize: 13 }}>
                {f === 'activos'
                  ? t('projects.active')
                  : f === 'completados'
                    ? t('projects.completed_filter')
                    : t('projects.all')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {role === 'admin' && rows.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>
              {filter === 'activos'
                ? t('projects.no_active')
                : filter === 'completados'
                  ? t('projects.no_completed')
                  : t('projects.empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const st = PROJECT_STATUS[item.status];
          const stColor = st?.color ?? c.icon;
          const stLabel = t(st?.tkey ?? 'status.lead');
          const rem = item.remaining_hours;
          const hasBudget = item.budgeted_hours != null;
          const over = rem != null && rem <= 0;
          const hoursColor = !hasBudget ? c.icon : over ? '#E5544B' : '#1E9E5A';
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/proyectos/[id]', params: { id: item.id } })}
              style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.rowTop}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.badge, { color: stColor, backgroundColor: stColor + '1A' }]}>
                  {stLabel}
                </Text>
              </View>
              <Text style={[styles.client, { color: c.icon }]} numberOfLines={1}>
                {item.client_name ?? t('projects.no_client')}
              </Text>
              {hasBudget ? (
                <View style={styles.hoursRow}>
                  <Ionicons name="time-outline" size={15} color={hoursColor} />
                  <Text style={[styles.hoursText, { color: hoursColor }]}>
                    {t('projects.hours_left_of', { r: fmt(rem!), b: fmt(item.budgeted_hours!) })}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      {role === 'admin' ? (
        <Pressable
          onPress={() => router.push('/proyectos/nuevo')}
          style={[styles.fab, { backgroundColor: Brand }]}>
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  row: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', flex: 1 },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  client: { fontSize: 13 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  hoursText: { fontSize: 13, fontWeight: '600' },
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
