import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const t = useT();
  const { session, signOut, markPasswordChanged } = useSession();

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (pw.length < 6) {
      setError(t('cp.err_short'));
      return;
    }
    if (pw !== pw2) {
      setError(t('cp.err_match'));
      return;
    }
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password: pw });
    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }
    if (session) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);
    }
    markPasswordChanged();
  }

  const inputRow = [styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.border }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.iconWrap, { backgroundColor: accent + '1A' }]}>
            <Ionicons name="lock-closed" size={30} color={accent} />
          </View>
          <Text style={[styles.title, { color: c.text }]}>{t('cp.title')}</Text>
          <Text style={[styles.subtitle, { color: c.icon }]}>{t('cp.subtitle')}</Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: c.text }]}>{t('cp.new')}</Text>
            <View style={inputRow}>
              <Ionicons name="lock-closed-outline" size={19} color={c.icon} />
              <TextInput
                value={pw}
                onChangeText={setPw}
                placeholder={t('cp.ph')}
                placeholderTextColor={c.icon}
                secureTextEntry={!show}
                autoCapitalize="none"
                editable={!saving}
                style={[styles.input, { color: c.text }]}
              />
              <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.icon} />
              </Pressable>
            </View>

            <Text style={[styles.label, { color: c.text, marginTop: 16 }]}>{t('cp.confirm')}</Text>
            <View style={inputRow}>
              <Ionicons name="lock-closed-outline" size={19} color={c.icon} />
              <TextInput
                value={pw2}
                onChangeText={setPw2}
                placeholder={t('cp.ph')}
                placeholderTextColor={c.icon}
                secureTextEntry={!show}
                autoCapitalize="none"
                editable={!saving}
                onSubmitEditing={save}
                returnKeyType="go"
                style={[styles.input, { color: c.text }]}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={{ marginTop: 20 }}>
              {saving ? (
                <View style={[styles.savingBtn, { backgroundColor: Brand }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <PrimaryButton title={t('cp.save')} icon="checkmark" onPress={save} />
              )}
            </View>

            <Pressable onPress={signOut} style={styles.signout} hitSlop={8}>
              <Text style={[styles.signoutText, { color: c.icon }]}>{t('common.signout')}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  iconWrap: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 24, lineHeight: 20 },
  form: { alignSelf: 'center', width: '100%', maxWidth: 420 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  error: { color: '#E5544B', fontSize: 14, marginTop: 14, textAlign: 'center' },
  savingBtn: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signout: { alignSelf: 'center', marginTop: 24, padding: 8 },
  signoutText: { fontSize: 14, fontWeight: '600' },
});
