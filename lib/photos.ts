import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PhotoType = 'before' | 'after' | 'progress';

const BUCKET = 'job-photos';
const MAX_WIDTH = 1600;

/** Abre la cámara (o galería si no hay permiso), optimiza la foto y la devuelve. */
export async function capturePhoto(): Promise<{ uri: string; mimeType: string } | null> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const result = cam.granted
    ? await ImagePicker.launchCameraAsync({ quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ quality: 1, mediaTypes: ['images'] });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];

  // Optimiza para ahorrar almacenamiento y acelerar subida/carga: redimensiona
  // a máx 1600 px de ancho (solo si es más grande) y comprime a JPEG.
  const actions = a.width && a.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
  const optimized = await ImageManipulator.manipulateAsync(a.uri, actions, {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return { uri: optimized.uri, mimeType: 'image/jpeg' };
}

/** Sube una foto al Storage y registra la fila en la tabla photos.
 *  jobId null = foto a nivel de proyecto (antes/después del lugar). */
export async function uploadJobPhoto(opts: {
  jobId: string | null;
  projectId: string;
  type: PhotoType;
  uri: string;
  mimeType: string;
  uploadedBy: string | null;
  takenAt: string;
}): Promise<{ error: string | null }> {
  const ext = opts.mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${opts.projectId}/${opts.jobId ?? 'project'}/${opts.type}-${opts.takenAt.replace(/[:.]/g, '-')}.${ext}`;

  const arraybuffer = await fetch(opts.uri).then((r) => r.arrayBuffer());
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, arraybuffer, { contentType: opts.mimeType, upsert: false });
  if (up.error) return { error: up.error.message };

  const ins = await supabase.from('photos').insert({
    job_id: opts.jobId ?? null,
    project_id: opts.projectId,
    type: opts.type,
    storage_path: path,
    uploaded_by: opts.uploadedBy,
    taken_at: opts.takenAt,
  });
  if (ins.error) return { error: ins.error.message };
  return { error: null };
}

/** Sube la foto de una factura (bucket job-photos, prefijo expenses/) y
 *  devuelve la ruta guardada para asociarla al gasto. */
export async function uploadExpenseReceipt(opts: {
  projectId: string;
  uri: string;
  mimeType: string;
}): Promise<{ path: string | null; error: string | null }> {
  const ext = opts.mimeType.includes('png') ? 'png' : 'jpg';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `expenses/${opts.projectId}/${stamp}.${ext}`;
  const arraybuffer = await fetch(opts.uri).then((r) => r.arrayBuffer());
  const up = await supabase.storage
    .from(BUCKET)
    .upload(path, arraybuffer, { contentType: opts.mimeType, upsert: false });
  if (up.error) return { path: null, error: up.error.message };
  return { path, error: null };
}

/** URL firmada temporal para mostrar una foto privada. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Descarga la foto y la devuelve como data URI (base64) para incrustarla en un PDF. */
export async function photoDataUri(path: string): Promise<string | null> {
  const url = await signedPhotoUrl(path);
  if (!url) return null;
  try {
    const blob = await fetch(url).then((r) => r.blob());
    const FR: any = (globalThis as any).FileReader;
    if (!FR) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FR();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
