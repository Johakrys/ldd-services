import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PhotoViewer } from '@/components/ui/photo-viewer';
import { PrimaryButton } from '@/components/ui/primary-button';
import { confirm } from '@/lib/confirm';
import { Brand, BrandLight, Colors } from '@/constants/theme';
import { useSession } from '@/ctx/auth';
import { useT } from '@/ctx/i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { capturePhoto, signedPhotoUrl, uploadJobPhoto, type PhotoType } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { JOB_STATUS, PRIORITY, PROJECT_STATUS } from '@/lib/status';
import type { Enums } from '@/lib/types';

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  clients: { name: string } | null;
  properties: { label: string | null; address: string; city: string | null } | null;
  manager: { first_name: string; last_name: string | null } | null;
};

function openMaps(address: string, city: string | null) {
  const query = encodeURIComponent([address, city].filter(Boolean).join(', '));
  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
}
type Hours = { budgeted_hours: number | null; total_hours: number | null; remaining_hours: number | null };
type Task = {
  id: string;
  title: string;
  status: string;
  job_assignments: { employee_id: string; employees: { first_name: string; last_name: string | null } | null }[];
};

export default function ProyectoDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { role, session } = useSession();
  const canManage = role !== 'employee';
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const accent = scheme === 'dark' ? BrandLight : Brand;
  const router = useRouter();
  const t = useT();

  const [project, setProject] = useState<Project | null>(null);
  const [hours, setHours] = useState<Hours | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myEmpId, setMyEmpId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ id: string; type: string; url: string | null }[]>([]);
  const [photoBusy, setPhotoBusy] = useState<PhotoType | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    const [proj, hrs, jobs, emp] = await Promise.all([
      supabase.from('projects').select('id, name, description, status, priority, clients(name), properties(label, address, city), manager:employees!manager_id(first_name, last_name)').eq('id', id).single(),
      supabase.from('v_project_summary').select('budgeted_hours, total_hours, remaining_hours').eq('id', id).single(),
      supabase.from('jobs').select('id, title, status, job_assignments(employee_id, employees(first_name, last_name))').eq('project_id', id).order('created_at'),
      supabase.from('employees').select('id').eq('user_id', session?.user.id ?? '').maybeSingle(),
    ]);
    setProject((proj.data as Project | null) ?? null);
    setHours((hrs.data as Hours | null) ?? null);
    setTasks((jobs.data as Task[] | null) ?? []);
    setMyEmpId(emp.data?.id ?? null);

    const ph = await supabase
      .from('photos')
      .select('id, type, storage_path')
      .eq('project_id', id)
      .is('job_id', null)
      .order('created_at');
    const withUrls = await Promise.all(
      (ph.data ?? []).map(async (p) => ({ id: p.id, type: p.type, url: await signedPhotoUrl(p.storage_path) })),
    );
    setPhotos(withUrls);
    setLoading(false);
  }, [id, session?.user.id]);

  async function addPhoto(type: PhotoType) {
    const photo = await capturePhoto();
    if (!photo) return;
    setPhotoBusy(type);
    const { error } = await uploadJobPhoto({
      jobId: null,
      projectId: id,
      type,
      uri: photo.uri,
      mimeType: photo.mimeType,
      uploadedBy: myEmpId,
      takenAt: new Date().toISOString(),
    });
    setPhotoBusy(null);
    if (!error) await load();
  }

  useFocusEffect(
    useCallback(() => {
      load();
      // Refresco automático: las horas restantes bajan por bloques de 30 min
      // mientras haya tareas en curso, aunque no salgas de la pantalla.
      const iv = setInterval(load, 60000);
      return () => clearInterval(iv);
    }, [load]),
  );

  async function changeStatus(status: Enums<'project_status'>) {
    setWorking(true);
    await supabase.from('projects').update({ status }).eq('id', id);
    await load();
    setWorking(false);
  }

  async function confirmComplete() {
    const ok = await confirm(
      t('projects.mark_done'),
      t('projects.confirm_done_msg'),
      t('projects.confirm_complete'),
      t('projects.confirm_cancel'),
    );
    if (ok) changeStatus('completed');
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }
  if (!project) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.icon }}>{t('projects.not_found')}</Text>
      </View>
    );
  }

  const st = PROJECT_STATUS[project.status];
  const stColor = st?.color ?? c.icon;
  const stLabel = t(st?.tkey ?? 'status.lead');
  const pr = PRIORITY[project.priority];
  const prColor = pr?.color ?? c.icon;
  const prLabel = t(pr?.tkey ?? 'priority.medium');
  const budgeted = hours?.budgeted_hours ?? null;
  const worked = hours?.total_hours ?? 0;
  const remaining = hours?.remaining_hours ?? null;
  const pct = budgeted && budgeted > 0 ? Math.min(1, worked / budgeted) : 0;
  const over = remaining != null && remaining <= 0;

  // El empleado solo ve las tareas asignadas a él; admin/manager ven todas.
  const visibleTasks =
    role === 'employee' && myEmpId
      ? tasks.filter((task) => task.job_assignments.some((a) => a.employee_id === myEmpId))
      : tasks;

  // Equipo: el manager del proyecto + empleados únicos entre las tareas.
  const team = new Map<string, string>();
  if (project.manager) {
    const mn = `${project.manager.first_name} ${project.manager.last_name ?? ''}`.trim();
    if (mn) team.set(mn, mn);
  }
  visibleTasks.forEach((task) =>
    task.job_assignments.forEach((a) => {
      if (a.employees) {
        const full = `${a.employees.first_name} ${a.employees.last_name ?? ''}`.trim();
        team.set(full, full);
      }
    }),
  );

  const activeTasks = visibleTasks.filter((task) => task.status !== 'completed');
  const completedTasks = visibleTasks.filter((task) => task.status === 'completed');
  const beforePhotos = photos.filter((p) => p.type === 'before');
  const afterPhotos = photos.filter((p) => p.type === 'after');

  const renderThumb = (p: { id: string; url: string | null }) => (
    <Pressable key={p.id} onPress={() => setViewerUri(p.url)}>
      <Image source={{ uri: p.url ?? undefined }} style={[styles.thumb, { borderColor: c.border }]} contentFit="cover" />
    </Pressable>
  );

  const renderTaskRow = (task: Task) => {
    const js = JOB_STATUS[task.status];
    const jsColor = js?.color ?? c.icon;
    const jsLabel = t(js?.tkey ?? 'jobstatus.scheduled');
    const names = task.job_assignments
      .map((a) => (a.employees ? a.employees.first_name : null))
      .filter(Boolean)
      .join(', ');
    return (
      <Pressable
        key={task.id}
        onPress={() => router.push({ pathname: '/proyectos/tarea-detalle', params: { taskId: task.id } })}
        style={[styles.itemRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: c.text }]}>{task.title}</Text>
          <Text style={[styles.itemSub, { color: c.icon }]} numberOfLines={1}>
            {names ? `👷 ${names}` : t('projects.unassigned')}
          </Text>
        </View>
        <Text style={[styles.badgeSm, { color: jsColor, backgroundColor: jsColor + '1A' }]}>{jsLabel}</Text>
        <Ionicons name="chevron-forward" size={18} color={c.icon} />
      </Pressable>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: project.name,
          headerRight:
            role === 'admin'
              ? () => (
                  <Pressable
                    onPress={() => router.push({ pathname: '/proyectos/nuevo', params: { id } })}
                    hitSlop={10}
                    style={{ paddingHorizontal: 12 }}>
                    <Ionicons name="create-outline" size={22} color={accent} />
                  </Pressable>
                )
              : undefined,
        }}
      />

      {/* Info */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]}>{project.name}</Text>
          <Text style={[styles.badge, { color: stColor, backgroundColor: stColor + '1A' }]}>{stLabel}</Text>
        </View>
        {project.clients ? <Text style={[styles.sub, { color: c.icon }]}>{project.clients.name}</Text> : null}
        {project.properties ? (
          <Pressable
            onPress={() => openMaps(project.properties!.address, project.properties!.city)}
            style={styles.mapRow}
            hitSlop={6}>
            <Ionicons name="location" size={16} color={accent} />
            <Text style={[styles.mapText, { color: accent }]} numberOfLines={2}>
              {[project.properties.address, project.properties.city].filter(Boolean).join(', ')}
            </Text>
            <Ionicons name="open-outline" size={14} color={accent} />
          </Pressable>
        ) : null}
        {project.manager ? (
          <View style={styles.managerRow}>
            <Ionicons name="person-circle-outline" size={16} color={c.icon} />
            <Text style={[styles.sub, { color: c.icon }]}>
              {`${project.manager.first_name} ${project.manager.last_name ?? ''}`.trim()} · {t('role.manager')}
            </Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={[styles.metaTag, { color: prColor, backgroundColor: prColor + '1A' }]}>
            {t('projects.priority_label', { p: prLabel })}
          </Text>
        </View>
        {project.description ? (
          <Text style={[styles.desc, { color: c.text }]}>{project.description}</Text>
        ) : null}
      </View>

      {/* Horas */}
      {budgeted != null ? (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{t('projects.hours')}</Text>
          <View style={styles.hoursNumbers}>
            <HourStat label={t('projects.budgeted')} value={fmt(budgeted)} color={c.text} sub={c.icon} />
            <HourStat label={t('projects.worked')} value={fmt(worked)} color={c.text} sub={c.icon} />
            <HourStat label={t('projects.remaining')} value={fmt(remaining ?? 0)} color={over ? '#E5544B' : '#1E9E5A'} sub={c.icon} />
          </View>
          <View style={[styles.barTrack, { backgroundColor: c.border }]}>
            <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: over ? '#E5544B' : accent }]} />
          </View>
        </View>
      ) : null}

      {/* Acciones de estado (admin/manager) */}
      {canManage ? (
        <View style={{ gap: 10 }}>
          {project.status !== 'completed' ? (
            <PrimaryButton title={t('projects.mark_done')} icon="checkmark-done" onPress={confirmComplete} loading={working} />
          ) : null}
          {project.status === 'on_hold' ? (
            <PrimaryButton title={t('projects.resume')} icon="play" variant="ghost" onPress={() => changeStatus('in_progress')} loading={working} />
          ) : project.status === 'in_progress' ? (
            <PrimaryButton title={t('projects.pause')} icon="pause" variant="ghost" onPress={() => changeStatus('on_hold')} loading={working} />
          ) : project.status === 'completed' ? (
            <PrimaryButton title={t('projects.reopen')} icon="refresh" variant="ghost" onPress={() => changeStatus('in_progress')} loading={working} />
          ) : null}
        </View>
      ) : null}

      {/* Fotos del lugar (antes / después) */}
      <Text style={[styles.sectionTitle, { color: c.text, marginTop: 12 }]}>{t('projects.photos')}</Text>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {/* Antes */}
        <View style={styles.photoHeaderRow}>
          <Text style={[styles.photoGroupTitle, { color: c.text }]}>{t('tasks.before')}</Text>
          {canManage && project.status !== 'completed' ? (
            <Pressable
              onPress={() => addPhoto('before')}
              disabled={!!photoBusy}
              style={[styles.addBtn, { backgroundColor: accent + '1A' }]}
              hitSlop={6}>
              {photoBusy === 'before' ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <Ionicons name="camera" size={16} color={accent} />
              )}
              <Text style={[styles.addText, { color: accent }]}>{t('projects.add_photo')}</Text>
            </Pressable>
          ) : null}
        </View>
        {beforePhotos.length === 0 ? (
          <Text style={[styles.emptyLine, { color: c.icon }]}>{t('projects.no_before')}</Text>
        ) : (
          <View style={styles.thumbGrid}>{beforePhotos.map(renderThumb)}</View>
        )}

        {/* Después */}
        <View style={[styles.photoHeaderRow, { marginTop: 16 }]}>
          <Text style={[styles.photoGroupTitle, { color: c.text }]}>{t('tasks.after')}</Text>
          {canManage && project.status === 'completed' ? (
            <Pressable
              onPress={() => addPhoto('after')}
              disabled={!!photoBusy}
              style={[styles.addBtn, { backgroundColor: accent + '1A' }]}
              hitSlop={6}>
              {photoBusy === 'after' ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <Ionicons name="camera" size={16} color={accent} />
              )}
              <Text style={[styles.addText, { color: accent }]}>{t('projects.add_photo')}</Text>
            </Pressable>
          ) : null}
        </View>
        {afterPhotos.length === 0 ? (
          <Text style={[styles.emptyLine, { color: c.icon }]}>
            {project.status === 'completed' ? t('projects.no_after') : t('projects.after_locked')}
          </Text>
        ) : (
          <View style={styles.thumbGrid}>{afterPhotos.map(renderThumb)}</View>
        )}
      </View>

      {/* Tareas por hacer / en curso */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: c.text }]}>
          {t('projects.tasks_active')} <Text style={{ color: c.icon }}>({activeTasks.length})</Text>
        </Text>
        {canManage ? (
          <Pressable
            onPress={() => router.push({ pathname: '/proyectos/tarea', params: { projectId: id } })}
            style={[styles.addBtn, { backgroundColor: accent + '1A' }]}
            hitSlop={6}>
            <Ionicons name="add" size={18} color={accent} />
            <Text style={[styles.addText, { color: accent }]}>{t('projects.new_task')}</Text>
          </Pressable>
        ) : null}
      </View>
      {activeTasks.length === 0 ? (
        <Text style={[styles.emptyLine, { color: c.icon }]}>{t('projects.no_tasks')}</Text>
      ) : (
        activeTasks.map(renderTaskRow)
      )}

      {/* Completadas */}
      {completedTasks.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 20, marginBottom: 10 }]}>
            {t('projects.tasks_completed')} <Text style={{ color: c.icon }}>({completedTasks.length})</Text>
          </Text>
          {completedTasks.map(renderTaskRow)}
        </>
      ) : null}

      {/* Equipo (admin/manager) */}
      {canManage ? (
        <>
          <Text style={[styles.sectionTitle, { color: c.text, marginTop: 20, marginBottom: 10 }]}>
            {t('projects.team')} <Text style={{ color: c.icon }}>({team.size})</Text>
          </Text>
          {team.size === 0 ? (
            <Text style={[styles.emptyLine, { color: c.icon }]}>{t('projects.no_team')}</Text>
          ) : (
            <View style={styles.teamWrap}>
              {[...team.values()].map((n) => (
                <View key={n} style={[styles.chip, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Ionicons name="person" size={14} color={accent} />
                  <Text style={{ color: c.text, fontSize: 13, fontWeight: '600' }}>{n}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
      <PhotoViewer uri={viewerUri} visible={!!viewerUri} onClose={() => setViewerUri(null)} />
    </ScrollView>
  );
}

function HourStat({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <View style={styles.hourStat}>
      <Text style={[styles.hourValue, { color }]}>{value}</Text>
      <Text style={[styles.hourLabel, { color: sub }]}>{label}</Text>
    </View>
  );
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 21, fontWeight: '800', flex: 1 },
  sub: { fontSize: 14 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  mapText: { fontSize: 14, fontWeight: '600', flex: 1, textDecorationLine: 'underline' },
  managerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaTag: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  desc: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  badge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  badgeSm: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  hoursNumbers: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  hourStat: { alignItems: 'center', flex: 1 },
  hourValue: { fontSize: 24, fontWeight: '800' },
  hourLabel: { fontSize: 12, marginTop: 2 },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  addText: { fontSize: 13, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 13, marginTop: 2 },
  emptyLine: { fontSize: 14, paddingVertical: 4 },
  teamWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  photoHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  photoGroupTitle: { fontSize: 14, fontWeight: '700' },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 88, height: 88, borderRadius: 10, borderWidth: 1 },
});
