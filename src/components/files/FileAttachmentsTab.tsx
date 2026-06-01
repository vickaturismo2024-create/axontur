import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, Download, Trash2, FileText, Image, File, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/auth/AdminOnly';

interface Attachment {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

const BUCKET = 'file-attachments';
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime: string | null) {
  if (!mime) return <File className="h-5 w-5" />;
  if (mime.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

interface Props {
  fileId: string;
  agencyId: string;
}

export function FileAttachmentsTab({ fileId, agencyId }: Props) {
  const { user } = useAuth();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('file_attachments' as any)
      .select('*')
      .eq('file_id', fileId)
      .order('created_at', { ascending: false });
    setAttachments((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [fileId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;

    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} supera el límite de 50MB`);
        continue;
      }

      setUploading(true);
      try {
        const ext = file.name.split('.').pop() ?? '';
        const path = `${agencyId}/${fileId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('file_attachments' as any)
          .insert({
            agency_id: agencyId,
            file_id: fileId,
            name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
            uploaded_by: user.id,
          } as any);

        if (dbError) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw dbError;
        }

        toast.success(`${file.name} subido`);
      } catch (err) {
        console.error(err);
        toast.error(`Error al subir ${file.name}`);
      } finally {
        setUploading(false);
      }
    }

    if (inputRef.current) inputRef.current.value = '';
    load();
  };

  const handleDownload = async (att: Attachment) => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(att.storage_path, 60);

    if (error || !data) {
      toast.error('No se pudo generar el link de descarga');
      return;
    }

    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = att.name;
    a.click();
  };

  const confirmDelete = (att: Attachment) => {
    setDeleteId(att.id);
    setDeletePath(att.storage_path);
  };

  const handleDelete = async () => {
    if (!deleteId || !deletePath) return;

    await supabase.storage.from(BUCKET).remove([deletePath]);
    await supabase.from('file_attachments' as any).delete().eq('id', deleteId);

    setDeleteId(null);
    setDeletePath(null);
    toast.success('Archivo eliminado');
    load();
  };

  if (loading) return (
    <div className="py-8 text-center text-muted-foreground">Cargando archivos...</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Archivos adjuntos ({attachments.length})</h3>
        <Button
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Subiendo...</>
            : <><Upload className="mr-2 h-4 w-4" />Subir archivo</>
          }
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
        />
      </div>

      {attachments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <File className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No hay archivos adjuntos</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Subí PDFs, imágenes o documentos relacionados al expediente
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />Subir primer archivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attachments.map(att => (
            <Card key={att.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                  {getFileIcon(att.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{att.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {att.size_bytes && <span>{formatBytes(att.size_bytes)}</span>}
                    <span>·</span>
                    <span>{new Date(att.created_at).toLocaleDateString('es-AR')}</span>
                    {att.mime_type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {att.mime_type.split('/')[1]?.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(att)}
                    title="Descargar"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AdminOnly>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => confirmDelete(att)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AdminOnly>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeletePath(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo se eliminará del almacenamiento. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
