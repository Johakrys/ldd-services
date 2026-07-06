import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/ctx/auth';
import { useI18n } from '@/ctx/i18n';
import { supabase } from '@/lib/supabase';

const NOTIF_ID = 'task-in-progress';
const CHANNEL_ONGOING = 'task-progress';
const CHANNEL_EVENTS = 'events';

// expo-notifications no funciona en Expo Go (SDK 53+ quitó el push). Solo lo
// cargamos en un development/production build; en Expo Go queda desactivado.
const isExpoGo = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
type OpenEntry = { clock_in: string; job_id: string; jobs: { title: string } | null };
type NotifRow = { id: string; type: string; body: string | null; related_id: string | null; created_at: string };

/** Notificaciones del móvil (solo en dev/production build, no en Expo Go ni web):
 *  tarea en curso (persistente) + avisos de tarea asignada y pago recibido. */
export function TaskNotification() {
  const { session } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const userId = session?.user.id ?? null;

  // Mantener referencias frescas sin re-ejecutar el efecto.
  const routerRef = useRef(router);
  routerRef.current = router;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (isExpoGo || !userId) return;
    let cancelled = false;
    let Notif: NotificationsModule | null = null;
    let responseSub: { remove: () => void } | null = null;
    let appSub: { remove: () => void } | null = null;
    let ongoingInterval: ReturnType<typeof setInterval> | null = null;
    let eventsInterval: ReturnType<typeof setInterval> | null = null;
    let ongoingShown = false;
    let ongoingLastBody = '';
    let lastSeen: string | null = null;
    const seenKey = `notif_seen_${userId}`;

    function handleTap(data: Record<string, unknown> | undefined) {
      if (data && typeof data.taskId === 'string' && data.taskId) {
        routerRef.current.push({ pathname: '/proyectos/tarea-detalle', params: { taskId: data.taskId } });
      } else if (data && data.screen === 'mi-pago') {
        routerRef.current.push('/mi-pago');
      }
    }

    async function dismissOngoing() {
      if (!Notif || !ongoingShown) return;
      ongoingShown = false;
      ongoingLastBody = '';
      await Notif.dismissNotificationAsync(NOTIF_ID).catch(() => {});
    }

    async function ongoingTick() {
      if (cancelled || !Notif) return;
      const emp = await supabase.from('employees').select('id').eq('user_id', userId!).maybeSingle();
      const empId = emp.data?.id;
      if (!empId) return dismissOngoing();

      const oe = await supabase
        .from('time_entries')
        .select('clock_in, job_id, jobs(title)')
        .eq('employee_id', empId)
        .is('clock_out', null)
        .not('job_id', 'is', null)
        .order('clock_in')
        .limit(1)
        .maybeSingle();
      const row = oe.data as OpenEntry | null;
      if (!row || !row.job_id) return dismissOngoing();

      const title = row.jobs?.title ?? '';
      const body = `${title} · ${tRef.current('notif.elapsed')}: ${elapsed(row.clock_in)}`;
      if (ongoingShown && body === ongoingLastBody) return;
      try {
        await Notif.scheduleNotificationAsync({
          identifier: NOTIF_ID,
          content: {
            title: tRef.current('notif.task_running'),
            body,
            data: { taskId: row.job_id },
            color: '#004aad',
            sticky: true,
            autoDismiss: false,
          },
          trigger: { channelId: CHANNEL_ONGOING },
        });
        ongoingShown = true;
        ongoingLastBody = body;
      } catch {
        // ignorar
      }
    }

    async function eventsPoll() {
      if (cancelled || !Notif || !lastSeen) return;
      const { data } = await supabase
        .from('notifications')
        .select('id, type, body, related_id, created_at')
        .eq('recipient_id', userId!)
        .gt('created_at', lastSeen)
        .order('created_at', { ascending: true })
        .limit(20);
      const rows = (data as NotifRow[] | null) ?? [];
      if (rows.length === 0) return;
      for (const n of rows) {
        const isPay = n.type === 'payment';
        await Notif.scheduleNotificationAsync({
          content: {
            title: isPay ? tRef.current('notif.payment_title') : tRef.current('notif.assigned_title'),
            body: n.body ?? '',
            data: isPay ? { screen: 'mi-pago' } : { taskId: n.related_id ?? '' },
            color: '#004aad',
          },
          trigger: { channelId: CHANNEL_EVENTS },
        }).catch(() => {});
      }
      lastSeen = rows[rows.length - 1].created_at;
      await AsyncStorage.setItem(seenKey, lastSeen);
    }

    (async () => {
      Notif = await import('expo-notifications');
      if (cancelled) return;

      Notif.setNotificationHandler({
        handleNotification: async (n) => {
          const ongoing = n.request.identifier === NOTIF_ID;
          return {
            shouldShowBanner: !ongoing,
            shouldShowList: true,
            shouldPlaySound: !ongoing,
            shouldSetBadge: false,
          };
        },
      });

      const perm = await Notif.getPermissionsAsync();
      if (!perm.granted) {
        const req = await Notif.requestPermissionsAsync();
        if (!req.granted || cancelled) return;
      }

      await Notif.setNotificationChannelAsync(CHANNEL_ONGOING, {
        name: 'Tarea en curso',
        importance: Notif.AndroidImportance.LOW,
        showBadge: false,
      });
      await Notif.setNotificationChannelAsync(CHANNEL_EVENTS, {
        name: 'Avisos',
        importance: Notif.AndroidImportance.HIGH,
        showBadge: true,
      });

      responseSub = Notif.addNotificationResponseReceivedListener((resp) =>
        handleTap(resp.notification.request.content.data),
      );
      const last = await Notif.getLastNotificationResponseAsync();
      if (last) handleTap(last.notification.request.content.data);

      lastSeen = await AsyncStorage.getItem(seenKey);
      if (!lastSeen) {
        lastSeen = new Date().toISOString();
        await AsyncStorage.setItem(seenKey, lastSeen);
      }

      if (cancelled) return;
      ongoingTick();
      eventsPoll();
      ongoingInterval = setInterval(ongoingTick, 20000);
      eventsInterval = setInterval(eventsPoll, 20000);
      appSub = AppState.addEventListener('change', (s) => {
        if (s === 'active') {
          ongoingTick();
          eventsPoll();
        }
      });
    })();

    return () => {
      cancelled = true;
      responseSub?.remove();
      appSub?.remove();
      if (ongoingInterval) clearInterval(ongoingInterval);
      if (eventsInterval) clearInterval(eventsInterval);
      Notif?.dismissNotificationAsync(NOTIF_ID).catch(() => {});
    };
  }, [userId]);

  return null;
}

function elapsed(clockIn: string): string {
  const diff = Math.max(0, Date.now() - new Date(clockIn).getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
