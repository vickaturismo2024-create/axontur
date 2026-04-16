import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings, formatFileNumber, formatReceiptNumber } from '@/contexts/SettingsContext';

export function DocumentsTab() {
  const { settings, updateSettings } = useSettings();
  const [local, setLocal] = useState({
    file_prefix: settings.file_prefix,
    receipt_prefix: settings.receipt_prefix,
    pdf_footer_legal: settings.pdf_footer_legal,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal({
      file_prefix: settings.file_prefix,
      receipt_prefix: settings.receipt_prefix,
      pdf_footer_legal: settings.pdf_footer_legal,
    });
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const cleanFile = (local.file_prefix || 'FILE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'FILE';
      const cleanRec = (local.receipt_prefix || 'REC').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'REC';
      await updateSettings({
        file_prefix: cleanFile,
        receipt_prefix: cleanRec,
        pdf_footer_legal: local.pdf_footer_legal,
      });
      toast.success('Configuración de documentos guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Prefijo de expedientes</Label>
          <Input
            value={local.file_prefix}
            onChange={(e) => setLocal(p => ({ ...p, file_prefix: e.target.value }))}
            placeholder="FILE"
            maxLength={8}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Vista previa: <span className="font-mono font-bold">{formatFileNumber(1, local.file_prefix || 'FILE')}</span>
          </p>
        </div>
        <div>
          <Label>Prefijo de recibos</Label>
          <Input
            value={local.receipt_prefix}
            onChange={(e) => setLocal(p => ({ ...p, receipt_prefix: e.target.value }))}
            placeholder="REC"
            maxLength={8}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Vista previa: <span className="font-mono font-bold">{formatReceiptNumber(1, local.receipt_prefix || 'REC')}</span>
          </p>
        </div>
      </div>

      <div>
        <Label>Texto legal al pie de los PDFs</Label>
        <Textarea
          value={local.pdf_footer_legal}
          onChange={(e) => setLocal(p => ({ ...p, pdf_footer_legal: e.target.value }))}
          placeholder="Ej: Este presupuesto es válido por 7 días sujeto a disponibilidad. Los precios pueden variar según fecha y tipo de cambio."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Aparecerá al pie de los presupuestos y recibos generados en PDF.
        </p>
      </div>

      <Button onClick={save} disabled={saving}>
        <Save className="mr-2 h-4 w-4" />
        {saving ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  );
}
