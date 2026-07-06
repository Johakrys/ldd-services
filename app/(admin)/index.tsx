import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type InProgress = {
  id: string;
  name: string;
  client_name: string | null;
  budgeted_hours: number | null;
  remaining_hours: number | null;
};

type Stats = {
  clients: number;
  activeProjects: number;
  employees: number;
  pendingPayments: number;
};

export default function DashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const t = useT();
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const { role } = useSession();

  // El Panel es solo del admin; manager/empleado van a Proyectos.
  useEffect(() => {
    if (role && role !== 'admin') router.replace('/proyectos');
  }, [role, router]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    activeProjects: 0,
    employees: 0,
    pendingPayments: 0,
  });
  const [inProgress, setInProgress] = useState<InProgress[]>([]);

  const load = useCallback(async () => {
    const [clients, projects, employees, payroll, curso] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('v_employee_hours').select('amount_pending'),
      supabase
        .from('v_project_summary')
        .select('id, name, client_name, budgeted_hours, remaining_hours')
        .eq('status', 'in_progress'),
    ]);

    setStats({
      clients: clients.count ?? 0,
      activeProjects: projects.count ?? 0,
      employees: employees.count ?? 0,
      pendingPayments: (payroll.data ?? []).filter((r) => Number(r.amount_pending ?? 0) > 0).length,
    });
    setInProgress((curso.data as InProgress[] | null) ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (role && role !== 'admin') {
    return <View style={[styles.center, { backgroundColor: c.background }]} />;
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={accent} size="large" />
      </View>
    );
  }

  const tiles: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; go: string }[] = [
    { label: t('nav.projects'), value: stats.activeProjects, icon: 'briefcase', go: '/proyectos' },
    { label: t('nav.clients'), value: stats.clients, icon: 'people', go: '/clientes' },
    { label: t('nav.employees'), value: stats.employees, icon: 'construct', go: '/empleados' },
    { label: t('dash.pending_pay'), value: stats.pendingPayments, icon: 'cash', go: '/pagos' },
  ];

  const cardBg = scheme === 'dark' ? '#121821' : '#fff';
  const border = scheme === 'dark' ? '#232B37' : '#E4E9F0';

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
      }>
      <Text style={[styles.hello, { color: c.icon }]}>{t('dash.summary')}</Text>

      {/* Tarjetas de resumen */}
      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.label}
            onPress={() => router.push(tile.go as never)}
            style={[styles.tile, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={[styles.tileIcon, { backgroundColor: accent + '1A' }]}>
              <Ionicons name={tile.icon} size={20} color={accent} />
            </View>
            <Text style={[styles.tileValue, { color: c.text }]}>{tile.value}</Text>
            <Text style={[styles.tileLabel, { color: c.icon }]}>{tile.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Proyectos en curso */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>{t('dash.inprogress')}</Text>
      {inProgress.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="leaf-outline" size={26} color={c.icon} />
          <Text style={[styles.emptyText, { color: c.icon }]}>
            {t('dash.no_inprogress')}
          </Text>
        </View>
      ) : (
        inProgress.map((p) => (
          <ProjectRow
            key={p.id}
            project={p}
            scheme={scheme}
            onPress={() => router.push({ pathname: '/proyectos/[id]', params: { id: p.id } })}
          />
        ))
      )}
    </ScrollView>
  );
}

function ProjectRow({
  project,
  scheme,
  onPress,
}: {
  project: InProgress;
  scheme: 'light' | 'dark';
  onPress: () => void;
}) {
  const t = useT();
  const c = Colors[scheme];
  const cardBg = scheme === 'dark' ? '#121821' : '#fff';
  const border = scheme === 'dark' ? '#232B37' : '#E4E9F0';

  const rem = project.remaining_hours;
  const hasBudget = project.budgeted_hours != null;
  const over = rem != null && rem <= 0;
  const hoursColor = !hasBudget ? c.icon : over ? '#E5544B' : '#1E9E5A';
  const hoursBg = (!hasBudget ? c.icon : over ? '#E5544B' : '#1E9E5A') + '1A';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.projectRow,
        { backgroundColor: cardBg, borderColor: border, opacity: pressed ? 0.7 : 1 },
      ]}>
      <View style={styles.projectInfo}>
        <Text style={[styles.projectName, { color: c.text }]} numberOfLines={1}>
          {project.name}
        </Text>
        {project.client_name ? (
          <Text style={[styles.projectClient, { color: c.icon }]} numberOfLines={1}>
            {project.client_name}
          </Text>
        ) : null}
      </View>
      <View style={[styles.hoursBadge, { backgroundColor: hoursBg }]}>
        <Text style={[styles.hoursText, { color: hoursColor }]}>
          {hasBudget ? t('dash.hours_left', { n: formatHours(rem!) }) : t('dash.no_hours')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.icon} />
    </Pressable>
  );
}

function formatHours(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 4 },
  hello: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileValue: { fontSize: 28, fontWeight: '800' },
  tileLabel: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: { fontSize: 14 },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  projectInfo: { flex: 1, gap: 2 },
  projectName: { fontSize: 15, fontWeight: '700' },
  projectClient: { fontSize: 13 },
  hoursBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  hoursText: { fontSize: 13, fontWeight: '700' },
});
