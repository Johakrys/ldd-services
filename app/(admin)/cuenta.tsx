import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Msg = { text: string; ok: boolean } | null;

export default function CuentaScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const t = useT();
  const { session, markPasswordChanged } = useSession();

  const [email, setEmail] = useState(session?.user.email ?? '');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  async function saveEmail() {
    setSavingEmail(true);
    setEmailMsg(null);
    const { error } = await supabase.rpc('update_my_email', { p_email: email.trim() });
    if (error) {
      setEmailMsg({ text: error.message, ok: false });
      setSavingEmail(false);
      return;
    }
    await supabase.auth.refreshSession();
    setEmailMsg({ text: t('account.email_ok'), ok: true });
    setSavingEmail(false);
  }

  async function savePassword() {
    if (!currentPw) {
      setPwMsg({ text: t('account.current_pw_err'), ok: false });
      return;
    }
    if (pw.length < 6) {
      setPwMsg({ text: t('cp.err_short'), ok: false });
      return;
    }
    if (pw !== pw2) {
      setPwMsg({ text: t('cp.err_match'), ok: false });
      return;
    }
    setSavingPw(true);
    setPwMsg(null);
    const { data: valid, error: vErr } = await supabase.rpc('verify_my_password', { p_password: currentPw });
    if (vErr || !valid) {
      setPwMsg({ text: vErr?.message ?? t('account.current_pw_err'), ok: false });
      setSavingPw(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setPwMsg({ text: error.message, ok: false });
      setSavingPw(false);
      return;
    }
    if (session) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);
      markPasswordChanged();
    }
    setCurrentPw('');
    setPw('');
    setPw2('');
    setPwMsg({ text: t('account.pw_ok'), ok: true });
    setSavingPw(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* Correo */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{t('account.email_section')}</Text>
          <TextField
            label={t('account.email_label')}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@ejemplo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            inputMode="email"
          />
          {emailMsg ? (
            <Text style={[styles.msg, { color: emailMsg.ok ? '#1E9E5A' : '#E5544B' }]}>{emailMsg.text}</Text>
          ) : null}
          <PrimaryButton title={t('account.save_email')} icon="mail-outline" onPress={saveEmail} loading={savingEmail} />
        </View>

        {/* Contraseña */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>{t('account.pw_section')}</Text>
          <TextField
            label={t('account.current_pw')}
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextField
            label={t('account.new_pw')}
            value={pw}
            onChangeText={setPw}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextField
            label={t('account.confirm_pw')}
            value={pw2}
            onChangeText={setPw2}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />
          {pwMsg ? (
            <Text style={[styles.msg, { color: pwMsg.ok ? '#1E9E5A' : '#E5544B' }]}>{pwMsg.text}</Text>
          ) : null}
          <PrimaryButton title={t('account.save_pw')} icon="key-outline" onPress={savePassword} loading={savingPw} />
        </View>

        <Text style={[styles.hint, { color: c.icon }]}>{session?.user.email}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  msg: { fontSize: 14 },
  hint: { fontSize: 12, textAlign: 'center', marginTop: 4 },
});
