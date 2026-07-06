import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField, type Option } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useT } from '@/ctx/i18n';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const ACTIVE = ['lead', 'quoted', 'approved', 'in_progress', 'on_hold'];

export default function RegistrarHoras() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const t = useT();

  const [employees, setEmployees] = useState<Option[]>([]);
  const [projects, setProjects] = useState<Option[]>([]);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name')
      .then(({ data }) =>
        setEmployees(
          (data ?? []).map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name ?? ''}`.trim() })),
        ),
      );
    supabase
      .from('projects')
      .select('id, name, status')
      .order('name')
      .then(({ data }) =>
        setProjects(
          (data ?? []).filter((p) => ACTIVE.includes(p.status)).map((p) => ({ value: p.id, label: p.name })),
        ),
      );
  }, []);

  async function save() {
    if (!employeeId || !projectId) {
      setError(t('hours.emp_proj_err'));
      return;
    }
    const h = parseFloat(hours.replace(',', '.'));
    if (!hours.trim() || isNaN(h) || h <= 0) {
      setError(t('hours.hours_err'));
      return;
    }
    setSaving(true);
    setError(null);

    // Las horas se guardan como intervalo (clock_in → clock_out); la columna
    // "hours" de la base se calcula sola y descuenta del proyecto.
    const end = new Date();
    const start = new Date(end.getTime() - h * 3600 * 1000);
    const { error } = await supabase.from('time_entries').insert({
      employee_id: employeeId,
      project_id: projectId,
      clock_in: start.toISOString(),
      clock_out: end.toISOString(),
      notes: notes.trim() || null,
    });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <SelectField label={t('hours.employee')} required value={employeeId} options={employees} placeholder={t('hours.choose_emp')} emptyText={t('hours.no_emp')} onChange={setEmployeeId} />
        <SelectField label={t('hours.project')} required value={projectId} options={projects} placeholder={t('hours.choose_proj')} emptyText={t('hours.no_proj')} onChange={setProjectId} />
        <TextField label={t('hours.hours_worked')} required value={hours} onChangeText={setHours} placeholder={t('hours.hours_worked_ph')} keyboardType="numeric" />
        <TextField label={t('hours.note')} value={notes} onChangeText={setNotes} placeholder="Nota (opcional)" multiline style={styles.multiline} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton title={t('hours.register')} icon="checkmark" onPress={save} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#E5544B', fontSize: 14 },
  actions: { marginTop: 8 },
});
