import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { money } from '@/lib/money';
import { supabase } from '@/lib/supabase';

type Proj = { id: string; name: string; total: number; count: number };

export default function GastosCliente() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [projects, setProjects] = useState<Proj[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, expenses(amount)')
      .eq('client_id', params.id)
      .eq('status', 'completed')
      .order('name');
    setProjects(
      (data ?? []).map((p: any) => {
        const exps = p.expenses ?? [];
        return {
          id: p.id,
          name: p.name,
          total: exps.reduce((s: number, e: any) => s + Number(e.amount), 0),
          count: exps.length,
        };
      }),
    );
    setLoading(false);
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const total = projects.reduce((s, p) => s + p.total, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: params.name || t('gastos.client') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: params.name || t('gastos.client') }} />
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
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
            <Text style={styles.totalLabel}>{t('gastos.total')}</Text>
            <Text style={styles.totalValue}>{money(total)}</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>{t('gastos.no_history')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/gastos/proyecto/[id]', params: { id: item.id, name: item.name } })}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: accent + '1A' }]}>
              <Ionicons name="briefcase-outline" size={20} color={accent} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.sub, { color: c.icon }]}>{t('gastos.n_expenses', { n: item.count })}</Text>
            </View>
            <Text style={[styles.amount, { color: c.text }]}>{money(item.total)}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.icon} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 6 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: 14 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
