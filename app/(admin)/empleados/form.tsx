import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useT } from '@/ctx/i18n';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ROLE_TKEY, ROLE_VALUES } from '@/lib/status';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/lib/types';

export default function EmpleadoForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Enums<'user_role'>>('employee');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [rate, setRate] = useState('');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    (async () => {
      const [emp, rateRow] = await Promise.all([
        supabase.from('employees').select('*').eq('id', id).single(),
        supabase.from('employee_rates').select('hourly_rate').eq('employee_id', id).maybeSingle(),
      ]);
      if (emp.data) {
        setFirstName(emp.data.first_name);
        setLastName(emp.data.last_name ?? '');
        setEmail(emp.data.email ?? '');
        setPosition(emp.data.position ?? '');
        setPhone(emp.data.phone ?? '');
        setActive(emp.data.is_active);
        setNotes(emp.data.notes ?? '');
        setUserId(emp.data.user_id);
        if (emp.data.user_id) {
          const prof = await supabase.from('profiles').select('role').eq('id', emp.data.user_id).single();
          if (prof.data) setRole(prof.data.role);
        }
      }
      if (rateRow.data?.hourly_rate != null) setRate(String(rateRow.data.hourly_rate));
      setLoading(false);
    })();
  }, [params.id]);

  function fail(msg: string) {
    setError(msg);
    setSaving(false);
  }

  const rateNum = () => (rate.trim() ? parseFloat(rate.replace(',', '.')) : null);

  async function saveEmployeeFields(employeeId: string) {
    const r = rateNum();
    if (r != null && !isNaN(r)) {
      const { error } = await supabase
        .from('employee_rates')
        .upsert({ employee_id: employeeId, hourly_rate: r }, { onConflict: 'employee_id' });
      if (error) throw new Error(error.message);
    }
  }

  async function create() {
    if (!email.trim() || !password.trim()) {
      fail(t('employees.cred_err'));
      return;
    }
    if (password.length < 6) {
      fail(t('employees.pass_err'));
      return;
    }
    const { data: uid, error } = await supabase.rpc('admin_create_user', {
      p_email: email.trim(),
      p_password: password,
      p_full_name: `${firstName} ${lastName}`.trim(),
      p_role: role,
    });
    if (error || !uid) {
      fail(error?.message ?? t('employees.create_err'));
      return;
    }
    // Completa la ficha creada por el trigger con los datos del formulario.
    const { data: empRow, error: uErr } = await supabase
      .from('employees')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        position: position.trim() || null,
        phone: phone.trim() || null,
        is_active: active,
        notes: notes.trim() || null,
      })
      .eq('user_id', uid)
      .select('id')
      .single();
    if (uErr || !empRow) {
      fail(uErr?.message ?? t('employees.acct_saved_err'));
      return;
    }
    await saveEmployeeFields(empRow.id);
    router.back();
  }

  async function update() {
    const { error } = await supabase
      .from('employees')
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        position: position.trim() || null,
        phone: phone.trim() || null,
        is_active: active,
        notes: notes.trim() || null,
      })
      .eq('id', params.id!);
    if (error) {
      fail(error.message);
      return;
    }
    if (userId) {
      const { error: rErr } = await supabase.from('profiles').update({ role }).eq('id', userId);
      if (rErr) {
        fail(t('employees.role_err') + rErr.message);
        return;
      }
    }
    await saveEmployeeFields(params.id!);
    router.back();
  }

  async function resetPassword() {
    if (resetPass.length < 6) {
      setResetMsg({ text: t('employees.pass_err'), ok: false });
      return;
    }
    if (!userId) return;
    setResetting(true);
    setResetMsg(null);
    const { error } = await supabase.rpc('admin_reset_password', {
      p_user_id: userId,
      p_password: resetPass,
    });
    setResetting(false);
    if (error) {
      setResetMsg({ text: error.message, ok: false });
      return;
    }
    setResetPass('');
    setResetMsg({ text: t('employees.reset_pw_ok'), ok: true });
  }

  async function save() {
    if (!firstName.trim()) {
      setError(t('employees.name_err'));
      return;
    }
    const r = rateNum();
    if (rate.trim() && (r == null || isNaN(r) || r < 0)) {
      setError(t('employees.rate_err'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await update();
      else await create();
    } catch (e) {
      fail(e instanceof Error ? e.message : t('common.unexpected'));
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: t('employees.edit') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <Stack.Screen options={{ title: isEdit ? t('employees.edit') : t('employees.new') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TextField label={t('employees.firstname')} required value={firstName} onChangeText={setFirstName} placeholder="Nombre" />
        <TextField label={t('employees.lastname')} value={lastName} onChangeText={setLastName} placeholder="Apellido" />

        <SelectField
          label={t('employees.role')}
          required
          value={role}
          options={ROLE_VALUES.map((v) => ({ value: v, label: t(ROLE_TKEY[v]) }))}
          onChange={(v) => setRole(v as Enums<'user_role'>)}
        />

        {isEdit ? (
          <TextField label={t('employees.email_ro')} value={email} editable={false} onChangeText={() => {}} />
        ) : (
          <>
            <TextField label={t('clients.email')} required value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" inputMode="email" />
            <TextField label={t('employees.password')} required value={password} onChangeText={setPassword} placeholder={t('employees.password_ph')} secureTextEntry autoCapitalize="none" />
          </>
        )}

        <TextField label={t('employees.position')} value={position} onChangeText={setPosition} placeholder={t('employees.position_ph')} />
        <TextField label={t('common.phone')} value={phone} onChangeText={setPhone} placeholder="(801) 555-0123" keyboardType="phone-pad" />
        <TextField label={t('employees.rate')} value={rate} onChangeText={setRate} placeholder={t('employees.rate_ph')} keyboardType="numeric" />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: c.text }]}>{t('employees.active')}</Text>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: accent }} />
        </View>

        <TextField label={t('common.notes')} value={notes} onChangeText={setNotes} placeholder={t('common.notes_ph')} multiline style={styles.multiline} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton title={isEdit ? t('employees.save_changes') : t('employees.create')} icon="checkmark" onPress={save} loading={saving} />
        </View>

        {isEdit && userId ? (
          <View style={[styles.resetSection, { borderTopColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>{t('employees.reset_pw_title')}</Text>
            <TextField
              label={t('employees.reset_pw_ph')}
              value={resetPass}
              onChangeText={setResetPass}
              placeholder={t('employees.password_ph')}
              secureTextEntry
              autoCapitalize="none"
            />
            {resetMsg ? (
              <Text style={[styles.error, { color: resetMsg.ok ? '#1E9E5A' : '#E5544B' }]}>{resetMsg.text}</Text>
            ) : null}
            <PrimaryButton title={t('employees.reset_pw')} icon="key-outline" variant="ghost" onPress={resetPassword} loading={resetting} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#E5544B', fontSize: 14 },
  actions: { marginTop: 8 },
  resetSection: { marginTop: 8, paddingTop: 20, borderTopWidth: 1, gap: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
});
