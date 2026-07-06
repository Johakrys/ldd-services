import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { PROJECT_STATUS } from '@/lib/status';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

type Client = Tables<'clients'>;
type Property = Tables<'properties'>;
type Project = Pick<Tables<'projects'>, 'id' | 'name' | 'status'>;

export default function ClienteDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [client, setClient] = useState<Client | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cli, props, projs] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('properties').select('*').eq('client_id', id).order('created_at'),
      supabase
        .from('projects')
        .select('id, name, status')
        .eq('client_id', id)
        .order('created_at', { ascending: false }),
    ]);
    setClient(cli.data);
    setProperties(props.data ?? []);
    setProjects(projs.data ?? []);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.icon }}>{t('clients.not_found')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: client.name }} />

      {/* Info */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>{client.name}</Text>
        {client.company_name ? (
          <Text style={[styles.subtitle, { color: c.icon }]}>{client.company_name}</Text>
        ) : null}
        <View style={styles.infoList}>
          {client.phone ? (
            <InfoRow icon="call-outline" text={client.phone} color={c} onPress={() => Linking.openURL(`tel:${client.phone}`)} />
          ) : null}
          {client.email ? (
            <InfoRow icon="mail-outline" text={client.email} color={c} onPress={() => Linking.openURL(`mailto:${client.email}`)} />
          ) : null}
          {client.billing_address ? (
            <InfoRow icon="location-outline" text={client.billing_address} color={c} />
          ) : null}
          {client.notes ? <InfoRow icon="document-text-outline" text={client.notes} color={c} /> : null}
        </View>
      </View>

      {/* Propiedades */}
      <SectionHeader
        title={t('clients.properties')}
        count={properties.length}
        color={c}
        accent={accent}
        onAdd={() => router.push({ pathname: '/clientes/propiedad', params: { clientId: id } })}
      />
      {properties.length === 0 ? (
        <Text style={[styles.emptyLine, { color: c.icon }]}>{t('clients.no_props')}</Text>
      ) : (
        properties.map((p) => (
          <Pressable
            key={p.id}
            onPress={() =>
              router.push({ pathname: '/clientes/propiedad', params: { propertyId: p.id } })
            }
            style={[styles.itemRow, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="home-outline" size={20} color={accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: c.text }]}>{p.label || p.address}</Text>
              <Text style={[styles.itemSub, { color: c.icon }]} numberOfLines={1}>
                {[p.address, p.city].filter(Boolean).join(', ')}
              </Text>
            </View>
            <Ionicons name="create-outline" size={19} color={c.icon} />
          </Pressable>
        ))
      )}

      {/* Proyectos */}
      <SectionHeader title={t('clients.projects')} count={projects.length} color={c} accent={accent} />
      {projects.length === 0 ? (
        <Text style={[styles.emptyLine, { color: c.icon }]}>{t('clients.no_projects')}</Text>
      ) : (
        projects.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => router.push({ pathname: '/proyectos/[id]', params: { id: p.id } })}
            style={[styles.itemRow, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="briefcase-outline" size={20} color={accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: c.text }]}>{p.name}</Text>
            </View>
            <Text style={[styles.badge, { color: accent, backgroundColor: accent + '1A' }]}>
              {t(PROJECT_STATUS[p.status]?.tkey ?? 'status.lead')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={c.icon} />
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function InfoRow({
  icon,
  text,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  color: (typeof Colors)['light'];
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={color.icon} />
      <Text style={[styles.infoText, { color: onPress ? Brand : color.text }]}>{text}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  count,
  color,
  accent,
  onAdd,
}: {
  title: string;
  count: number;
  color: (typeof Colors)['light'];
  accent: string;
  onAdd?: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: color.text }]}>
        {title} <Text style={{ color: color.icon }}>({count})</Text>
      </Text>
      {onAdd ? (
        <Pressable onPress={onAdd} style={[styles.addBtn, { backgroundColor: accent + '1A' }]} hitSlop={6}>
          <Ionicons name="add" size={18} color={accent} />
          <Text style={[styles.addText, { color: accent }]}>{t('common.add')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 4 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 15, marginBottom: 6 },
  infoList: { gap: 10, marginTop: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  addText: { fontSize: 13, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
  },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 13 },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyLine: { fontSize: 14, paddingVertical: 4 },
});
