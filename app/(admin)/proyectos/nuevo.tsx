import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField, type Option } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { PRIORITY, PRIORITY_VALUES } from '@/lib/status';
import type { Enums } from '@/lib/types';

export default function ProyectoForm() {
  const params = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!params.id;
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const { session } = useSession();
  const t = useT();
  const priorityOptions = PRIORITY_VALUES.map((v) => ({ value: v, label: t(PRIORITY[v].tkey) }));

  const [clients, setClients] = useState<Option[]>([]);
  const [properties, setProperties] = useState<Option[]>([]);
  const [managers, setManagers] = useState<Option[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [hours, setHours] = useState('');
  const [priority, setPriority] = useState<Enums<'priority_level'>>('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('clients')
      .select('id, name')
      .order('name')
      .then(({ data }) => setClients((data ?? []).map((c) => ({ value: c.id, label: c.name }))));

    (async () => {
      const { data: profs } = await supabase.from('profiles').select('id').in('role', ['manager', 'admin']);
      const ids = (profs ?? []).map((p) => p.id);
      if (ids.length === 0) {
        setManagers([]);
        return;
      }
      const { data: emps } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('user_id', ids)
        .order('first_name');
      setManagers((emps ?? []).map((e) => ({ value: e.id, label: `${e.first_name} ${e.last_name ?? ''}`.trim() })));
    })();
  }, []);

  // Modo edición: cargar el proyecto existente.
  useEffect(() => {
    const pid = params.id;
    if (!pid) return;
    (async () => {
      const { data } = await supabase.from('projects').select('*').eq('id', pid).single();
      if (data) {
        setClientId(data.client_id);
        setPropertyId(data.property_id);
        setManagerId(data.manager_id);
        setName(data.name);
        setHours(data.budgeted_hours != null ? String(data.budgeted_hours) : '');
        setPriority(data.priority);
        setDescription(data.description ?? '');
      }
      setLoading(false);
    })();
  }, [params.id]);

  // Carga las propiedades del cliente seleccionado (sin borrar la selección).
  useEffect(() => {
    if (!clientId) {
      setProperties([]);
      return;
    }
    supabase
      .from('properties')
      .select('id, label, address')
      .eq('client_id', clientId)
      .order('created_at')
      .then(({ data }) =>
        setProperties((data ?? []).map((p) => ({ value: p.id, label: p.label || p.address }))),
      );
  }, [clientId]);

  async function save() {
    if (!clientId || !propertyId || !name.trim()) {
      setError(t('projects.req_err'));
      return;
    }
    const h = parseFloat(hours.replace(',', '.'));
    if (!hours.trim() || isNaN(h) || h <= 0) {
      setError(t('projects.hours_err'));
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      client_id: clientId,
      property_id: propertyId,
      manager_id: managerId,
      name: name.trim(),
      budgeted_hours: h,
      priority,
      description: description.trim() || null,
    };

    if (isEdit) {
      const { error } = await supabase.from('projects').update(payload).eq('id', params.id!);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      router.back();
    } else {
      const { data, error } = await supabase
        .from('projects')
        .insert({ ...payload, status: 'in_progress', created_by: session?.user.id ?? null })
        .select('id')
        .single();
      if (error || !data) {
        setError(error?.message ?? t('projects.create_err'));
        setSaving(false);
        return;
      }
      router.replace({ pathname: '/proyectos/[id]', params: { id: data.id } });
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: t('projects.edit') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isEdit ? t('projects.edit') : t('projects.new') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SelectField
          label={t('projects.client')}
          required
          value={clientId}
          options={clients}
          placeholder={t('projects.choose_client')}
          emptyText={t('projects.no_clients')}
          onChange={(v) => {
            setClientId(v);
            setPropertyId(null);
          }}
        />
        <SelectField
          label={t('projects.property')}
          required
          value={propertyId}
          options={properties}
          placeholder={clientId ? t('projects.choose_prop') : t('projects.choose_client_first')}
          emptyText={t('projects.no_props')}
          disabled={!clientId}
          onChange={setPropertyId}
        />
        <TextField label={t('projects.name')} required value={name} onChangeText={setName} placeholder={t('projects.name_ph')} />
        <TextField
          label={t('projects.budget_hours')}
          required
          value={hours}
          onChangeText={setHours}
          placeholder={t('projects.budget_hours_ph')}
          keyboardType="numeric"
        />
        <SelectField
          label={t('projects.manager')}
          value={managerId}
          options={managers}
          placeholder={t('projects.choose_manager')}
          emptyText={t('projects.no_managers')}
          onChange={setManagerId}
        />
        <SelectField
          label={t('projects.priority')}
          value={priority}
          options={priorityOptions}
          onChange={(v) => setPriority(v as Enums<'priority_level'>)}
        />
        <TextField
          label={t('projects.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('projects.description_ph')}
          multiline
          style={styles.multiline}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={isEdit ? t('props.save_changes') : t('projects.create')}
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
  multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#E5544B', fontSize: 14 },
  actions: { marginTop: 8 },
});
