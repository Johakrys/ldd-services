import type { Database } from '@/lib/database.types';

/** Fila de una tabla: Tables<'clients'>, Tables<'projects'>, ... */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Insert de una tabla: Insert<'clients'>, ... */
export type Insert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Update de una tabla: Update<'clients'>, ... */
export type Update<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/** Valores de un enum: Enums<'project_status'>, ... */
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
