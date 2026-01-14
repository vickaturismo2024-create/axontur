import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { useQuotes } from '@/contexts/QuotesContext';
import { Template, WhatsAppAgent } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
  MessageCircle
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
      },
      fonts: {
        heading: 'Playfair Display',
        body: 'Inter',
      },
      styles: {
        borderRadius: '12px',
        cardShadow: true,
        separatorStyle: 'line',
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
              <div>
                <Label>URL del logo</Label>
                <Input
                  value={editingTemplate.logoUrl}
                  onChange={(e) => updateEditingTemplate({ logoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

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
