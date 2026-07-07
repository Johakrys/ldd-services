import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/ui/photo-viewer';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SelectField, type Option } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { capturePhoto, uploadExpenseReceipt } from '@/lib/photos';
import { supabase } from '@/lib/supabase';

export default function NuevoGasto() {
  const params = useLocalSearchParams<{ projectId?: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();
  const { session } = useSession();

  const [projects, setProjects] = useState<Option[]>([]);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [viewer, setViewer] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(params.projectId ?? null);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, status')
      .order('name')
      .then(({ data }) =>
        setProjects(
          (data ?? [])
            .filter((p) => p.status !== 'cancelled')
            .map((p) => ({ value: p.id, label: p.name })),
        ),
      );
  }, []);

  async function takePhoto() {
    const p = await capturePhoto();
    if (p) setPhoto(p);
  }

  async function save() {
    if (!photo) return setError(t('gastos.photo_required'));
    if (!projectId) return setError(t('gastos.project_required'));
    if (!reason.trim()) return setError(t('gastos.reason_required'));
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amount.trim() || isNaN(amt) || amt <= 0) return setError(t('gastos.amount_required'));

    setSaving(true);
    setError(null);
    const up = await uploadExpenseReceipt({ projectId, uri: photo.uri, mimeType: photo.mimeType });
    if (up.error || !up.path) {
      setError(up.error ?? 'Error');
      setSaving(false);
      return;
    }
    const { error: insErr } = await supabase.from('expenses').insert({
      project_id: projectId,
      amount: amt,
      reason: reason.trim(),
      receipt_path: up.path,
      created_by: session?.user.id ?? null,
    });
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {/* 1) Foto de la factura */}
        <Text style={[styles.label, { color: c.text }]}>{t('gastos.receipt')}</Text>
        {photo ? (
          <View style={{ gap: 10 }}>
            <Pressable onPress={() => setViewer(true)} style={styles.thumbWrap}>
              <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
              <View style={styles.thumbBadge}>
                <Ionicons name="expand-outline" size={16} color="#fff" />
              </View>
            </Pressable>
            <PrimaryButton title={t('gastos.retake')} icon="camera-outline" variant="ghost" onPress={takePhoto} />
          </View>
        ) : (
          <Pressable onPress={takePhoto} style={[styles.photoBtn, { borderColor: accent }]}>
            <Ionicons name="camera" size={26} color={accent} />
            <Text style={[styles.photoBtnText, { color: accent }]}>{t('gastos.take_photo')}</Text>
          </Pressable>
        )}

        {/* 2) Detalles (aparecen tras tomar la foto) */}
        {photo ? (
          <View style={{ gap: 16, marginTop: 8 }}>
            <SelectField
              label={t('gastos.project')}
              required
              value={projectId}
              options={projects}
              placeholder={t('gastos.choose_project')}
              emptyText={t('gastos.no_projects')}
              onChange={setProjectId}
            />
            <TextField label={t('gastos.reason')} required value={reason} onChangeText={setReason} placeholder={t('gastos.reason_ph')} />
            <TextField label={t('gastos.amount')} required value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {photo ? (
          <View style={{ marginTop: 8 }}>
            <PrimaryButton title={t('gastos.save')} icon="checkmark" onPress={save} loading={saving} />
          </View>
        ) : null}
      </ScrollView>

      <PhotoViewer uri={photo?.uri ?? null} visible={viewer} onClose={() => setViewer(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  label: { fontSize: 15, fontWeight: '700' },
  photoBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoBtnText: { fontSize: 15, fontWeight: '700' },
  thumbWrap: { borderRadius: 14, overflow: 'hidden' },
  thumb: { width: '100%', height: 220 },
  thumbBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 16,
    padding: 6,
  },
  error: { color: '#E5544B', fontSize: 14, marginTop: 4 },
});
