import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function NuevoCliente() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();
  const { session } = useSession();
  const t = useT();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      setError(t('clients.req_err'));
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        company_name: company.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        billing_address: address.trim() || null,
        notes: notes.trim() || null,
        created_by: session?.user.id ?? null,
      })
      .select('id')
      .single();
    if (error || !data) {
      setError(error?.message ?? t('clients.create_err'));
      setSaving(false);
      return;
    }
    // Abre directamente la ficha del cliente recién creado.
    router.replace({ pathname: '/clientes/[id]', params: { id: data.id } });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <TextField label={t('clients.name')} required value={name} onChangeText={setName} placeholder="Nombre del cliente" />
        <TextField label={t('clients.company')} value={company} onChangeText={setCompany} placeholder={t('clients.company_ph')} />
        <TextField
          label={t('clients.email')}
          required
          value={email}
          onChangeText={setEmail}
          placeholder="correo@ejemplo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          inputMode="email"
        />
        <TextField label={t('common.phone')} required value={phone} onChangeText={setPhone} placeholder="(801) 555-0123" keyboardType="phone-pad" />
        <TextField label={t('clients.billing')} required value={address} onChangeText={setAddress} placeholder="123 S Main St, Salt Lake City" />
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
          <PrimaryButton title={t('clients.save')} icon="checkmark" onPress={save} loading={saving} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 16 },
  multiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  error: { color: '#E5544B', fontSize: 14 },
  actions: { marginTop: 8 },
});
