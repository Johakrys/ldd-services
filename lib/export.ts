import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

const BRAND = '#004aad';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type Table = {
  heading?: string;
  headers: string[];
  rows: string[][];
  totalLabel?: string;
  totalValue?: string;
};

function tableHtml(t: Table): string {
  const head = t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = t.rows
    .map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('');
  const total =
    t.totalLabel != null
      ? `<tr class="total"><td colspan="${t.headers.length - 1}">${escapeHtml(
          t.totalLabel,
        )}</td><td>${escapeHtml(t.totalValue ?? '')}</td></tr>`
      : '';
  const heading = t.heading ? `<h2>${escapeHtml(t.heading)}</h2>` : '';
  return `${heading}<table><thead><tr>${head}</tr></thead><tbody>${body}${total}</tbody></table>`;
}

type Photo = { caption: string; dataUri: string };

/** HTML de un reporte con una o varias tablas (y opcionalmente fotos), marca LD&D. */
export function reportTables(opts: {
  title: string;
  subtitle?: string;
  tables: Table[];
  photos?: Photo[];
  photosHeading?: string;
}): string {
  const { title, subtitle, tables, photos, photosHeading } = opts;
  const gallery =
    photos && photos.length
      ? `<h2>${escapeHtml(photosHeading ?? 'Fotos')}</h2><div class="gallery">${photos
          .map(
            (p) =>
              `<figure class="ph"><img src="${p.dataUri}"/><figcaption>${escapeHtml(p.caption)}</figcaption></figure>`,
          )
          .join('')}</div>`
      : '';
  return `<!doctype html><html><head><meta charset="utf-8">
  <style>
    body{font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#11181C;padding:28px}
    h1{color:${BRAND};margin:0 0 2px;font-size:22px}
    h2{color:${BRAND};margin:24px 0 8px;font-size:16px}
    .sub{color:#5B6673;margin:0 0 12px;font-size:13px}
    table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
    th{background:${BRAND};color:#fff;text-align:left;padding:10px}
    td{padding:10px;border-bottom:1px solid #E4E9F0}
    tr:nth-child(even) td{background:#F4F6FA}
    .total td{font-weight:700;background:#EAF0FA;border-top:2px solid ${BRAND}}
    .gallery{display:flex;flex-wrap:wrap;gap:16px}
    .ph{width:47%;margin:0;page-break-inside:avoid;break-inside:avoid}
    .ph img{width:100%;border:1px solid #E4E9F0;border-radius:8px}
    .ph figcaption{font-size:11px;color:#5B6673;margin-top:5px;line-height:1.4}
  </style></head><body>
    <h1>LD&amp;D Services</h1>
    <p class="sub">${escapeHtml(title)}${subtitle ? ' · ' + escapeHtml(subtitle) : ''}</p>
    ${tables.map(tableHtml).join('')}
    ${gallery}
  </body></html>`;
}

/** HTML de un reporte de una sola tabla (atajo de reportTables). */
export function reportHtml(opts: {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  totalLabel?: string;
  totalValue?: string;
}): string {
  return reportTables({
    title: opts.title,
    subtitle: opts.subtitle,
    tables: [
      { headers: opts.headers, rows: opts.rows, totalLabel: opts.totalLabel, totalValue: opts.totalValue },
    ],
  });
}

/** En web: imprime el HTML del reporte (PDF real de los datos), no la vista. */
async function printHtmlWeb(html: string) {
  const g: any = globalThis;
  const doc = g.document;
  const iframe = doc.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  doc.body.appendChild(iframe);
  const idoc = iframe.contentWindow.document;
  idoc.open();
  idoc.write(html);
  idoc.close();
  await new Promise((r) => setTimeout(r, 300));
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => {
    try {
      doc.body.removeChild(iframe);
    } catch {
      // ignorar
    }
  }, 1500);
}

/** Genera un PDF con los datos y lo abre para guardar/compartir/imprimir. */
export async function sharePdf(html: string, title = 'Reporte LD&D') {
  if (Platform.OS === 'web') {
    await printHtmlWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: title, UTI: 'com.adobe.pdf' });
  }
}

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Sheet = { name: string; headers: string[]; rows: (string | number)[][] };

/** Genera un archivo Excel (.xlsx) con una o varias hojas y lo descarga/comparte. */
export async function shareExcel(opts: { filename: string; sheets: Sheet[] }) {
  const wb = XLSX.utils.book_new();
  opts.sheets.forEach((s) => {
    const ws = XLSX.utils.aoa_to_sheet([s.headers, ...s.rows]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  });
  const filename = opts.filename.endsWith('.xlsx') ? opts.filename : `${opts.filename}.xlsx`;

  if (Platform.OS === 'web') {
    const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const g: any = globalThis;
    const blob = new g.Blob([out], { type: XLSX_MIME });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => g.URL.revokeObjectURL(url), 1500);
    return;
  }

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: filename, UTI: 'com.microsoft.excel.xlsx' });
  }
}
