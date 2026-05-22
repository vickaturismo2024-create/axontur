import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET = 'agency-assets';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export interface UseImageUploadResult {
  uploading: boolean;
  uploadImage: (file: File, folder?: string) => Promise<string | null>;
  deleteImage: (url: string) => Promise<void>;
}

export function useImageUpload(): UseImageUploadResult {
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (
    file: File,
    folder = 'logos',
  ): Promise<string | null> => {
    if (file.size > MAX_SIZE) {
      toast.error('La imagen es demasiado grande. Máximo 5MB.');
      return null;
    }

    setUploading(true);
    try {
      // Nombre único: folder/timestamp-randomid.ext
      const ext      = file.name.split('.').pop() ?? 'jpg';
      const filename = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      // Devolver URL pública directa
      const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filename);

      return data.publicUrl;

    } catch (err) {
      console.error('Error subiendo imagen:', err);
      toast.error('No se pudo subir la imagen. Intentá de nuevo.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (url: string): Promise<void> => {
    try {
      // Extraer el path relativo desde la URL pública
      // La URL tiene formato: .../storage/v1/object/public/agency-assets/logos/xxx.jpg
      const marker = `/object/public/${BUCKET}/`;
      const idx    = url.indexOf(marker);
      if (idx === -1) return; // Es una URL externa, no la borramos

      const path = url.slice(idx + marker.length);
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (err) {
      console.error('Error borrando imagen:', err);
    }
  };

  return { uploading, uploadImage, deleteImage };
}
