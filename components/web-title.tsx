import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useT } from '@/ctx/i18n';

// Primer segmento de la ruta -> clave de traducción de la sección.
const SECTION: Record<string, string> = {
  '': 'nav.dashboard',
  clientes: 'nav.clients',
  proyectos: 'nav.projects',
  empleados: 'nav.employees',
  pagos: 'nav.payments',
  gastos: 'nav.expenses',
  horas: 'nav.hours',
  'mis-horas': 'nav.my_hours',
  'mi-pago': 'nav.my_pay',
  cuenta: 'nav.account',
};

/** Ajusta el título de la pestaña del navegador a "LDD - {sección}" (solo web). */
export function WebTitle() {
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const seg = pathname.split('/').filter(Boolean)[0] ?? '';
    const key = SECTION[seg];
    document.title = key ? `LDD - ${t(key as Parameters<typeof t>[0])}` : 'LDD Landscape';
  }, [pathname, t]);

  return null;
}
