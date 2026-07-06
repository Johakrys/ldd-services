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

import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function PropiedadForm() {
  const params = useLocalSearchParams<{ clientId?: string; propertyId?: string }>();
  const isEdit = !!params.propertyId;
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [access, setAccess] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modo edición: cargar la propiedad existente.
  useEffect(() => {
    const pid = params.propertyId;
    if (!pid) return;
    (async () => {
      const { data } = await supabase.from('properties').select('*').eq('id', pid).single();
      if (data) {
        setLabel(data.label ?? '');
        setAddress(data.address);
        setCity(data.city ?? '');
        setZip(data.zip_code ?? '');
        setAccess(data.access_notes ?? '');
        setNotes(data.notes ?? '');
      }
      setLoading(false);
    })();
  }, [params.propertyId]);

  async function save() {
    if (!label.trim() || !address.trim() || !city.trim()) {
      setError(t('props.req_err'));
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      label: label.trim() || null,
      address: address.trim(),
      city: city.trim() || null,
      zip_code: zip.trim() || null,
      access_notes: access.trim() || null,
      notes: notes.trim() || null,
    };

    const { error } = isEdit
      ? await supabase.from('properties').update(payload).eq('id', params.propertyId!)
      : await supabase.from('properties').insert({ client_id: params.clientId!, ...payload });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.back();
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Stack.Screen options={{ title: t('props.edit') }} />
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <Stack.Screen options={{ title: isEdit ? t('props.edit') : t('props.new') }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TextField label={t('props.label')} required value={label} onChangeText={setLabel} placeholder={t('props.label_ph')} />
        <TextField label={t('props.address')} required value={address} onChangeText={setAddress} placeholder="123 S Main St" />
        <TextField label={t('props.city')} required value={city} onChangeText={setCity} placeholder="Salt Lake City" />
        <TextField label={t('props.zip')} value={zip} onChangeText={setZip} placeholder="84101" keyboardType="number-pad" />
        <TextField label={t('props.access')} value={access} onChangeText={setAccess} placeholder={t('props.access_ph')} />
        <TextField
          label={t('common.notes')}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('common.notes_ph')}
          multiline
          style={styles.multiline}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton
            title={isEdit ? t('props.save_changes') : t('props.save')}
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
