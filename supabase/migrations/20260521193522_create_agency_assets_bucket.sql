-- Crear bucket público para imágenes de agencias
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agency-assets',
  'agency-assets',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquier usuario autenticado puede subir a su propia carpeta
CREATE POLICY "authenticated users can upload agency assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'agency-assets'
    AND auth.role() = 'authenticated'
  );

-- Política: cualquier usuario autenticado puede actualizar sus propios archivos
CREATE POLICY "authenticated users can update agency assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'agency-assets'
    AND auth.role() = 'authenticated'
  );

-- Política: cualquier usuario autenticado puede borrar sus propios archivos
CREATE POLICY "authenticated users can delete agency assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'agency-assets'
    AND auth.role() = 'authenticated'
  );

-- Política: lectura pública (para mostrar logos en PDFs públicos sin autenticación)
CREATE POLICY "public can read agency assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agency-assets');
