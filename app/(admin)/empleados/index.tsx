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
import { useT } from '@/ctx/i18n';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportHtml, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

type Emp = Pick<
  Tables<'employees'>,
  'id' | 'first_name' | 'last_name' | 'position' | 'email' | 'phone' | 'hire_date' | 'is_active'
>;

export default function EmpleadosList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [rows, setRows] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, position, email, phone, hire_date, is_active')
      .order('first_name');
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exportHeaders = [
    t('clients.name'),
    t('employees.position'),
    t('clients.email'),
    t('common.phone'),
    t('common.status'),
  ];

  function exportRows() {
    return rows.map((e) => [
      `${e.first_name} ${e.last_name ?? ''}`.trim(),
      e.position ?? '—',
      e.email ?? '—',
      e.phone ?? '—',
      e.is_active ? t('employees.active_short') : t('employees.inactive'),
    ]);
  }

  async function exportPdf() {
    await sharePdf(
      reportHtml({ title: t('nav.employees'), headers: exportHeaders, rows: exportRows() }),
      'Empleados',
    );
  }
  async function exportExcel() {
    await shareExcel({
      filename: 'empleados',
      sheets: [{ name: t('nav.employees'), headers: exportHeaders, rows: exportRows() }],
    });
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
        ListHeaderComponent={
          rows.length > 0 ? (
            <View style={{ marginBottom: 4 }}>
              <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="construct-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>
              {t('employees.empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const name = `${item.first_name} ${item.last_name ?? ''}`.trim();
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/empleados/form', params: { id: item.id } })}
              style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.avatar, { backgroundColor: accent + '1A' }]}>
                <Text style={[styles.avatarText, { color: accent }]}>
                  {item.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.sub, { color: c.icon }]} numberOfLines={1}>
                  {item.position || t('employees.no_position')}
                </Text>
              </View>
              {!item.is_active ? (
                <Text style={[styles.inactive, { color: c.icon, borderColor: c.border }]}>{t('employees.inactive')}</Text>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={c.icon} />
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => router.push('/empleados/form')}
        style={[styles.fab, { backgroundColor: Brand }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 100, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: 14 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13 },
  inactive: { fontSize: 11, fontWeight: '600', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
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
