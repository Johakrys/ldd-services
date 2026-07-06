import type { StringKey } from '@/lib/i18n/strings';

// Colores + clave de traducción para estados, prioridad y roles.

export const PROJECT_STATUS: Record<string, { tkey: StringKey; color: string }> = {
  in_progress: { tkey: 'status.in_progress', color: '#1E9E5A' },
  on_hold: { tkey: 'status.on_hold', color: '#B58A00' },
  completed: { tkey: 'status.completed', color: '#5B6673' },
};

export const JOB_STATUS: Record<string, { tkey: StringKey; color: string }> = {
  scheduled: { tkey: 'jobstatus.scheduled', color: '#1565E0' },
  in_progress: { tkey: 'jobstatus.in_progress', color: '#1E9E5A' },
  completed: { tkey: 'jobstatus.completed', color: '#5B6673' },
  cancelled: { tkey: 'jobstatus.cancelled', color: '#E5544B' },
};

export const PRIORITY: Record<string, { tkey: StringKey; color: string }> = {
  low: { tkey: 'priority.low', color: '#5B6673' },
  medium: { tkey: 'priority.medium', color: '#1565E0' },
  high: { tkey: 'priority.high', color: '#E08A00' },
  urgent: { tkey: 'priority.urgent', color: '#E5544B' },
};

export const ROLE_TKEY: Record<string, StringKey> = {
  employee: 'role.employee',
  manager: 'role.manager',
  admin: 'role.admin',
};

export const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'];
export const ROLE_VALUES = ['employee', 'manager', 'admin'];
