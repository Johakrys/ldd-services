import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { money } from '@/lib/money';
import { supabase } from '@/lib/supabase';

type ActiveProj = { id: string; name: string; client_name: string; total: number; count: number };
type HistClient = { id: string; name: string; project_count: number; total: number };

export default function GastosIndex() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [active, setActive] = useState<ActiveProj[]>([]);
  const [clients, setClients] = useState<HistClient[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [act, comp] = await Promise.all([
      supabase
        .from('projects')
        .select('id, name, clients(name), expenses(amount)')
        .in('status', ['in_progress', 'on_hold'])
        .order('name'),
      supabase
        .from('projects')
        .select('id, name, client_id, clients(name), expenses(amount)')
        .eq('status', 'completed')
        .order('name'),
    ]);

    setActive(
      (act.data ?? []).map((p: any) => {
        const exps = p.expenses ?? [];
        return {
          id: p.id,
          name: p.name,
          client_name: p.clients?.name ?? '—',
          total: exps.reduce((s: number, e: any) => s + Number(e.amount), 0),
          count: exps.length,
        };
      }),
    );

    const cmap = new Map<string, HistClient>();
    (comp.data ?? []).forEach((p: any) => {
      if (!p.client_id) return;
      const exps = p.expenses ?? [];
      const total = exps.reduce((s: number, e: any) => s + Number(e.amount), 0);
      const cur = cmap.get(p.client_id) ?? { id: p.client_id, name: p.clients?.name ?? '—', project_count: 0, total: 0 };
      cur.project_count += 1;
      cur.total += total;
      cmap.set(p.client_id, cur);
    });
    setClients([...cmap.values()].sort((a, b) => a.name.localeCompare(b.name)));
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const { activeFiltered, clientsFiltered } = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return { activeFiltered: active, clientsFiltered: clients };
    return {
      activeFiltered: active.filter(
        (p) => p.name.toLowerCase().includes(s) || p.client_name.toLowerCase().includes(s),
      ),
      clientsFiltered: clients.filter((cl) => cl.name.toLowerCase().includes(s)),
    };
  }, [q, active, clients]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Buscador */}
      <View style={[styles.search, { backgroundColor: c.inputBg, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.icon} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={t('gastos.search')}
          placeholderTextColor={c.icon}
          style={[styles.searchInput, { color: c.text }]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
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
        }>
        {/* Proyectos en curso */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>{t('gastos.active_projects')}</Text>
        {activeFiltered.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.icon }]}>
            {q ? t('gastos.no_results') : t('gastos.no_active')}
          </Text>
        ) : (
          activeFiltered.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: '/gastos/proyecto/[id]', params: { id: p.id, name: p.name } })}
              style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.iconBadge, { backgroundColor: accent + '1A' }]}>
                <Ionicons name="briefcase-outline" size={20} color={accent} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[styles.sub, { color: c.icon }]} numberOfLines={1}>
                  {p.client_name} · {t('gastos.n_expenses', { n: p.count })}
                </Text>
              </View>
              <Text style={[styles.amount, { color: c.text }]}>{money(p.total)}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.icon} />
            </Pressable>
          ))
        )}

        {/* Historial de gastos (por cliente) */}
        <Text style={[styles.sectionTitle, { color: c.text, marginTop: 22 }]}>{t('gastos.history')}</Text>
        {clientsFiltered.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.icon }]}>
            {q ? t('gastos.no_results') : t('gastos.no_history')}
          </Text>
        ) : (
          clientsFiltered.map((cl) => (
            <Pressable
              key={cl.id}
              onPress={() => router.push({ pathname: '/gastos/cliente/[id]', params: { id: cl.id, name: cl.name } })}
              style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.avatar, { backgroundColor: accent + '1A' }]}>
                <Text style={[styles.avatarText, { color: accent }]}>{cl.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {cl.name}
                </Text>
                <Text style={[styles.sub, { color: c.icon }]} numberOfLines={1}>
                  {t('gastos.n_projects', { n: cl.project_count })}
                </Text>
              </View>
              <Text style={[styles.amount, { color: c.text }]}>{money(cl.total)}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.icon} />
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* Botón flotante: nuevo gasto */}
      <Pressable onPress={() => router.push('/gastos/nuevo')} style={[styles.fab, { backgroundColor: Brand }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  emptyText: { fontSize: 14, paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
  },
  iconBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13 },
  amount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
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
