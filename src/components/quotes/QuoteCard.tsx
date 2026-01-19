import { Quote } from '@/types/quote';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Copy, 
  Pencil, 
  FileDown, 
  Trash2,
  Eye 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface QuoteCardProps {
  quote: Quote;
  onEdit: (quote: Quote) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (quote: Quote) => void;
  onExport: (quote: Quote) => void;
}

export function QuoteCard({ 
  quote, 
  onEdit, 
  onDuplicate, 
  onDelete, 
  onPreview,
  onExport 
}: QuoteCardProps) {
  // Parse dates correctly - use parseISO for YYYY-MM-DD format to avoid timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      // For ISO datetime strings (createdAt), parse normally
      // For date-only strings (YYYY-MM-DD), use parseISO to avoid timezone offset
      const date = dateString.includes('T') ? new Date(dateString) : parseISO(dateString);
      return format(date, 'd MMM yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-premium">
      <CardHeader className="relative bg-gradient-to-br from-primary/5 to-secondary/30 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {quote.client.name}
            </p>
            <h3 className="mt-1 font-serif text-xl font-semibold text-foreground">
              {quote.trip.destination}
            </h3>
          </div>
          <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPreview(quote)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Eye className="mr-1.5 h-4 w-4" />
            Ver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(quote)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDuplicate(quote.id)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="mr-1.5 h-4 w-4" />
            Duplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExport(quote)}
            className="text-gold-dark hover:bg-gold/10 hover:text-gold-dark"
          >
            <FileDown className="mr-1.5 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(quote.id)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Creado: {formatDate(quote.createdAt)}
        </p>
      </CardContent>
    </Card>
  );
}
