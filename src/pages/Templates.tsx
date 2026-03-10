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
import { Slider } from '@/components/ui/slider';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Plus, Palette, Type, Layout, Trash2, Copy, Pencil, Save, X,
  MessageCircle, Square, Minus, Layers, Star, Image, Settings,
  AlignCenter, AlignLeft, AlignRight, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { TemplatePreviewPanel } from '@/components/templates/TemplatePreviewPanel';
import { FontSelect } from '@/components/templates/FontSelect';

const Templates = () => {
  const { templates, addTemplate, updateTemplate, deleteTemplate, setDefaultTemplate, defaultTemplateId, isLoading } = useQuotes();
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
        text: '#1e3a5f',
      },
      fonts: { heading: 'Playfair Display', body: 'Inter' },
      styles: {
        borderRadius: '12px',
        cardShadow: true,
        separatorStyle: 'line',
        borderStyle: 'none',
        borderWidth: '1px',
        backgroundPattern: 'none',
        cardStyle: 'elevated',
        coverLayout: 'classic',
        headingStyle: 'underline',
        iconStyle: 'filled',
        contentDensity: 'normal',
        coverOverlay: 'gradient',
        logoPosition: 'top-right',
        logoSize: 'medium',
        tableStyle: 'clean',
        dateFormat: 'long',
        footerStyle: 'simple',
        cardHoverEffect: 'none',
        coverOverlayOpacity: 70,
        coverTextAlign: 'center',
        showCreationDate: true,
        preparedForLabel: 'Preparado para',
      },
      whatsappAgents: [{ name: 'Victoria', phone: '5491123456789' }],
      agencyName: '',
      footerText: '',
      sectionsToggles: {
        flights: true, lodging: true, transfers: true, insurance: true, itinerary: true,
      },
    };
    setEditingTemplate(newTemplate);
    setIsDialogOpen(true);
  };

  const handleEdit = (template: Template) => {
    // Ensure new fields have defaults
    const t = {
      ...template,
      colors: { ...template.colors, text: template.colors.text || template.colors.primary },
      styles: {
        ...template.styles,
        coverLayout: template.styles.coverLayout || 'classic',
        headingStyle: template.styles.headingStyle || 'underline',
        iconStyle: template.styles.iconStyle || 'filled',
        contentDensity: template.styles.contentDensity || 'normal',
        coverOverlay: template.styles.coverOverlay || 'gradient',
        logoPosition: template.styles.logoPosition || 'top-right',
        logoSize: template.styles.logoSize || 'medium',
        tableStyle: template.styles.tableStyle || 'clean',
        dateFormat: template.styles.dateFormat || 'long',
        footerStyle: template.styles.footerStyle || 'simple',
        cardHoverEffect: template.styles.cardHoverEffect || 'none',
        coverOverlayOpacity: template.styles.coverOverlayOpacity ?? 70,
        coverTextAlign: template.styles.coverTextAlign || 'center',
        showCreationDate: template.styles.showCreationDate !== false,
        preparedForLabel: template.styles.preparedForLabel || 'Preparado para',
      },
    };
    setEditingTemplate(t);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (template: Template) => {
    addTemplate({ ...template, id: crypto.randomUUID(), name: `${template.name} (copia)` });
  };

  const handleDelete = (id: string) => {
    if (id === 'default') { alert('No se puede eliminar la plantilla predeterminada'); return; }
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) deleteTemplate(id);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    const exists = templates.find(t => t.id === editingTemplate.id);
    if (exists) updateTemplate(editingTemplate);
    else addTemplate(editingTemplate);
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const u = (updates: Partial<Template>) => {
    if (!editingTemplate) return;
    setEditingTemplate({ ...editingTemplate, ...updates });
  };

  const uStyles = (updates: Partial<Template['styles']>) => {
    if (!editingTemplate) return;
    u({ styles: { ...editingTemplate.styles, ...updates } });
  };

  const uColors = (updates: Partial<Template['colors']>) => {
    if (!editingTemplate) return;
    u({ colors: { ...editingTemplate.colors, ...updates } });
  };

  const addWhatsAppAgent = () => {
    if (!editingTemplate) return;
    u({ whatsappAgents: [...editingTemplate.whatsappAgents, { name: '', phone: '' }] });
  };

  const updateWhatsAppAgent = (index: number, updates: Partial<WhatsAppAgent>) => {
    if (!editingTemplate) return;
    const agents = [...editingTemplate.whatsappAgents];
    agents[index] = { ...agents[index], ...updates };
    u({ whatsappAgents: agents });
  };

  const removeWhatsAppAgent = (index: number) => {
    if (!editingTemplate) return;
    u({ whatsappAgents: editingTemplate.whatsappAgents.filter((_, i) => i !== index) });
  };

  // Reusable color picker
  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-8 cursor-pointer rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-8 text-xs" />
      </div>
    </div>
  );

  // Reusable select
  const StyleSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Plantillas</h1>
            <p className="mt-1 text-muted-foreground">Personaliza el diseño de tus presupuestos</p>
          </div>
          <Button onClick={handleCreate} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" /> Nueva Plantilla
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group overflow-hidden">
              <CardHeader className="relative pb-2">
                <div className="mb-3 flex gap-2">
                  {[template.colors.primary, template.colors.secondary, template.colors.accent].map((c, i) => (
                    <div key={i} className="h-8 w-8 rounded-full border" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <CardTitle className="flex items-center gap-2 font-serif text-lg">
                  {template.name}
                  {defaultTemplateId === template.id && (
                    <span className="flex items-center gap-1 rounded-full bg-gold/20 px-2 py-0.5 text-xs text-gold-dark">
                      <Star className="h-3 w-3 fill-current" /> Predeterminada
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 space-y-2 text-sm text-muted-foreground">
                  <p>Tipografía: {template.fonts.heading}</p>
                  <p>Agentes WhatsApp: {template.whatsappAgents.length}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}><Pencil className="mr-1 h-4 w-4" /> Editar</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template)}><Copy className="mr-1 h-4 w-4" /> Duplicar</Button>
                  {defaultTemplateId !== template.id && (
                    <Button variant="ghost" size="sm" onClick={() => setDefaultTemplate(template.id)} className="text-gold-dark"><Star className="mr-1 h-4 w-4" /> Predeterminar</Button>
                  )}
                  {template.id !== 'default' && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" /></Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Full-width Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[95vh] max-w-7xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-4 pb-2 border-b">
            <DialogTitle className="font-serif">
              {editingTemplate && templates.find(t => t.id === editingTemplate.id) ? 'Editar Plantilla' : 'Nueva Plantilla'}
            </DialogTitle>
          </DialogHeader>

          {editingTemplate && (
            <div className="flex h-[calc(95vh-120px)]">
              {/* Left: Controls */}
              <div className="w-[55%] overflow-y-auto border-r p-4 space-y-1">
                <Accordion type="multiple" defaultValue={['general', 'cover', 'typography', 'colors', 'cards', 'headings', 'tables', 'separators', 'sections', 'whatsapp', 'footer']} className="space-y-1">
                  
                  {/* General */}
                  <AccordionItem value="general">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Settings className="h-4 w-4" /> General</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div>
                        <Label>Nombre de la plantilla</Label>
                        <Input value={editingTemplate.name} onChange={(e) => u({ name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Nombre de la agencia</Label>
                        <Input value={editingTemplate.agencyName || ''} onChange={(e) => u({ agencyName: e.target.value })} placeholder="Ej: Mi Agencia de Viajes" />
                      </div>
                      <ImageUpload label="Logo de la agencia" value={editingTemplate.logoUrl} onChange={(v) => u({ logoUrl: v })} placeholder="https://ejemplo.com/logo.png" previewClassName="h-20" />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Cover */}
                  <AccordionItem value="cover">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Image className="h-4 w-4" /> Portada</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <StyleSelect label="Layout de portada" value={editingTemplate.styles.coverLayout || 'classic'} onChange={(v) => uStyles({ coverLayout: v as any })} options={[
                        { value: 'classic', label: 'Clásico — Imagen con overlay' },
                        { value: 'split', label: 'Dividido — Mitad texto, mitad imagen' },
                        { value: 'fullOverlay', label: 'Overlay completo — Imagen oscurecida' },
                        { value: 'minimal', label: 'Minimal — Solo colores, sin imagen' },
                      ]} />
                      <StyleSelect label="Estilo del overlay" value={editingTemplate.styles.coverOverlay || 'gradient'} onChange={(v) => uStyles({ coverOverlay: v as any })} options={[
                        { value: 'gradient', label: 'Degradado vertical' },
                        { value: 'solid', label: 'Color sólido' },
                        { value: 'blur', label: 'Desenfoque (blur)' },
                        { value: 'vignette', label: 'Viñeta (bordes oscuros)' },
                        { value: 'none', label: 'Sin overlay' },
                      ]} />
                      <div>
                        <Label className="text-xs text-muted-foreground">Opacidad del overlay ({editingTemplate.styles.coverOverlayOpacity ?? 70}%)</Label>
                        <Slider value={[editingTemplate.styles.coverOverlayOpacity ?? 70]} onValueChange={([v]) => uStyles({ coverOverlayOpacity: v })} min={0} max={100} step={5} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Alineación del texto</Label>
                        <div className="flex gap-2 mt-1">
                          {[
                            { v: 'left', Icon: AlignLeft },
                            { v: 'center', Icon: AlignCenter },
                            { v: 'right', Icon: AlignRight },
                          ].map(({ v, Icon }) => (
                            <Button key={v} variant={editingTemplate.styles.coverTextAlign === v ? 'default' : 'outline'} size="sm" onClick={() => uStyles({ coverTextAlign: v as any })}>
                              <Icon className="h-4 w-4" />
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <StyleSelect label="Posición del logo" value={editingTemplate.styles.logoPosition || 'top-right'} onChange={(v) => uStyles({ logoPosition: v as any })} options={[
                          { value: 'top-right', label: 'Arriba derecha' },
                          { value: 'top-left', label: 'Arriba izquierda' },
                          { value: 'top-center', label: 'Arriba centro' },
                          { value: 'bottom-center', label: 'Abajo centro' },
                        ]} />
                        <StyleSelect label="Tamaño del logo" value={editingTemplate.styles.logoSize || 'medium'} onChange={(v) => uStyles({ logoSize: v as any })} options={[
                          { value: 'small', label: 'Chico (60px)' },
                          { value: 'medium', label: 'Mediano (100px)' },
                          { value: 'large', label: 'Grande (150px)' },
                        ]} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Mostrar fecha de armado</Label>
                        <Switch checked={editingTemplate.styles.showCreationDate !== false} onCheckedChange={(v) => uStyles({ showCreationDate: v })} />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Texto "Preparado para"</Label>
                        <Input value={editingTemplate.styles.preparedForLabel || 'Preparado para'} onChange={(e) => uStyles({ preparedForLabel: e.target.value })} placeholder="Preparado para" className="h-8 text-sm" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Typography */}
                  <AccordionItem value="typography">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Type className="h-4 w-4" /> Tipografía</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <FontSelect label="Fuente de títulos" value={editingTemplate.fonts.heading} onChange={(v) => u({ fonts: { ...editingTemplate.fonts, heading: v } })} type="heading" />
                      <FontSelect label="Fuente de texto" value={editingTemplate.fonts.body} onChange={(v) => u({ fonts: { ...editingTemplate.fonts, body: v } })} type="body" />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Colors */}
                  <AccordionItem value="colors">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Palette className="h-4 w-4" /> Colores</div></AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="grid grid-cols-3 gap-3">
                        <ColorPicker label="Primario" value={editingTemplate.colors.primary} onChange={(v) => uColors({ primary: v })} />
                        <ColorPicker label="Secundario" value={editingTemplate.colors.secondary} onChange={(v) => uColors({ secondary: v })} />
                        <ColorPicker label="Acento" value={editingTemplate.colors.accent} onChange={(v) => uColors({ accent: v })} />
                        <ColorPicker label="Fondo" value={editingTemplate.colors.background || '#ffffff'} onChange={(v) => uColors({ background: v })} />
                        <ColorPicker label="Fondo Cards" value={editingTemplate.colors.cardBackground || '#f8f9fa'} onChange={(v) => uColors({ cardBackground: v })} />
                        <ColorPicker label="Texto" value={editingTemplate.colors.text || editingTemplate.colors.primary} onChange={(v) => uColors({ text: v })} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Cards & Content */}
                  <AccordionItem value="cards">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Layers className="h-4 w-4" /> Cards y Contenido</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <StyleSelect label="Tipo de card" value={editingTemplate.styles.cardStyle} onChange={(v) => uStyles({ cardStyle: v as any })} options={[
                          { value: 'flat', label: 'Plano' },
                          { value: 'elevated', label: 'Elevado (sombra)' },
                          { value: 'outlined', label: 'Con borde' },
                          { value: 'glass', label: 'Efecto cristal' },
                        ]} />
                        <StyleSelect label="Radio de bordes" value={editingTemplate.styles.borderRadius} onChange={(v) => uStyles({ borderRadius: v })} options={[
                          { value: '0px', label: 'Sin bordes redondeados' },
                          { value: '4px', label: 'Mínimo (4px)' },
                          { value: '8px', label: 'Pequeño (8px)' },
                          { value: '12px', label: 'Medio (12px)' },
                          { value: '16px', label: 'Grande (16px)' },
                          { value: '9999px', label: 'Completamente redondeado' },
                        ]} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Sombra en cards</Label>
                        <Switch checked={editingTemplate.styles.cardShadow} onCheckedChange={(v) => uStyles({ cardShadow: v })} />
                      </div>
                      <StyleSelect label="Densidad del contenido" value={editingTemplate.styles.contentDensity || 'normal'} onChange={(v) => uStyles({ contentDensity: v as any })} options={[
                        { value: 'compact', label: 'Compacto — Menos espacio, texto más chico' },
                        { value: 'normal', label: 'Normal — Balance estándar' },
                        { value: 'spacious', label: 'Espacioso — Más aire, texto más grande' },
                      ]} />
                      <StyleSelect label="Efecto hover en cards (web)" value={editingTemplate.styles.cardHoverEffect || 'none'} onChange={(v) => uStyles({ cardHoverEffect: v as any })} options={[
                        { value: 'none', label: 'Sin efecto' },
                        { value: 'lift', label: 'Elevación (lift)' },
                        { value: 'glow', label: 'Resplandor (glow)' },
                        { value: 'border-accent', label: 'Borde de acento' },
                      ]} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Headings & Icons */}
                  <AccordionItem value="headings">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Type className="h-4 w-4" /> Encabezados e Iconos</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <StyleSelect label="Estilo de encabezados" value={editingTemplate.styles.headingStyle || 'underline'} onChange={(v) => uStyles({ headingStyle: v as any })} options={[
                        { value: 'underline', label: 'Línea debajo' },
                        { value: 'background', label: 'Fondo de color' },
                        { value: 'accent-left', label: 'Barra lateral izquierda' },
                        { value: 'pill', label: 'Pastilla redondeada' },
                      ]} />
                      <StyleSelect label="Estilo de iconos" value={editingTemplate.styles.iconStyle || 'filled'} onChange={(v) => uStyles({ iconStyle: v as any })} options={[
                        { value: 'filled', label: 'Relleno con fondo' },
                        { value: 'outlined', label: 'Solo contorno' },
                        { value: 'none', label: 'Sin iconos' },
                      ]} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Tables */}
                  <AccordionItem value="tables">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Layout className="h-4 w-4" /> Tablas y Fechas</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <StyleSelect label="Estilo de tablas" value={editingTemplate.styles.tableStyle || 'clean'} onChange={(v) => uStyles({ tableStyle: v as any })} options={[
                        { value: 'clean', label: 'Limpio — Sin fondos alternados' },
                        { value: 'striped', label: 'Rayado — Filas alternadas' },
                        { value: 'bordered', label: 'Con bordes — Celdas visibles' },
                        { value: 'minimal', label: 'Minimal — Solo líneas finas' },
                      ]} />
                      <StyleSelect label="Formato de fechas" value={editingTemplate.styles.dateFormat || 'long'} onChange={(v) => uStyles({ dateFormat: v as any })} options={[
                        { value: 'long', label: 'Largo — 3 de Marzo, 2026' },
                        { value: 'medium', label: 'Medio — 3 Mar 2026' },
                        { value: 'short', label: 'Corto — 03/03/2026' },
                      ]} />
                    </AccordionContent>
                  </AccordionItem>

                  {/* Separators & Borders */}
                  <AccordionItem value="separators">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Minus className="h-4 w-4" /> Separadores, Bordes y Fondo</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <StyleSelect label="Separadores" value={editingTemplate.styles.separatorStyle} onChange={(v) => uStyles({ separatorStyle: v as any })} options={[
                          { value: 'none', label: 'Sin separador' },
                          { value: 'line', label: 'Línea simple' },
                          { value: 'dots', label: 'Puntos' },
                          { value: 'gradient', label: 'Degradado' },
                          { value: 'decorative', label: 'Decorativo' },
                        ]} />
                        <StyleSelect label="Patrón de fondo" value={editingTemplate.styles.backgroundPattern} onChange={(v) => uStyles({ backgroundPattern: v as any })} options={[
                          { value: 'none', label: 'Sin patrón' },
                          { value: 'dots', label: 'Puntos' },
                          { value: 'lines', label: 'Líneas diagonales' },
                          { value: 'grid', label: 'Cuadrícula' },
                          { value: 'waves', label: 'Ondas' },
                        ]} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <StyleSelect label="Estilo de borde" value={editingTemplate.styles.borderStyle} onChange={(v) => uStyles({ borderStyle: v as any })} options={[
                          { value: 'none', label: 'Sin borde' },
                          { value: 'solid', label: 'Sólido' },
                          { value: 'dashed', label: 'Punteado' },
                          { value: 'double', label: 'Doble' },
                          { value: 'decorative', label: 'Decorativo' },
                        ]} />
                        <StyleSelect label="Grosor de borde" value={editingTemplate.styles.borderWidth} onChange={(v) => uStyles({ borderWidth: v })} options={[
                          { value: '1px', label: 'Fino (1px)' },
                          { value: '2px', label: 'Medio (2px)' },
                          { value: '3px', label: 'Grueso (3px)' },
                          { value: '4px', label: 'Extra grueso (4px)' },
                        ]} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Footer */}
                  <AccordionItem value="footer">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Layout className="h-4 w-4" /> Pie de Página</div></AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <StyleSelect label="Estilo del footer" value={editingTemplate.styles.footerStyle || 'simple'} onChange={(v) => uStyles({ footerStyle: v as any })} options={[
                        { value: 'simple', label: 'Simple — Banner con info' },
                        { value: 'banner', label: 'Banner — Fondo con contacto' },
                        { value: 'centered', label: 'Centrado — Con separador' },
                        { value: 'minimal', label: 'Minimal — Solo texto' },
                      ]} />
                      <div>
                        <Label className="text-xs">Texto del pie de página</Label>
                        <Input value={editingTemplate.footerText} onChange={(e) => u({ footerText: e.target.value })} placeholder="Vicka Turismo | Tel: ..." className="h-8 text-sm" />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Sections */}
                  <AccordionItem value="sections">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><Eye className="h-4 w-4" /> Secciones Visibles</div></AccordionTrigger>
                    <AccordionContent className="pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(editingTemplate.sectionsToggles).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <Label className="capitalize text-xs">{key}</Label>
                            <Switch checked={value} onCheckedChange={(checked) => u({ sectionsToggles: { ...editingTemplate.sectionsToggles, [key]: checked } })} />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* WhatsApp */}
                  <AccordionItem value="whatsapp">
                    <AccordionTrigger className="text-sm font-semibold"><div className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Agentes WhatsApp</div></AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      {editingTemplate.whatsappAgents.map((agent, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input value={agent.name} onChange={(e) => updateWhatsAppAgent(index, { name: e.target.value })} placeholder="Nombre" className="flex-1 h-8 text-sm" />
                          <Input value={agent.phone} onChange={(e) => updateWhatsAppAgent(index, { phone: e.target.value })} placeholder="5491123456789" className="flex-1 h-8 text-sm" />
                          <Button variant="ghost" size="icon" onClick={() => removeWhatsAppAgent(index)} className="text-destructive h-8 w-8"><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" onClick={addWhatsAppAgent} className="w-full h-8 text-sm"><Plus className="mr-2 h-3 w-3" /> Agregar agente</Button>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </div>

              {/* Right: Live Preview */}
              <div className="w-[45%] overflow-y-auto p-4 bg-muted/30">
                <TemplatePreviewPanel template={editingTemplate} />
              </div>
            </div>
          )}

          <DialogFooter className="px-6 py-3 border-t">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}><X className="mr-2 h-4 w-4" /> Cancelar</Button>
            <Button onClick={handleSave} className="bg-primary"><Save className="mr-2 h-4 w-4" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Templates;
