/** Formatea un número como dólares: money(1234.5) => "$1,234.50". */
export function money(n: number): string {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
