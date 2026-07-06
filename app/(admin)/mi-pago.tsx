import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useI18n } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Week = { pay_friday: string; unpaid_hours: number; amount_pending: number };
type Payment = { pay_friday: string; paid_at: string | null; hours: number; amount: number };

export default function MiPago() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';
  const { session } = useSession();

  const [weeks, setWeeks] = useState<Week[]>([]);
  const [history, setHistory] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const emp = await supabase.from('employees').select('id').eq('user_id', session?.user.id ?? '').maybeSingle();
    const empId = emp.data?.id;
    if (!empId) {
      setWeeks([]);
      setHistory([]);
      setLoading(false);
      return;
    }
    const [wk, pay] = await Promise.all([
      supabase.from('v_employee_week_hours').select('pay_friday, unpaid_hours, amount_pending').eq('employee_id', empId).order('pay_friday'),
      supabase.from('v_employee_payments').select('pay_friday, paid_at, hours, amount').eq('employee_id', empId).order('pay_friday', { ascending: false }),
    ]);
    setWeeks(
      (wk.data ?? [])
        .filter((r) => r.pay_friday && Number(r.unpaid_hours) > 0)
        .map((r) => ({ pay_friday: r.pay_friday as string, unpaid_hours: Number(r.unpaid_hours), amount_pending: Number(r.amount_pending) })),
    );
    setHistory(
      (pay.data ?? [])
        .filter((r) => r.pay_friday)
        .map((r) => ({ pay_friday: r.pay_friday as string, paid_at: r.paid_at, hours: Number(r.hours), amount: Number(r.amount) })),
    );
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function fmtD(dateStr: string) {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
  }
  function fmtPaid(iso: string | null) {
    return iso ? new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  }
  function weekLabel(friday: string) {
    const f = new Date(friday + 'T00:00:00Z');
    const s = new Date(f);
    s.setUTCDate(s.getUTCDate() - 6);
    return `${fmtD(s.toISOString().slice(0, 10))} – ${fmtD(friday)}`;
  }

  const totalPending = weeks.reduce((s, w) => s + w.amount_pending, 0);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
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
      <View style={[styles.totalCard, { backgroundColor: accent }]}>
        <Text style={styles.totalLabel}>{t('pay.total_pending')}</Text>
        <Text style={styles.totalValue}>{money(totalPending)}</Text>
      </View>

      <Text style={[styles.section, { color: c.text }]}>{t('pay.weeks_to_pay')}</Text>
      {weeks.length === 0 ? (
        <View style={styles.settledRow}>
          <Ionicons name="checkmark-done-circle" size={18} color="#1E9E5A" />
          <Text style={{ color: '#1E9E5A', fontWeight: '700' }}>{t('pay.settled')}</Text>
        </View>
      ) : (
        weeks.map((w) => (
          <View key={w.pay_friday} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{weekLabel(w.pay_friday)}</Text>
              <Text style={[styles.rowSub, { color: c.icon }]}>
                {t('pay.pays_friday', { date: fmtD(w.pay_friday) })} · {fmt(w.unpaid_hours)} h
              </Text>
            </View>
            <Text style={[styles.amount, { color: c.text }]}>{money(w.amount_pending)}</Text>
          </View>
        ))
      )}

      <Text style={[styles.section, { color: c.text, marginTop: 20 }]}>{t('pay.tab_history')}</Text>
      {history.length === 0 ? (
        <Text style={[styles.empty, { color: c.icon }]}>{t('pay.no_history')}</Text>
      ) : (
        history.map((p) => (
          <View key={p.pay_friday} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="checkmark-circle" size={18} color="#1E9E5A" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.text }]}>{weekLabel(p.pay_friday)}</Text>
              <Text style={[styles.rowSub, { color: c.icon }]}>
                {t('pay.paid_on', { date: fmtPaid(p.paid_at) })} · {fmt(p.hours)} h
              </Text>
            </View>
            <Text style={[styles.amount, { color: c.text }]}>{money(p.amount)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function money(n: number): string {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 10 },
  totalCard: { borderRadius: 16, padding: 20 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
  section: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSub: { fontSize: 12, marginTop: 1 },
  amount: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  settledRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  empty: { fontSize: 14, paddingVertical: 4 },
});
