import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/ui/photo-viewer';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { capturePhoto, signedPhotoUrl, uploadJobPhoto } from '@/lib/photos';
import { JOB_STATUS } from '@/lib/status';
import { supabase } from '@/lib/supabase';

type Job = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  project_id: string;
  actual_start: string | null;
  actual_end: string | null;
  projects: { manager_id: string | null } | null;
};
type Photo = { id: string; type: string; storage_path: string; url?: string | null };
type OpenEntry = { id: string; clock_in: string };

export default function TareaDetalle() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const { session } = useSession();
  const t = useT();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [empId, setEmpId] = useState<string | null>(null);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState('');
  const [canWork, setCanWork] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [emp, jobRes, prof] = await Promise.all([
      supabase.from('employees').select('id').eq('user_id', session?.user.id ?? '').maybeSingle(),
      supabase.from('jobs').select('id, title, description, status, project_id, actual_start, actual_end, projects(manager_id)').eq('id', taskId).single(),
      supabase.from('profiles').select('role').eq('id', session?.user.id ?? '').maybeSingle(),
    ]);
    const myId = emp.data?.id ?? null;
    const jobData = (jobRes.data as Job | null) ?? null;
    setEmpId(myId);
    setJob(jobData);

    const role = prof.data?.role ?? 'employee';
    const managerId = jobData?.projects?.manager_id ?? null;

    const [oe, asg] = await Promise.all([
      supabase.from('time_entries').select('id, clock_in').eq('job_id', taskId).is('clock_out', null).order('clock_in').limit(1).maybeSingle(),
      supabase.from('job_assignments').select('employee_id').eq('job_id', taskId),
    ]);
    setOpenEntry((oe.data as OpenEntry | null) ?? null);
    const ids = (asg.data ?? []).map((a) => a.employee_id);
    setAssigneeIds(ids);
    const manage = role === 'admin' || (!!managerId && managerId === myId);
    setCanManage(manage);
    // admin/manager del proyecto: cualquier tarea de sus proyectos | empleado: asignado a esta tarea
    setCanWork(manage || (!!myId && ids.includes(myId)));

    const ph = await supabase.from('photos').select('id, type, storage_path').eq('job_id', taskId).order('created_at');
    const withUrls = await Promise.all(
      (ph.data ?? []).map(async (p) => ({ ...p, url: await signedPhotoUrl(p.storage_path) })),
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [taskId, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Temporizador en vivo mientras hay una sesión abierta.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!openEntry) {
      setElapsed('');
      return;
    }
    const tick = () => {
      const start = new Date(openEntry.clock_in).getTime();
      const diff = Math.max(0, Date.now() - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsed(`${pad(h)}:${pad(m)}:${pad(s)}`);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [openEntry]);

  async function startTask() {
    if (!job) return;
    if (assigneeIds.length === 0) {
      setError(t('tasks.no_assignees'));
      return;
    }
    setError(null);
    const photo = await capturePhoto();
    if (!photo) return; // cancelado
    setBusy(true);
    const now = new Date().toISOString();
    const up = await uploadJobPhoto({
      jobId: job.id, projectId: job.project_id, type: 'before',
      uri: photo.uri, mimeType: photo.mimeType, uploadedBy: empId, takenAt: now,
    });
    if (up.error) return fail(t('tasks.photo_err') + up.error);
    // Abre horas para TODOS los asignados (2 trabajadores => 2 h al proyecto),
    // sin importar quién inicie. La función valida el permiso en la base.
    const { error } = await supabase.rpc('start_task', { p_job_id: job.id });
    if (error) return fail(error.message);
    await load();
    setBusy(false);
  }

  async function finishTask() {
    if (!job) return;
    setError(null);
    const photo = await capturePhoto();
    if (!photo) return;
    setBusy(true);
    const now = new Date().toISOString();
    const up = await uploadJobPhoto({
      jobId: job.id, projectId: job.project_id, type: 'after',
      uri: photo.uri, mimeType: photo.mimeType, uploadedBy: empId, takenAt: now,
    });
    if (up.error) return fail(t('tasks.photo_err') + up.error);
    // Cierra la sesión de todos los asignados y marca la tarea como completada.
    const { error } = await supabase.rpc('finish_task', { p_job_id: job.id });
    if (error) return fail(error.message);
    await load();
    setBusy(false);
  }

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }
  if (!job) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.icon }}>{t('tasks.not_found')}</Text>
      </View>
    );
  }

  const st = JOB_STATUS[job.status];
  const stColor = st?.color ?? c.icon;
  const stLabel = t(st?.tkey ?? 'jobstatus.scheduled');
  const before = photos.filter((p) => p.type === 'before');
  const after = photos.filter((p) => p.type === 'after');

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: t('tasks.detail_title'),
          // Editar solo admin/manager y solo si la tarea NO está en curso.
          headerRight:
            canManage && job.status !== 'in_progress'
              ? () => (
                  <Pressable
                    onPress={() => router.push({ pathname: '/proyectos/tarea', params: { taskId: job.id } })}
                    hitSlop={10}
                    style={{ paddingHorizontal: 12 }}>
                    <Ionicons name="create-outline" size={22} color={accent} />
                  </Pressable>
                )
              : undefined,
        }}
      />

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]}>{job.title}</Text>
          <Text style={[styles.badge, { color: stColor, backgroundColor: stColor + '1A' }]}>{stLabel}</Text>
        </View>
        {job.description ? <Text style={[styles.desc, { color: c.icon }]}>{job.description}</Text> : null}
      </View>

      {/* Estado de fichaje */}
      {openEntry ? (
        <View style={[styles.timerCard, { backgroundColor: accent }]}>
          <Text style={styles.timerLabel}>{t('tasks.working')}</Text>
          <Text style={styles.timerValue}>{elapsed}</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Acción principal (según el estado de la tarea) */}
      {job.status === 'completed' ? (
        <View style={[styles.doneRow, { borderColor: c.border }]}>
          <Ionicons name="checkmark-done-circle" size={22} color="#1E9E5A" />
          <Text style={{ color: c.text, fontWeight: '600' }}>{t('tasks.done')}</Text>
        </View>
      ) : !canWork ? (
        <View style={[styles.doneRow, { borderColor: c.border }]}>
          <Ionicons name="lock-closed-outline" size={20} color={c.icon} />
          <Text style={[styles.noPerm, { color: c.icon }]}>{t('tasks.no_perm')}</Text>
        </View>
      ) : job.status === 'in_progress' ? (
        <View style={{ gap: 6 }}>
          <PrimaryButton title={t('tasks.finish')} icon="camera" onPress={finishTask} loading={busy} />
          <Text style={[styles.hint, { color: c.icon }]}>{t('tasks.finish_hint')}</Text>
        </View>
      ) : (
        <View style={{ gap: 6 }}>
          <PrimaryButton title={t('tasks.start')} icon="camera" onPress={startTask} loading={busy} />
          <Text style={[styles.hint, { color: c.icon }]}>{t('tasks.start_hint')}</Text>
        </View>
      )}

      {/* Fotos */}
      <Text style={[styles.sectionTitle, { color: c.text }]}>{t('tasks.photos')}</Text>
      <View style={styles.photoGrid}>
        <PhotoSlot title={t('tasks.before')} url={before[0]?.url} color={c} onPress={setViewerUri} />
        <PhotoSlot title={t('tasks.after')} url={after[0]?.url} color={c} onPress={setViewerUri} />
      </View>

      <PhotoViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

function PhotoSlot({
  title,
  url,
  color,
  onPress,
}: {
  title: string;
  url?: string | null;
  color: (typeof Colors)['light'];
  onPress: (uri: string) => void;
}) {
  return (
    <View style={styles.photoSlot}>
      <Text style={[styles.photoLabel, { color: color.icon }]}>{title}</Text>
      {url ? (
        <Pressable onPress={() => onPress(url)}>
          <Image source={{ uri: url }} style={[styles.photo, { borderColor: color.border }]} contentFit="cover" />
        </Pressable>
      ) : (
        <View style={[styles.photoEmpty, { backgroundColor: color.card, borderColor: color.border }]}>
          <Ionicons name="image-outline" size={26} color={color.icon} />
        </View>
      )}
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', flex: 1 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  desc: { fontSize: 14, lineHeight: 20 },
  timerCard: { borderRadius: 16, padding: 20, alignItems: 'center' },
  timerLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  timerValue: { color: '#fff', fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 4 },
  error: { color: '#E5544B', fontSize: 14 },
  doneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14 },
  noPerm: { fontSize: 13, flex: 1, lineHeight: 18 },
  hint: { fontSize: 12, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginTop: 8 },
  photoGrid: { flexDirection: 'row', gap: 12 },
  photoSlot: { flex: 1, gap: 6 },
  photoLabel: { fontSize: 13, fontWeight: '600' },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 1 },
  photoEmpty: { width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
