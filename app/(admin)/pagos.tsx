import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
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
import { confirm } from '@/lib/confirm';
import { reportHtml, shareExcel, sharePdf } from '@/lib/export';
import { supabase } from '@/lib/supabase';

type Row = {
  employee_id: string;
  full_name: string;
  unpaid_hours: number;
  hourly_rate: number | null;
  amount_pending: number;
};
type Week = { pay_friday: string; unpaid_hours: number; amount_pending: number };
type ProjHours = { project_name: string; address: string | null; unpaid_hours: number };
type Payment = { pay_friday: string; paid_at: string | null; hours: number; amount: number };

export default function PagosScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const { t, lang } = useI18n();
  const locale = lang === 'en' ? 'en-US' : 'es-ES';

  const [view, setView] = useState<'pending' | 'history'>('pending');
  const [rows, setRows] = useState<Row[]>([]);
  const [weeks, setWeeks] = useState<Record<string, Week[]>>({});
  const [projects, setProjects] = useState<Record<string, ProjHours[]>>({});
  const [payments, setPayments] = useState<Record<string, Payment[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [totals, wk, proj, pay] = await Promise.all([
      supabase
        .from('v_employee_hours')
        .select('employee_id, full_name, unpaid_hours, hourly_rate, amount_pending')
        .order('full_name'),
      supabase
        .from('v_employee_week_hours')
        .select('employee_id, pay_friday, unpaid_hours, amount_pending')
        .order('pay_friday'),
      supabase
        .from('v_employee_project_hours')
        .select('employee_id, project_name, project_address, project_city, unpaid_hours')
        .order('project_name'),
      supabase
        .from('v_employee_payments')
        .select('employee_id, pay_friday, paid_at, hours, amount')
        .order('pay_friday', { ascending: false }),
    ]);
    setRows((totals.data as Row[] | null) ?? []);

    const weekMap: Record<string, Week[]> = {};
    (wk.data ?? []).forEach((r) => {
      if (!r.employee_id || !r.pay_friday || Number(r.unpaid_hours) <= 0) return;
      (weekMap[r.employee_id] ??= []).push({
        pay_friday: r.pay_friday,
        unpaid_hours: Number(r.unpaid_hours),
        amount_pending: Number(r.amount_pending),
      });
    });
    setWeeks(weekMap);

    const projMap: Record<string, ProjHours[]> = {};
    (proj.data ?? []).forEach((r) => {
      if (!r.employee_id) return;
      (projMap[r.employee_id] ??= []).push({
        project_name: r.project_name ?? '—',
        address: [r.project_address, r.project_city].filter(Boolean).join(', ') || null,
        unpaid_hours: Number(r.unpaid_hours),
      });
    });
    setProjects(projMap);

    const payMap: Record<string, Payment[]> = {};
    (pay.data ?? []).forEach((r) => {
      if (!r.employee_id || !r.pay_friday) return;
      (payMap[r.employee_id] ??= []).push({
        pay_friday: r.pay_friday,
        paid_at: r.paid_at,
        hours: Number(r.hours),
        amount: Number(r.amount),
      });
    });
    setPayments(payMap);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function fmtDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00Z').toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  }
  function fmtPaidAt(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function weekLabel(friday: string): string {
    const f = new Date(friday + 'T00:00:00Z');
    const s = new Date(f);
    s.setUTCDate(s.getUTCDate() - 6);
    return `${fmtDate(s.toISOString().slice(0, 10))} – ${fmtDate(friday)}`;
  }

  async function payWeek(item: Row, week: Week) {
    const ok = await confirm(
      t('pay.mark_paid'),
      t('pay.mark_paid_msg', { amount: money(week.amount_pending), name: item.full_name }),
      t('pay.pay'),
      t('pay.cancel'),
    );
    if (!ok) return;
    setBusyKey(item.employee_id + week.pay_friday);
    const friday = new Date(week.pay_friday + 'T00:00:00Z');
    const start = new Date(friday);
    start.setUTCDate(start.getUTCDate() - 6);
    const endEx = new Date(friday);
    endEx.setUTCDate(endEx.getUTCDate() + 1);
    await supabase
      .from('time_entries')
      .update({ is_paid: true, paid_at: new Date().toISOString() })
      .eq('employee_id', item.employee_id)
      .eq('is_paid', false)
      .gte('clock_in', start.toISOString())
      .lt('clock_in', endEx.toISOString());
    await load();
    setBusyKey(null);
  }

  const pendingCount = rows.filter((r) => Number(r.amount_pending) > 0).length;
  const totalPaid = Object.values(payments)
    .flat()
    .reduce((s, p) => s + p.amount, 0);

  const pendingHeaders = [t('pay.employee'), t('pay.hours'), t('pay.rate'), t('pay.due')];
  const historyHeaders = [
    t('pay.employee'),
    t('pay.week'),
    t('pay.paid_date'),
    t('pay.hours'),
    t('pay.amount'),
  ];

  function pendingRows() {
    const src = rows.filter((r) => r.amount_pending > 0);
    return {
      str: src.map((r) => [
        r.full_name,
        fmtHours(r.unpaid_hours),
        r.hourly_rate != null ? money(r.hourly_rate) : '—',
        money(r.amount_pending),
      ]),
      xlsx: src.map((r) => [r.full_name, Number(r.unpaid_hours), r.hourly_rate ?? 0, Number(r.amount_pending)]),
    };
  }

  function historyRows() {
    const str: string[][] = [];
    const xlsx: (string | number)[][] = [];
    rows.forEach((r) => {
      (payments[r.employee_id] ?? []).forEach((p) => {
        str.push([r.full_name, weekLabel(p.pay_friday), fmtPaidAt(p.paid_at), fmtHours(p.hours), money(p.amount)]);
        xlsx.push([r.full_name, weekLabel(p.pay_friday), fmtPaidAt(p.paid_at), Number(p.hours), Number(p.amount)]);
      });
    });
    return { str, xlsx };
  }

  async function exportPdf() {
    if (view === 'history') {
      await sharePdf(
        reportHtml({
          title: t('pay.tab_history'),
          headers: historyHeaders,
          rows: historyRows().str,
          totalLabel: t('pay.total_paid'),
          totalValue: money(totalPaid),
        }),
        'Historial de pagos',
      );
      return;
    }
    await sharePdf(
      reportHtml({
        title: t('pay.report_title'),
        headers: pendingHeaders,
        rows: pendingRows().str,
        totalLabel: t('pay.total_pending'),
        totalValue: money(rows.reduce((s, r) => s + Number(r.amount_pending), 0)),
      }),
      'Pagos a empleados',
    );
  }

  async function exportExcel() {
    if (view === 'history') {
      await shareExcel({
        filename: 'historial-pagos',
        sheets: [{ name: t('pay.tab_history'), headers: historyHeaders, rows: historyRows().xlsx }],
      });
      return;
    }
    await shareExcel({
      filename: 'pagos-pendientes',
      sheets: [{ name: t('nav.payments'), headers: pendingHeaders, rows: pendingRows().xlsx }],
    });
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  const isHistory = view === 'history';

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.employee_id}
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
          <View style={{ gap: 12, marginBottom: 4 }}>
            <View style={[styles.totalCard, { backgroundColor: accent }]}>
              <Text style={styles.totalLabel}>
                {isHistory ? t('pay.total_paid') : t('dash.pending_pay')}
              </Text>
              <Text style={styles.totalValue}>{isHistory ? money(totalPaid) : pendingCount}</Text>
            </View>

            {/* Pestañas */}
            <View style={[styles.tabs, { backgroundColor: scheme === 'dark' ? '#1A212C' : '#EDEFF3', borderColor: c.border }]}>
              {(['pending', 'history'] as const).map((v) => {
                const on = view === v;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setView(v)}
                    style={[styles.tab, on && { backgroundColor: accent }]}>
                    <Text style={{ color: on ? '#fff' : c.icon, fontWeight: '600', fontSize: 13 }}>
                      {v === 'pending' ? t('pay.tab_pending') : t('pay.tab_history')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {rows.length > 0 ? <ExportButtons onPdf={exportPdf} onExcel={exportExcel} /> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cash-outline" size={30} color={c.icon} />
            <Text style={[styles.emptyText, { color: c.icon }]}>{t('pay.no_emp')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded.has(item.employee_id);
          const empWeeks = weeks[item.employee_id] ?? [];
          const empProjects = (projects[item.employee_id] ?? []).filter((p) => p.unpaid_hours > 0);
          const empPayments = payments[item.employee_id] ?? [];
          const pending = Number(item.amount_pending);
          const paidTotal = empPayments.reduce((s, p) => s + p.amount, 0);

          return (
            <View style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
              <Pressable onPress={() => toggle(item.employee_id)} style={styles.rowHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text style={[styles.sub, { color: c.icon }]}>
                    {isHistory
                      ? `${empPayments.length} · ${t('nav.payments')}`
                      : empWeeks.length > 0
                        ? t('pay.pending_weeks', { n: empWeeks.length })
                        : t('pay.settled')}
                  </Text>
                </View>
                <Text style={[styles.amount, { color: isHistory ? c.text : pending > 0 ? c.text : '#1E9E5A' }]}>
                  {money(isHistory ? paidTotal : pending)}
                </Text>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={c.icon}
                  style={{ marginLeft: 8 }}
                />
              </Pressable>

              {isOpen && isHistory ? (
                <View style={[styles.detail, { borderTopColor: c.border }]}>
                  {empPayments.length === 0 ? (
                    <Text style={[styles.detailEmpty, { color: c.icon }]}>{t('pay.no_history')}</Text>
                  ) : (
                    empPayments.map((p) => (
                      <View key={p.pay_friday} style={styles.detailRow}>
                        <Ionicons name="checkmark-circle" size={16} color="#1E9E5A" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.detailProj, { color: c.text }]}>{weekLabel(p.pay_friday)}</Text>
                          <Text style={[styles.detailAddr, { color: c.icon }]}>
                            {t('pay.paid_on', { date: fmtPaidAt(p.paid_at) })} · {fmtHours(p.hours)} h
                          </Text>
                        </View>
                        <Text style={[styles.detailHours, { color: c.text }]}>{money(p.amount)}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : null}

              {isOpen && !isHistory ? (
                <View style={[styles.detail, { borderTopColor: c.border }]}>
                  <Text style={[styles.detailTitle, { color: c.icon }]}>{t('pay.weeks_to_pay')}</Text>
                  {empWeeks.length === 0 ? (
                    <View style={styles.settledRow}>
                      <Ionicons name="checkmark-done-circle" size={18} color="#1E9E5A" />
                      <Text style={{ color: '#1E9E5A', fontWeight: '700' }}>{t('pay.settled')}</Text>
                    </View>
                  ) : (
                    empWeeks.map((w) => {
                      const busy = busyKey === item.employee_id + w.pay_friday;
                      return (
                        <View key={w.pay_friday} style={[styles.weekRow, { borderColor: c.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.weekRange, { color: c.text }]}>{weekLabel(w.pay_friday)}</Text>
                            <Text style={[styles.weekSub, { color: c.icon }]}>
                              {t('pay.pays_friday', { date: fmtDate(w.pay_friday) })} · {fmtHours(w.unpaid_hours)} h
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => payWeek(item, w)}
                            disabled={busy}
                            style={[styles.payBtn, { backgroundColor: accent, opacity: busy ? 0.6 : 1 }]}>
                            {busy ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <Text style={styles.payBtnText}>
                                {t('pay.pay')} · {money(w.amount_pending)}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })
                  )}

                  {empProjects.length > 0 ? (
                    <>
                      <Text style={[styles.detailTitle, { color: c.icon, marginTop: 8 }]}>
                        {t('pay.by_project')}
                      </Text>
                      {empProjects.map((d) => (
                        <View key={d.project_name} style={styles.detailRow}>
                          <Ionicons name="briefcase-outline" size={15} color={accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.detailProj, { color: c.text }]} numberOfLines={1}>
                              {d.project_name}
                            </Text>
                            {d.address ? (
                              <Text style={[styles.detailAddr, { color: c.icon }]} numberOfLines={1}>
                                {d.address}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.detailHours, { color: c.text }]}>{fmtHours(d.unpaid_hours)} h</Text>
                        </View>
                      ))}
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function money(n: number): string {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtHours(n: number): string {
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 40, gap: 10 },
  totalCard: { borderRadius: 16, padding: 20 },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#fff', fontSize: 34, fontWeight: '800', marginTop: 4 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  export: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  row: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  detail: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  detailTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  weekRange: { fontSize: 14, fontWeight: '700' },
  weekSub: { fontSize: 12, marginTop: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailProj: { fontSize: 14, fontWeight: '600' },
  detailAddr: { fontSize: 12, marginTop: 1 },
  detailHours: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  detailEmpty: { fontSize: 13 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  settledRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  name: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 13, marginTop: 2 },
  amount: { fontSize: 18, fontWeight: '800' },
  empty: { alignItems: 'center', gap: 12, paddingTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, textAlign: 'center' },
});
