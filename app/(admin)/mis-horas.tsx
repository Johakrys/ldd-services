import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type ProjHours = { project_name: string; address: string | null; total_hours: number };

export default function MisHoras() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const t = useT();
  const { session } = useSession();

  const [rows, setRows] = useState<ProjHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const emp = await supabase.from('employees').select('id').eq('user_id', session?.user.id ?? '').maybeSingle();
    const empId = emp.data?.id;
    if (!empId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('v_employee_project_hours')
      .select('project_name, project_address, project_city, total_hours')
      .eq('employee_id', empId)
      .order('project_name');
    setRows(
      (data ?? []).map((r) => ({
        project_name: r.project_name ?? '—',
        address: [r.project_address, r.project_city].filter(Boolean).join(', ') || null,
        total_hours: Number(r.total_hours),
      })),
    );
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = rows.reduce((s, r) => s + r.total_hours, 0);

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
        keyExtractor={(item) => item.project_name}
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
          <View style={[styles.totalCard, { backgroundColor: accent }]}>
            <Text style={styles.totalLabel}>{t('hours.hours_worked')}</Text>
            <Text style={styles.totalValue}>{fmt(total)} h</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>{t('pay.no_project_hours')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="briefcase-outline" size={18} color={accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.proj, { color: c.text }]} numberOfLines={1}>
                {item.project_name}
              </Text>
              {item.address ? (
                <Text style={[styles.addr, { color: c.icon }]} numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.hours, { color: c.text }]}>{fmt(item.total_hours)} h</Text>
          </View>
        )}
      />
    </View>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10 },
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 4 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 14 },
  proj: { fontSize: 15, fontWeight: '600' },
  addr: { fontSize: 12, marginTop: 1 },
  hours: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
