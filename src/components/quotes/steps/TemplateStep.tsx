import { Quote, Template } from '@/types/quote';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TemplateStepProps {
  quote: Quote;
  templates: Template[];
  onUpdate: (updates: Partial<Quote>) => void;
}

export function TemplateStep({ quote, templates, onUpdate }: TemplateStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium">Selecciona una plantilla de diseño</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Define el estilo visual de tu presupuesto. Podrás cambiarlo más adelante.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.id}
            onClick={() => onUpdate({ templateId: template.id })}
            className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:shadow-md ${
              quote.templateId === template.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="mb-3 flex gap-2">
              <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: template.colors.primary }} />
              <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: template.colors.secondary }} />
              <div className="h-8 w-8 rounded-full border" style={{ backgroundColor: template.colors.accent }} />
            </div>
            <h4 className="font-serif font-medium">{template.name}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {template.fonts.heading} / {template.fonts.body}
            </p>
            {quote.templateId === template.id && (
              <div className="mt-2 flex items-center gap-1 text-xs text-primary">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Seleccionada
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No hay plantillas disponibles.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ve a la sección de Plantillas para crear una.
          </p>
        </div>
      )}
    </div>
  );
}
