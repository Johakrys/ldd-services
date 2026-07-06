import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

export type PhotoType = 'before' | 'after' | 'progress';

const BUCKET = 'job-photos';

/** Abre la cámara (o galería si no hay permiso) y devuelve la foto elegida. */
export async function capturePhoto(): Promise<{ uri: string; mimeType: string } | null> {
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const result = cam.granted
    ? await ImagePicker.launchCameraAsync({ quality: 0.6 })
    : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, mediaTypes: ['images'] });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' };
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

/** URL firmada temporal para mostrar una foto privada. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
