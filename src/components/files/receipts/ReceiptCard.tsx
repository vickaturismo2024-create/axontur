import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Download, Mail, MoreVertical, Ban, Eye, Trash2 } from 'lucide-react';
import { Receipt, STATUS_LABELS, STATUS_VARIANT } from './types';

interface ReceiptCardProps {
  receipt: Receipt;
  getMethodLabel: (v: string) => string;
  onOpenDetail: (r: Receipt) => void;
  onDownload: (r: Receipt) => void;
  onOpenEmail: (r: Receipt) => void;
  onChangeStatus: (id: string, status: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ReceiptCard({
  receipt: r,
  getMethodLabel,
  onOpenDetail,
  onDownload,
  onOpenEmail,
  onChangeStatus,
  onCancel,
  onDelete,
}: ReceiptCardProps) {
  const status = r.status || 'issued';
  const isCancelled = status === 'cancelled';

  return (
    <Card className={isCancelled ? 'opacity-60' : ''}>
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3">
        <div className="flex items-start gap-3 sm:contents">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-mono text-sm font-bold ${isCancelled ? 'line-through' : ''}`}>
                REC-{String(r.receipt_number).padStart(4, '0')}
              </span>
              <Badge variant={STATUS_VARIANT[status]} className="text-[10px] px-1.5 py-0">
                {STATUS_LABELS[status]}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(r.payment_date).toLocaleDateString('es-AR')}</span>
            </div>
            <p className={`truncate text-sm ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>{r.concept}</p>
            <p className="text-xs text-muted-foreground truncate">
              {r.client_name} · {getMethodLabel(r.payment_method)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 border-t sm:border-0 pt-2 sm:pt-0">
          <div className="text-right">
            <p className={`font-bold ${isCancelled ? 'line-through text-muted-foreground' : ''}`}>
              {r.currency} {r.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onOpenDetail(r)} title="Ver detalle">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDownload(r)} title="Descargar PDF">
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenEmail(r)}
              title="Enviar por email"
              disabled={isCancelled}
            >
              <Mail className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title="Más acciones">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCancelled && status !== 'draft' && (
                  <DropdownMenuItem onClick={() => onChangeStatus(r.id, 'draft')}>
                    Marcar como Borrador
                  </DropdownMenuItem>
                )}
                {!isCancelled && status !== 'issued' && (
                  <DropdownMenuItem onClick={() => onChangeStatus(r.id, 'issued')}>
                    Marcar como Emitido
                  </DropdownMenuItem>
                )}
                {!isCancelled && status !== 'paid' && (
                  <DropdownMenuItem onClick={() => onChangeStatus(r.id, 'paid')}>
                    Marcar como Pagado
                  </DropdownMenuItem>
                )}
                {!isCancelled && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onCancel(r.id)} className="text-destructive">
                      <Ban className="mr-2 h-4 w-4" />Anular recibo
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(r.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
