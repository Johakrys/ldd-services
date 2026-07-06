import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MultiSelectField } from '@/components/ui/multi-select-field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Emp = { id: string; name: string };

export default function TareaForm() {
  const params = useLocalSearchParams<{ projectId?: string; taskId?: string }>();
  const isEdit = !!params.taskId;
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [original, setOriginal] = useState<string[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .order('first_name')
      .then(({ data }) =>
        setEmployees((data ?? []).map((e) => ({ id: e.id, name: `${e.first_name} ${e.last_name ?? ''}`.trim() }))),
      );
  }, []);

  // Modo edición: cargar la tarea y sus asignados.
  useEffect(() => {
    const tid = params.taskId;
    if (!tid) return;
    (async () => {
      const [job, asg] = await Promise.all([
        supabase.from('jobs').select('title, description').eq('id', tid).single(),
        supabase.from('job_assignments').select('employee_id').eq('job_id', tid),
      ]);
      if (job.data) {
        setTitle(job.data.title);
        setDescription(job.data.description ?? '');
      }
      const ids = (asg.data ?? []).map((a) => a.employee_id);
      setSelected(ids);
      setOriginal(ids);
      setLoading(false);
    })();
  }, [params.taskId]);

  async function save() {
    if (!title.trim()) {
      setError(t('tasks.title_err'));
      return;
    }
    setSaving(true);
    setError(null);

    if (isEdit) {
      const tid = params.taskId!;
      const { error } = await supabase
        .from('jobs')
        .update({ title: title.trim(), description: description.trim() || null })
        .eq('id', tid);
      if (error) return fail(error.message);

      const toAdd = selected.filter((id) => !original.includes(id));
      const toRemove = original.filter((id) => !selected.includes(id));
      if (toRemove.length > 0) {
        const { error: dErr } = await supabase
          .from('job_assignments')
          .delete()
          .eq('job_id', tid)
          .in('employee_id', toRemove);
        if (dErr) return fail(dErr.message);
      }
      if (toAdd.length > 0) {
        const { error: aErr } = await supabase
          .from('job_assignments')
          .insert(toAdd.map((employee_id) => ({ job_id: tid, employee_id })));
        if (aErr) return fail(aErr.message);
      }
      router.back();
      return;
    }

    // Crear
    const { data, error } = await supabase
      .from('jobs')
      .insert({ project_id: params.projectId!, title: title.trim(), description: description.trim() || null, status: 'scheduled' })
      .select('id')
      .single();
    if (error || !data) return fail(error?.message ?? t('tasks.create_err'));
    if (selected.length > 0) {
      const { error: aErr } = await supabase
        .from('job_assignments')
        .insert(selected.map((employee_id) => ({ job_id: data.id, employee_id })));
      if (aErr) return fail(t('tasks.assign_err') + aErr.message);
    }
    router.back();
  }

  function fail(msg: string) {
    setError(msg);
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: t('tasks.edit') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <Stack.Screen options={{ title: isEdit ? t('tasks.edit') : t('projects.new_task') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TextField label={t('tasks.title_label')} required value={title} onChangeText={setTitle} placeholder={t('tasks.title_ph')} />
        <TextField
          label={t('projects.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('tasks.desc_ph')}
          multiline
          style={styles.multiline}
        />

        <MultiSelectField
          label={t('tasks.assign')}
          values={selected}
          options={employees.map((e) => ({ value: e.id, label: e.name }))}
          placeholder={t('tasks.choose_emp')}
          emptyText={t('tasks.no_emp')}
          onChange={setSelected}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={isEdit ? t('props.save_changes') : t('tasks.create')}
            icon="checkmark"
            onPress={save}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#E5544B', fontSize: 14 },
  actions: { marginTop: 8 },
});
