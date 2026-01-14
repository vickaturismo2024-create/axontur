import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { Template, WhatsAppAgent } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { 
  Plus, 
  Palette, 
  Type, 
  Layout,
  Trash2,
  Copy,
  Pencil,
  Save,
  X,
  MessageCircle,
  Square,
  Minus,
  Layers
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';

const Templates = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useQuotes();
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: 'Nueva Plantilla',
      logoUrl: '',
      colors: {
        primary: '#1e3a5f',
        secondary: '#d4c4a8',
        accent: '#c9a227',
        background: '#ffffff',
        cardBackground: '#f8f9fa',
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Inter',
      },
      styles: {
        borderRadius: '12px',
        cardShadow: true,
        separatorStyle: 'line',
        borderStyle: 'none',
        borderWidth: '1px',
        backgroundPattern: 'none',
        cardStyle: 'elevated',
      },
      whatsappAgents: [
        { name: 'Victoria', phone: '5491123456789' },
      ],
      footerText: 'Vicka Turismo | Tel: +54 11 2345-6789',
      sectionsToggles: {
        flights: true,
        lodging: true,
        transfers: true,
        insurance: true,
        itinerary: true,
      },
    };
    setEditingTemplate(newTemplate);
    setIsDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    const newTemplate: Template = {
      ...template,
      id: crypto.randomUUID(),
      name: `${template.name} (copia)`,
    };
    addTemplate(newTemplate);
  };

  const handleDelete = (id: string) => {
    if (id === 'default') {
      alert('No se puede eliminar la plantilla predeterminada');
      return;
    }
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      deleteTemplate(id);
    }
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    
    const exists = templates.find(t => t.id === editingTemplate.id);
    if (exists) {
      updateTemplate(editingTemplate);
    } else {
      addTemplate(editingTemplate);
    }
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const updateEditingTemplate = (updates: Partial<Template>) => {
    if (!editingTemplate) return;
    setEditingTemplate({ ...editingTemplate, ...updates });
  };

  const addWhatsAppAgent = () => {
    if (!editingTemplate) return;
    updateEditingTemplate({
      whatsappAgents: [
        ...editingTemplate.whatsappAgents,
        { name: '', phone: '' },
      ],
    });
  };

  const updateWhatsAppAgent = (index: number, updates: Partial<WhatsAppAgent>) => {
    if (!editingTemplate) return;
    const agents = [...editingTemplate.whatsappAgents];
    agents[index] = { ...agents[index], ...updates };
    updateEditingTemplate({ whatsappAgents: agents });
  };

  const removeWhatsAppAgent = (index: number) => {
    if (!editingTemplate) return;
    updateEditingTemplate({
      whatsappAgents: editingTemplate.whatsappAgents.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Plantillas
            </h1>
            <p className="mt-1 text-muted-foreground">
              Personaliza el diseño de tus presupuestos
            </p>
          </div>
          <Button onClick={handleCreate} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Plantilla
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <CardHeader className="relative pb-2">
                {/* Color Preview */}
                <div className="mb-3 flex gap-2">
                  <div 
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: template.colors.primary }}
                    title="Primario"
                  />
                  <div 
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: template.colors.secondary }}
                    title="Secundario"
                  />
                  <div 
                    className="h-8 w-8 rounded-full border"
                    style={{ backgroundColor: template.colors.accent }}
                    title="Acento"
                  />
                </div>
                <CardTitle className="font-serif text-lg">
                  {template.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <p>Tipografía: {template.fonts.heading}</p>
                  <p>Agentes WhatsApp: {template.whatsappAgents.length}</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicate(template)}
                  >
                    <Copy className="mr-1 h-4 w-4" />
                    Duplicar
                  </Button>
                  {template.id !== 'default' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingTemplate && templates.find(t => t.id === editingTemplate.id) 
                ? 'Editar Plantilla' 
                : 'Nueva Plantilla'}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6">
              {/* Nombre */}
              <div>
                <Label>Nombre de la plantilla</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => updateEditingTemplate({ name: e.target.value })}
                />
              </div>

              {/* Logo */}
              <ImageUpload
                label="Logo de la agencia"
                value={editingTemplate.logoUrl}
                onChange={(value) => updateEditingTemplate({ logoUrl: value })}
                placeholder="https://ejemplo.com/logo.png"
                previewClassName="h-24"
              />

              {/* Colores */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Colores
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Primario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTemplate.colors.primary}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, primary: e.target.value } 
                        })}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={editingTemplate.colors.primary}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, primary: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Secundario</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTemplate.colors.secondary}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, secondary: e.target.value } 
                        })}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={editingTemplate.colors.secondary}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, secondary: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Acento</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTemplate.colors.accent}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, accent: e.target.value } 
                        })}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={editingTemplate.colors.accent}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, accent: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fondo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTemplate.colors.background || '#ffffff'}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, background: e.target.value } 
                        })}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={editingTemplate.colors.background || '#ffffff'}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, background: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fondo Cards</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingTemplate.colors.cardBackground || '#f8f9fa'}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, cardBackground: e.target.value } 
                        })}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={editingTemplate.colors.cardBackground || '#f8f9fa'}
                        onChange={(e) => updateEditingTemplate({ 
                          colors: { ...editingTemplate.colors, cardBackground: e.target.value } 
                        })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tipografías */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Tipografías
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Títulos</Label>
                    <Input
                      value={editingTemplate.fonts.heading}
                      onChange={(e) => updateEditingTemplate({ 
                        fonts: { ...editingTemplate.fonts, heading: e.target.value } 
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Texto</Label>
                    <Input
                      value={editingTemplate.fonts.body}
                      onChange={(e) => updateEditingTemplate({ 
                        fonts: { ...editingTemplate.fonts, body: e.target.value } 
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Estilos de Cards */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Estilo de Cards
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo de card</Label>
                    <select
                      value={editingTemplate.styles.cardStyle}
                      onChange={(e) => updateEditingTemplate({ 
                        styles: { ...editingTemplate.styles, cardStyle: e.target.value as any } 
                      })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="flat">Plano</option>
                      <option value="elevated">Elevado (sombra)</option>
                      <option value="outlined">Con borde</option>
                      <option value="glass">Efecto cristal</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Radio de bordes</Label>
                    <select
                      value={editingTemplate.styles.borderRadius}
                      onChange={(e) => updateEditingTemplate({ 
                        styles: { ...editingTemplate.styles, borderRadius: e.target.value } 
                      })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="0px">Sin bordes redondeados</option>
                      <option value="4px">Mínimo (4px)</option>
                      <option value="8px">Pequeño (8px)</option>
                      <option value="12px">Medio (12px)</option>
                      <option value="16px">Grande (16px)</option>
                      <option value="20px">Extra grande (20px)</option>
                      <option value="9999px">Completamente redondeado</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Sombra en cards</Label>
                    <Switch
                      checked={editingTemplate.styles.cardShadow}
                      onCheckedChange={(checked) => updateEditingTemplate({
                        styles: { ...editingTemplate.styles, cardShadow: checked }
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Bordes decorativos */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Bordes Decorativos
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Estilo de borde</Label>
                    <select
                      value={editingTemplate.styles.borderStyle}
                      onChange={(e) => updateEditingTemplate({ 
                        styles: { ...editingTemplate.styles, borderStyle: e.target.value as any } 
                      })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="none">Sin borde</option>
                      <option value="solid">Sólido</option>
                      <option value="dashed">Punteado</option>
                      <option value="double">Doble</option>
                      <option value="decorative">Decorativo</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Grosor de borde</Label>
                    <select
                      value={editingTemplate.styles.borderWidth}
                      onChange={(e) => updateEditingTemplate({ 
                        styles: { ...editingTemplate.styles, borderWidth: e.target.value } 
                      })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="1px">Fino (1px)</option>
                      <option value="2px">Medio (2px)</option>
                      <option value="3px">Grueso (3px)</option>
                      <option value="4px">Extra grueso (4px)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Separadores */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Minus className="h-4 w-4" />
                  Estilo de Separadores
                </Label>
                <div className="space-y-3">
                  <select
                    value={editingTemplate.styles.separatorStyle}
                    onChange={(e) => updateEditingTemplate({ 
                      styles: { ...editingTemplate.styles, separatorStyle: e.target.value as any } 
                    })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">Sin separador</option>
                    <option value="line">Línea simple</option>
                    <option value="dots">Puntos</option>
                    <option value="gradient">Degradado</option>
                    <option value="decorative">Decorativo (con ornamentos)</option>
                  </select>
                  {/* Separator Preview */}
                  <div className="rounded border p-4">
                    <p className="mb-2 text-xs text-muted-foreground">Vista previa:</p>
                    <div className="flex items-center justify-center py-2">
                      {editingTemplate.styles.separatorStyle === 'line' && (
                        <div className="h-px w-full" style={{ backgroundColor: editingTemplate.colors.accent }} />
                      )}
                      {editingTemplate.styles.separatorStyle === 'dots' && (
                        <div className="flex w-full items-center justify-center gap-2">
                          {[...Array(5)].map((_, i) => (
                            <div 
                              key={i} 
                              className="h-2 w-2 rounded-full" 
                              style={{ backgroundColor: editingTemplate.colors.accent }}
                            />
                          ))}
                        </div>
                      )}
                      {editingTemplate.styles.separatorStyle === 'gradient' && (
                        <div 
                          className="h-1 w-full rounded-full"
                          style={{ 
                            background: `linear-gradient(90deg, transparent, ${editingTemplate.colors.accent}, transparent)` 
                          }}
                        />
                      )}
                      {editingTemplate.styles.separatorStyle === 'decorative' && (
                        <div className="flex w-full items-center gap-2">
                          <div className="h-px flex-1" style={{ backgroundColor: editingTemplate.colors.accent }} />
                          <div 
                            className="h-3 w-3 rotate-45" 
                            style={{ backgroundColor: editingTemplate.colors.accent }}
                          />
                          <div className="h-px flex-1" style={{ backgroundColor: editingTemplate.colors.accent }} />
                        </div>
                      )}
                      {editingTemplate.styles.separatorStyle === 'none' && (
                        <span className="text-xs text-muted-foreground">Sin separador</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patrón de fondo */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Patrón de Fondo
                </Label>
                <div className="space-y-3">
                  <select
                    value={editingTemplate.styles.backgroundPattern}
                    onChange={(e) => updateEditingTemplate({ 
                      styles: { ...editingTemplate.styles, backgroundPattern: e.target.value as any } 
                    })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="none">Sin patrón</option>
                    <option value="dots">Puntos</option>
                    <option value="lines">Líneas diagonales</option>
                    <option value="grid">Cuadrícula</option>
                    <option value="waves">Ondas</option>
                  </select>
                  {/* Pattern Preview */}
                  <div 
                    className="h-20 rounded border"
                    style={{
                      backgroundColor: editingTemplate.colors.background || '#ffffff',
                      backgroundImage: 
                        editingTemplate.styles.backgroundPattern === 'dots' 
                          ? `radial-gradient(${editingTemplate.colors.primary}15 1px, transparent 1px)`
                          : editingTemplate.styles.backgroundPattern === 'lines'
                          ? `repeating-linear-gradient(45deg, ${editingTemplate.colors.primary}10, ${editingTemplate.colors.primary}10 1px, transparent 1px, transparent 10px)`
                          : editingTemplate.styles.backgroundPattern === 'grid'
                          ? `linear-gradient(${editingTemplate.colors.primary}10 1px, transparent 1px), linear-gradient(90deg, ${editingTemplate.colors.primary}10 1px, transparent 1px)`
                          : editingTemplate.styles.backgroundPattern === 'waves'
                          ? `url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z' fill='${encodeURIComponent(editingTemplate.colors.primary)}' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`
                          : 'none',
                      backgroundSize: 
                        editingTemplate.styles.backgroundPattern === 'dots' ? '20px 20px'
                        : editingTemplate.styles.backgroundPattern === 'grid' ? '20px 20px'
                        : 'auto',
                    }}
                  >
                    <p className="p-2 text-xs text-muted-foreground">Vista previa del patrón</p>
                  </div>
                </div>
              </div>

              {/* Secciones */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Secciones visibles
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(editingTemplate.sectionsToggles).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label className="capitalize">{key}</Label>
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) => updateEditingTemplate({
                          sectionsToggles: { ...editingTemplate.sectionsToggles, [key]: checked }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Agents */}
              <div>
                <Label className="mb-2 flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Agentes WhatsApp
                </Label>
                <div className="space-y-3">
                  {editingTemplate.whatsappAgents.map((agent, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={agent.name}
                        onChange={(e) => updateWhatsAppAgent(index, { name: e.target.value })}
                        placeholder="Nombre"
                        className="flex-1"
                      />
                      <Input
                        value={agent.phone}
                        onChange={(e) => updateWhatsAppAgent(index, { phone: e.target.value })}
                        placeholder="5491123456789"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeWhatsAppAgent(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={addWhatsAppAgent} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar agente
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div>
                <Label>Texto del pie de página</Label>
                <Input
                  value={editingTemplate.footerText}
                  onChange={(e) => updateEditingTemplate({ footerText: e.target.value })}
                  placeholder="Vicka Turismo | Tel: ..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-primary">
              <Save className="mr-2 h-4 w-4" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
