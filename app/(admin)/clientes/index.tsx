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
  TextInput,
  View,
} from 'react-native';

import { ExportButtons } from '@/components/ui/export-buttons';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportTables, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

type Client = Pick<
  Tables<'clients'>,
  'id' | 'name' | 'company_name' | 'phone' | 'email' | 'billing_address'
>;

type PropRow = {
  client_name: string;
  label: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
};

export default function ClientesList() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [clients, setClients] = useState<Client[]>([]);
  const [props, setProps] = useState<PropRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    const [cl, pr] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, company_name, phone, email, billing_address')
        .order('name'),
      supabase
        .from('properties')
        .select('label, address, city, zip_code, clients(name)')
        .order('label'),
    ]);
    setClients(cl.data ?? []);
    setProps(
      (pr.data ?? []).map((p) => ({
        client_name: (p.clients as { name: string } | null)?.name ?? '—',
        label: p.label,
        address: p.address,
        city: p.city,
        zip: p.zip_code,
      })),
    );
    setLoading(false);
  }, []);

  const clientHeaders = [
    t('clients.name'),
    t('clients.company'),
    t('clients.email'),
    t('common.phone'),
    t('clients.billing'),
  ];
  const propHeaders = [
    t('props.client'),
    t('props.label'),
    t('props.address'),
    t('props.city'),
    t('props.zip'),
  ];

  function clientRows() {
    return clients.map((cl) => [
      cl.name,
      cl.company_name ?? '—',
      cl.email ?? '—',
      cl.phone ?? '—',
      cl.billing_address ?? '—',
    ]);
  }
  function propRows() {
    return props.map((p) => [
      p.client_name,
      p.label ?? '—',
      p.address ?? '—',
      p.city ?? '—',
      p.zip ?? '—',
    ]);
  }

  async function exportPdf() {
    await sharePdf(
      reportTables({
        title: t('nav.clients'),
        tables: [
          { heading: t('nav.clients'), headers: clientHeaders, rows: clientRows() },
          { heading: t('clients.properties'), headers: propHeaders, rows: propRows() },
        ],
      }),
      'Clientes',
    );
  }
  async function exportExcel() {
    await shareExcel({
      filename: 'clientes',
      sheets: [
        { name: t('nav.clients'), headers: clientHeaders, rows: clientRows() },
        { name: t('clients.properties'), headers: propHeaders, rows: propRows() },
      ],
    });
  }

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients;
    return clients.filter(
      (cl) =>
        cl.name.toLowerCase().includes(s) ||
        (cl.company_name ?? '').toLowerCase().includes(s),
    );
  }, [q, clients]);

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
          placeholder={t('clients.search')}
          placeholderTextColor={c.icon}
          style={[styles.searchInput, { color: c.text }]}
        />
      </View>

      {clients.length > 0 ? (
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
            <Ionicons name="people-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>
              {q ? t('clients.no_results') : t('clients.empty')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/clientes/[id]', params: { id: item.id } })}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.avatar, { backgroundColor: accent + '1A' }]}>
              <Text style={[styles.avatarText, { color: accent }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.sub, { color: c.icon }]} numberOfLines={1}>
                {item.company_name || item.phone || t('clients.no_extra')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.icon} />
          </Pressable>
        )}
      />

      {/* Botón flotante para crear */}
      <Pressable
        onPress={() => router.push('/clientes/nuevo')}
        style={[styles.fab, { backgroundColor: Brand }]}>
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
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  rowInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13 },
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
