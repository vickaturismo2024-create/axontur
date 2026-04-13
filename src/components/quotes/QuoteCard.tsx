import { useState } from 'react';
import { Quote, QuoteStatus } from '@/types/quote';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MapPin, Calendar, Users, Copy, Pencil, FileDown, Trash2, Eye, Send, CheckCircle,
  Archive, Star, ArchiveRestore, UserPlus, FolderOpen, XCircle, RotateCcw
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { TagSelect } from './TagSelect';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { createFileFromQuote } from '@/lib/fileFromQuote';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface QuoteTag {
  id: string;
  name: string;
  color: string;
}

interface QuoteCardProps {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (quote: Quote) => void;
  onExport: (quote: Quote) => void;
  onStatusChange?: (id: string, status: QuoteStatus) => void;
  onToggleArchive?: (quote: Quote) => void;
  onToggleFavorite?: (quote: Quote) => void;
  onDuplicateForClient?: (id: string) => void;
  compareMode?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: (id: string) => void;
  assignedTags?: QuoteTag[];
  allTags?: QuoteTag[];
  onTagsChanged?: () => void;
}

const STATUS_CONFIG: Record<QuoteStatus, { label: string; className: string }> = {
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  approved: { label: 'Aprobado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  expired: { label: 'Vencido', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export function QuoteCard({ quote, onEdit, onDuplicate, onDelete, onPreview, onExport, onStatusChange, onToggleArchive, onToggleFavorite, onDuplicateForClient, compareMode, isSelectedForCompare, onToggleCompare, assignedTags, allTags, onTagsChanged }: QuoteCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [creatingFile, setCreatingFile] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = dateString.includes('T') ? new Date(dateString) : parseISO(dateString);
      return format(date, 'd MMM yyyy', { locale: es });
    } catch { return dateString; }
  };

  const status = quote.status || 'draft';
  const statusConfig = STATUS_CONFIG[status];

  const nextStatus: QuoteStatus | null = status === 'draft' ? 'sent' : status === 'sent' ? 'approved' : null;

  const handleCancel = () => {
    if (onStatusChange) onStatusChange(quote.id, 'cancelled');
    setCancelOpen(false);
  };

  const handleReactivate = () => {
    if (onStatusChange) onStatusChange(quote.id, 'draft');
  };

  const handleCreateFile = async () => {
    if (!user) return;
    setCreatingFile(true);
    const result = await createFileFromQuote(quote, user.id);
    if (result) {
      toast.success(`Expediente FILE-${String(result.fileNumber).padStart(3, '0')} creado`);
      navigate(`/files/${result.fileId}`);
    } else {
      toast.error('Error al crear expediente');
    }
    setCreatingFile(false);
  };

  return (
    <>
      <Card
        className={`group overflow-hidden transition-all duration-300 hover:shadow-premium ${compareMode ? 'cursor-pointer' : ''} ${isSelectedForCompare ? 'ring-2 ring-primary' : ''}`}
        onClick={compareMode && onToggleCompare ? () => onToggleCompare(quote.id) : undefined}
      >
        <CardHeader className="relative bg-gradient-to-br from-primary/5 to-secondary/30 pb-4">
          {compareMode && (
            <div className="absolute top-3 right-3 z-10">
              <Checkbox checked={isSelectedForCompare} className="h-5 w-5" />
            </div>
          )}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                {quote.approvedAt && status !== 'cancelled' && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    ✅ Aprobado por {quote.approvedByName}
                  </Badge>
                )}
                {(quote as any).viewCount > 0 && (
                  <Badge variant="outline" className="text-xs">
                    👁 {(quote as any).viewCount} vista{(quote as any).viewCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {assignedTags && assignedTags.length > 0 && assignedTags.map(tag => (
                  <Badge key={tag.id} className="text-[10px] px-1.5 py-0 text-white" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </Badge>
                ))}
              </div>
              <p className="text-sm font-medium text-muted-foreground">{quote.client.name}</p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-foreground">{quote.trip.destination}</h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="bg-gold/20 text-gold-dark">
                {quote.trip.currency} {quote.pricing.totalPrice.toLocaleString()}
              </Badge>
              {quote.pricing.marginPercentage !== undefined && quote.pricing.marginPercentage > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  📈 {quote.pricing.marginPercentage.toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(quote.trip.startDate)} - {formatDate(quote.trip.endDate)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{quote.trip.travelers} pasajero{quote.trip.travelers > 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => onPreview(quote)} className="text-muted-foreground hover:text-foreground">
              <Eye className="mr-1.5 h-4 w-4" />Ver
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(quote)} className="text-muted-foreground hover:text-foreground">
              <Pencil className="mr-1.5 h-4 w-4" />Editar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDuplicate(quote.id)} className="text-muted-foreground hover:text-foreground">
              <Copy className="mr-1.5 h-4 w-4" />Duplicar
            </Button>
            {onDuplicateForClient && (
              <Button variant="ghost" size="sm" onClick={() => onDuplicateForClient(quote.id)} className="text-muted-foreground hover:text-foreground">
                <UserPlus className="mr-1.5 h-4 w-4" />Otro cliente
              </Button>
            )}
            {allTags && onTagsChanged && (
              <TagSelect quoteId={quote.id} assignedTags={assignedTags || []} allTags={allTags} onTagsChanged={onTagsChanged} />
            )}
            {nextStatus && onStatusChange && (
              <Button variant="ghost" size="sm" onClick={() => onStatusChange(quote.id, nextStatus)} className="text-muted-foreground hover:text-foreground">
                {nextStatus === 'sent' ? <Send className="mr-1.5 h-4 w-4" /> : <CheckCircle className="mr-1.5 h-4 w-4" />}
                {nextStatus === 'sent' ? 'Enviar' : 'Aprobar'}
              </Button>
            )}
            {/* Cancel button for approved quotes */}
            {status === 'approved' && onStatusChange && (
              <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)} className="text-destructive hover:bg-destructive/10">
                <XCircle className="mr-1.5 h-4 w-4" />Cancelar
              </Button>
            )}
            {/* Reactivate button for cancelled quotes */}
            {status === 'cancelled' && onStatusChange && (
              <Button variant="ghost" size="sm" onClick={handleReactivate} className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="mr-1.5 h-4 w-4" />Reactivar
              </Button>
            )}
            {/* Create file button for approved quotes */}
            {status === 'approved' && (
              <Button variant="ghost" size="sm" onClick={handleCreateFile} disabled={creatingFile} className="text-muted-foreground hover:text-foreground">
                <FolderOpen className="mr-1.5 h-4 w-4" />{creatingFile ? 'Creando...' : 'Expediente'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onExport(quote)} className="text-gold-dark hover:bg-gold/10 hover:text-gold-dark">
              <FileDown className="mr-1.5 h-4 w-4" />PDF
            </Button>
            {onToggleFavorite && (
              <Button variant="ghost" size="sm" onClick={() => onToggleFavorite(quote)} className={quote.favorited ? 'text-gold-dark' : 'text-muted-foreground'}>
                <Star className={`mr-1.5 h-4 w-4 ${quote.favorited ? 'fill-current' : ''}`} />
              </Button>
            )}
            {onToggleArchive && (
              <Button variant="ghost" size="sm" onClick={() => onToggleArchive(quote)} className="text-muted-foreground hover:text-foreground">
                {quote.archived ? <ArchiveRestore className="mr-1.5 h-4 w-4" /> : <Archive className="mr-1.5 h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(quote.id)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <Trash2 className="mr-1.5 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">Creado: {formatDate(quote.createdAt)}</p>
        </CardContent>
      </Card>

      {/* Cancel confirmation */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>El presupuesto pasará a estado "Cancelado". El expediente asociado (si existe) no se eliminará. Podés reactivarlo después.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar presupuesto</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
