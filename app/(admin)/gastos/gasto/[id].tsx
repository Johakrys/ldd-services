import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/ui/photo-viewer';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useI18n } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { confirm } from '@/lib/confirm';
import { money } from '@/lib/money';
import { signedPhotoUrl } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

type Detail = {
  amount: number;
  reason: string;
  spent_at: string;
  receipt_path: string | null;
  project_name: string;
  client_name: string;
};

export default function GastoDetalle() {
  const params = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const { role } = useSession();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [viewer, setViewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('expenses')
      .select('amount, reason, spent_at, receipt_path, projects(name, clients(name))')
      .eq('id', params.id)
      .single();
    if (data) {
      const proj = data.projects as { name: string; clients: { name: string } | null } | null;
      const d: Detail = {
        amount: Number(data.amount),
        reason: data.reason,
        spent_at: data.spent_at,
        receipt_path: data.receipt_path,
        project_name: proj?.name ?? '—',
        client_name: proj?.clients?.name ?? '—',
      };
      setDetail(d);
      if (d.receipt_path) setPhotoUrl(await signedPhotoUrl(d.receipt_path));
    }
    setLoading(false);
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00Z').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  async function remove() {
    const ok = await confirm(t('gastos.delete'), t('gastos.delete_confirm'), t('gastos.delete'), t('pay.cancel'));
    if (!ok) return;
    setDeleting(true);
    const { error } = await supabase.from('expenses').delete().eq('id', params.id);
    setDeleting(false);
    if (!error) router.back();
  }

  if (loading || !detail) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: t('gastos.detail_title') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ title: t('gastos.detail_title') }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Monto destacado */}
        <View style={[styles.amountCard, { backgroundColor: accent }]}>
          <Text style={styles.amountValue}>{money(detail.amount)}</Text>
          <Text style={styles.amountReason}>{detail.reason}</Text>
        </View>

        {/* Datos */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Field icon="briefcase-outline" label={t('gastos.project')} value={detail.project_name} c={c} accent={accent} />
          <Field icon="person-outline" label={t('gastos.client')} value={detail.client_name} c={c} accent={accent} />
          <Field icon="calendar-outline" label={t('gastos.date')} value={fmtDate(detail.spent_at)} c={c} accent={accent} />
        </View>

        {/* Foto de la factura */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>{t('gastos.receipt')}</Text>
        {detail.receipt_path ? (
          photoUrl ? (
            <Pressable onPress={() => setViewer(true)} style={styles.thumbWrap}>
              <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </View>
            </Pressable>
          ) : (
            <ActivityIndicator color={accent} style={{ paddingVertical: 20 }} />
          )
        ) : (
          <Text style={[styles.noReceipt, { color: c.icon }]}>{t('gastos.no_receipt')}</Text>
        )}

        {role === 'admin' ? (
          <View style={{ marginTop: 24 }}>
            <PrimaryButton title={t('gastos.delete')} icon="trash-outline" variant="danger" onPress={remove} loading={deleting} />
          </View>
        ) : null}
      </ScrollView>

      <PhotoViewer uri={viewer ? photoUrl : null} visible={viewer} onClose={() => setViewer(false)} />
    </View>
  );
}

function Field({
  icon,
  label,
  value,
  c,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  c: (typeof Colors)['light'];
  accent: string;
}) {
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: c.icon }]}>{label}</Text>
        <Text style={[styles.fieldValue, { color: c.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  amountCard: { borderRadius: 16, padding: 22 },
  amountValue: { color: '#fff', fontSize: 36, fontWeight: '800' },
  amountReason: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 16, padding: 8 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, fontWeight: '600', marginTop: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  thumbWrap: { borderRadius: 14, overflow: 'hidden' },
  thumb: { width: '100%', height: 300 },
  thumbBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 6,
  },
  noReceipt: { fontSize: 14, fontStyle: 'italic' },
});
