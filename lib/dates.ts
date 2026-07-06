// Utilidades de fecha para los filtros "desde / hasta".

/** Primer día del mes actual (a medianoche, hora local del dispositivo). */
export function firstOfMonth(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

/** Medianoche local del día indicado, en ISO (para comparar con clock_in). */
export function dayStartISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

/** Medianoche local del día SIGUIENTE (límite superior exclusivo, incluye todo el día "hasta"). */
export function dayEndExclusiveISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0).toISOString();
}

/**
 * Viernes de pago de la semana de un clock_in, como 'YYYY-MM-DD' (en UTC),
 * replicando la lógica de la vista: clock_in::date + (5 - dow + 7) % 7.
 */
export function payFridayStr(clockInISO: string): string {
  const d = new Date(clockInISO);
  const dow = d.getUTCDay(); // 0=Dom ... 6=Sáb
  const add = (5 - dow + 7) % 7;
  const friday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add));
  return friday.toISOString().slice(0, 10);
}

/** Etiqueta corta de un rango, ej. "1 jul – 6 jul 2026". */
export function rangeLabel(from: Date, to: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const f = from.toLocaleDateString(locale, opts);
  const t = to.toLocaleDateString(locale, { ...opts, year: 'numeric' });
  return `${f} – ${t}`;
}
