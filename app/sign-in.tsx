import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Brand } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { StringKey } from '@/lib/i18n/strings';

const logo = require('@/assets/images/logo.png');
const BUTTON_GRADIENT = ['#1565E0', Brand] as const;

type Feedback = { type: 'error' | 'ok'; text: string };

export default function SignInScreen() {
  const dark = (useColorScheme() ?? 'light') === 'dark';
  const pal = palette(dark);
  const t = useT();
  const { signIn } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSignIn() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFeedback(null);
    const { error } = await signIn(email, password);
    if (error) {
      const key = errorKey(error);
      setFeedback({ type: 'error', text: key ? t(key) : error });
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={pal.bg} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: pal.card, borderColor: pal.cardBorder }]}>
              <View style={styles.logoBadge}>
                <Image source={logo} style={styles.logo} contentFit="contain" />
              </View>

              <Text style={[styles.title, { color: pal.title }]}>{t('auth.welcome')}</Text>
              <Text style={[styles.subtitle, { color: pal.subtitle }]}>{t('auth.subtitle')}</Text>

              <Text style={[styles.label, { color: pal.title }]}>{t('auth.email')}</Text>
              <View style={[styles.inputRow, { backgroundColor: pal.inputBg, borderColor: pal.inputBorder }]}>
                <Ionicons name="mail-outline" size={19} color={pal.icon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tucorreo@empresa.com"
                  placeholderTextColor={pal.placeholder}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  editable={!submitting}
                  style={[styles.input, { color: pal.text }]}
                />
              </View>

              <Text style={[styles.label, { color: pal.title, marginTop: 16 }]}>{t('auth.password')}</Text>
              <View style={[styles.inputRow, { backgroundColor: pal.inputBg, borderColor: pal.inputBorder }]}>
                <Ionicons name="lock-closed-outline" size={19} color={pal.icon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={pal.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  editable={!submitting}
                  onSubmitEditing={handleSignIn}
                  returnKeyType="go"
                  style={[styles.input, { color: pal.text }]}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={pal.icon} />
                </Pressable>
              </View>

              <Text style={[styles.contactAdmin, { color: pal.subtitle }]}>{t('auth.contact_admin')}</Text>

              {feedback ? (
                <Text style={[styles.feedback, { color: feedback.type === 'error' ? '#E5544B' : pal.link }]}>
                  {feedback.text}
                </Text>
              ) : null}

              <Pressable
                onPress={handleSignIn}
                disabled={!canSubmit}
                style={({ pressed }) => [styles.buttonWrap, { opacity: pressed ? 0.9 : 1 }]}>
                <LinearGradient
                  colors={BUTTON_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, { opacity: canSubmit ? 1 : 0.5 }]}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{t('auth.signin')}</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              <Text style={[styles.footer, { color: pal.footer }]}>{t('auth.footer')}</Text>

              <View style={styles.themeRow}>
                <ThemeSwitcher />
                <LanguageSwitcher />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function palette(dark: boolean) {
  return dark
    ? {
        bg: ['#0B0F17', '#070A10'] as const,
        card: '#121821',
        cardBorder: '#232B37',
        inputBg: '#1A212C',
        inputBorder: '#2A3441',
        text: '#E7ECF3',
        placeholder: '#6C7885',
        icon: '#7B8896',
        title: '#F2F5F9',
        subtitle: '#8A94A2',
        link: '#4d8dff',
        footer: '#8A94A2',
      }
    : {
        bg: ['#F5F7FA', '#E9EDF3'] as const,
        card: '#FFFFFF',
        cardBorder: '#E4E9F0',
        inputBg: '#F4F6F9',
        inputBorder: '#E2E7EE',
        text: '#11181C',
        placeholder: '#9BA1A6',
        icon: '#8A94A2',
        title: '#11181C',
        subtitle: '#5B6673',
        link: Brand,
        footer: '#6B7280',
      };
}

/** Traduce el error de Supabase Auth a una clave de i18n (o null si es desconocido). */
function errorKey(message: string): StringKey | null {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'auth.err_invalid';
  if (m.includes('email not confirmed')) return 'auth.err_unconfirmed';
  if (m.includes('network')) return 'auth.err_network';
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logoBadge: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingVertical: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  logo: { width: 150, height: 82 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 24 },
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
  contactAdmin: { fontSize: 13, marginTop: 12, textAlign: 'right' },
  feedback: { fontSize: 14, marginTop: 14, textAlign: 'center' },
  buttonWrap: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: { textAlign: 'center', fontSize: 13, marginTop: 24 },
  themeRow: { marginTop: 20, gap: 10 },
});
