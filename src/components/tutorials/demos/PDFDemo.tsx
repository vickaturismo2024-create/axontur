import { DemoStep } from '../TutorialDemo';
import { FileText, Download, Share2, QrCode } from 'lucide-react';

export const pdfDemoSteps: DemoStep[] = [
  {
    visual: (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Vista Previa en Vivo</p>
        {/* Mini PDF mockup */}
        <div className="w-32 rounded border border-border bg-card shadow-sm overflow-hidden">
          <div className="h-10 bg-primary flex items-end p-1">
            <span className="text-[6px] text-primary-foreground font-bold">PRESUPUESTO</span>
          </div>
          <div className="p-1.5 space-y-1">
            <div className="h-1 w-full rounded bg-muted" />
            <div className="h-1 w-3/4 rounded bg-muted" />
            <div className="h-1 w-1/2 rounded bg-muted" />
          </div>
        </div>
      </div>
    ),
    description: 'En la última pestaña del asistente verás una preview del presupuesto tal como se exportará.',
  },
  {
    visual: (
      <div className="flex justify-center gap-6">
        {[
          { icon: Download, label: 'Exportar PDF' },
          { icon: Share2, label: 'Compartir link' },
          { icon: QrCode, label: 'Código QR' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    ),
    description: 'Exportá el PDF, compartí un link directo o generá un QR para que el cliente acceda al presupuesto.',
  },
];
