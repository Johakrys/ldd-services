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

import { ExportButtons } from '@/components/ui/export-buttons';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useI18n } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { reportTables, shareExcel, sharePdf } from '@/lib/export';
import { money } from '@/lib/money';
import { photoDataUri } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

type Expense = { id: string; amount: number; reason: string; spent_at: string; receipt_path: string | null };

export default function GastosProyecto() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const [title, setTitle] = useState(params.name ?? '');
  const [clientName, setClientName] = useState('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [proj, exp] = await Promise.all([
      supabase.from('projects').select('name, clients(name)').eq('id', params.id).single(),
      supabase
        .from('expenses')
        .select('id, amount, reason, spent_at, receipt_path')
        .eq('project_id', params.id)
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);
    if (proj.data) {
      setTitle(proj.data.name);
      setClientName((proj.data.clients as { name: string } | null)?.name ?? '');
    }
    setExpenses(
      (exp.data ?? []).map((e) => ({
        id: e.id,
        amount: Number(e.amount),
        reason: e.reason,
        spent_at: e.spent_at,
        receipt_path: e.receipt_path,
      })),
    );
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
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  async function exportPdf() {
    if (exporting) return;
    setExporting(true);
    try {
      const headers = [t('gastos.reason'), t('gastos.date'), t('gastos.amount')];
      const rows = expenses.map((e) => [e.reason, fmtDate(e.spent_at), money(e.amount)]);
      // Incrusta la foto de cada factura que la tenga.
      const photos: { caption: string; dataUri: string }[] = [];
      for (const e of expenses) {
        if (!e.receipt_path) continue;
        const uri = await photoDataUri(e.receipt_path);
        if (uri) photos.push({ caption: `${e.reason} · ${money(e.amount)} · ${fmtDate(e.spent_at)}`, dataUri: uri });
      }
      const html = reportTables({
        title: `${t('nav.expenses')} — ${title}`,
        subtitle: clientName || undefined,
        tables: [{ headers, rows, totalLabel: t('gastos.total'), totalValue: money(total) }],
        photos,
        photosHeading: t('gastos.receipt'),
      });
      await sharePdf(html, 'Gastos');
    } finally {
      setExporting(false);
    }
  }

  async function exportExcel() {
    if (exporting) return;
    setExporting(true);
    try {
      const headers = [t('gastos.reason'), t('gastos.date'), t('gastos.amount'), t('gastos.receipt')];
      const rows = expenses.map((e) => [
        e.reason,
        fmtDate(e.spent_at),
        Number(e.amount),
        e.receipt_path ? '✓' : '',
      ]);
      await shareExcel({
        filename: ('gastos-' + (title || 'proyecto')).replace(/[^a-z0-9-]+/gi, '-').toLowerCase(),
        sheets: [{ name: t('nav.expenses').slice(0, 31), headers, rows }],
      });
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: title || t('gastos.project') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: title || t('gastos.project') }} />
      <FlatList
        data={expenses}
        keyExtractor={(e) => e.id}
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
          <View style={{ gap: 10, marginBottom: 4 }}>
            <View style={[styles.totalCard, { backgroundColor: accent }]}>
              <Text style={styles.totalLabel}>
                {clientName ? clientName + ' · ' : ''}
                {t('gastos.total')}
              </Text>
              <Text style={styles.totalValue}>{money(total)}</Text>
            </View>
            {expenses.length > 0 ? (
              exporting ? (
                <View style={styles.exportBusy}>
                  <ActivityIndicator color={accent} size="small" />
                </View>
              ) : (
                <ExportButtons onPdf={exportPdf} onExcel={exportExcel} />
              )
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>{t('gastos.empty_project')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/gastos/gasto/[id]', params: { id: item.id } })}
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.iconBadge, { backgroundColor: accent + '1A' }]}>
              <Ionicons name={item.receipt_path ? 'document-attach-outline' : 'receipt-outline'} size={20} color={accent} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.reason, { color: c.text }]} numberOfLines={1}>
                {item.reason}
              </Text>
              <Text style={[styles.date, { color: c.icon }]}>{fmtDate(item.spent_at)}</Text>
            </View>
            <Text style={[styles.amount, { color: c.text }]}>{money(item.amount)}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.icon} />
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push({ pathname: '/gastos/nuevo', params: { projectId: params.id } })}
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
  totalCard: { borderRadius: 16, padding: 20, marginBottom: 6 },
  exportBusy: { alignItems: 'center', paddingVertical: 10 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: 14 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, gap: 2 },
  reason: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: 12, paddingTop: 60, paddingHorizontal: 40 },
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
