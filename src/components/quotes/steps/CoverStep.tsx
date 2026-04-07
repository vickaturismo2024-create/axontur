import { Quote, Template } from '@/types/quote';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CoverStepProps {
  quote: Quote;
  templates: Template[];
  onUpdate: (updates: Partial<Quote>) => void;
}

export function CoverStep({ quote, templates, onUpdate }: CoverStepProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-4">
        <Label className="mb-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-gold" />
          Plantilla de diseño
        </Label>
        <Select
          value={quote.templateId}
          onValueChange={(value) => onUpdate({ templateId: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una plantilla" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: template.colors.primary }} />
                    <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: template.colors.accent }} />
                  </div>
                  <span>{template.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs text-muted-foreground">
          Puedes cambiar la plantilla en cualquier momento
        </p>
      </div>

      <div>
        <Label htmlFor="coverTitle">Título</Label>
        <Input
          id="coverTitle"
          value={quote.cover.title}
          onChange={(e) => onUpdate({ cover: { ...quote.cover, title: e.target.value } })}
          placeholder="PRESUPUESTO DE VIAJE"
        />
      </div>
      <div>
        <Label htmlFor="coverSubtitle">Subtítulo</Label>
        <Textarea
          id="coverSubtitle"
          value={quote.cover.subtitle}
          onChange={(e) => onUpdate({ cover: { ...quote.cover, subtitle: e.target.value } })}
          placeholder="Una experiencia inolvidable..."
          rows={2}
        />
      </div>
      
      <ImageUpload
        label="Imagen de portada"
        value={quote.cover.imageUrl}
        onChange={(value) => onUpdate({ cover: { ...quote.cover, imageUrl: value } })}
        placeholder="https://ejemplo.com/imagen.jpg"
      />
    </div>
  );
}
