import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { Receipt } from './types';
import { computeReceiptTotals, formatMoney } from '@/lib/receiptTotals';

interface ReceiptDetailDialogProps {
  receipt: Receipt | null;
  items: any[];
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  getMethodLabel: (v: string) => string;
}

export function ReceiptDetailDialog({ receipt, items, loading, onOpenChange, getMethodLabel }: ReceiptDetailDialogProps) {
  return (
    <Dialog open={!!receipt} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {receipt && `Recibo REC-${String(receipt.receipt_number).padStart(4, '0')}`}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalle del recibo</DialogDescription>
        </DialogHeader>
        {receipt && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente</span>
                <p className="font-medium">{receipt.client_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha</span>
                <p className="font-medium">{new Date(receipt.payment_date).toLocaleDateString('es-AR')}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Concepto</span>
                <p className="font-medium">{receipt.concept}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Líneas de pago</h4>
              {loading ? (
                <p className="py-4 text-center text-muted-foreground text-sm">Cargando...</p>
              ) : items.length === 0 ? (
                <p className="py-4 text-center text-muted-foreground text-sm">Sin líneas registradas.</p>
              ) : (
                <TooltipProvider>
                  <div className="space-y-2">
                    {items.map((it) => {
                      const hasFx =
                        it.exchange_rate &&
                        it.service_currency &&
                        it.service_currency !== it.currency;
                      return (
                        <div
                          key={it.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">
                                {it.currency} {Number(it.amount).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {getMethodLabel(it.payment_method || 'other')}
                              </Badge>
                              {hasFx && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-1 text-xs text-primary cursor-help">
                                      <Info className="h-3.5 w-3.5" />
                                      TC {Number(it.exchange_rate).toFixed(2)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-xs">
                                      <strong>TC aplicado:</strong> 1 {it.service_currency} ={' '}
                                      {Number(it.exchange_rate).toLocaleString('es-AR')} {it.currency}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Fecha: {new Date(receipt.payment_date).toLocaleDateString('es-AR')} · Manual
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {it.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{it.notes}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}
            </div>

            {(() => {
              const detailTotals = computeReceiptTotals(items as any, receipt.currency);
              const subtotalEntries = Object.entries(detailTotals.subtotalsByCurrency);
              const showBreakdown = detailTotals.isMultiCurrency && subtotalEntries.length > 0;
              return (
                <div className="border-t pt-3 space-y-2">
                  {showBreakdown && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Subtotales</p>
                      {subtotalEntries.map(([cur, amt]) => (
                        <div key={cur} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{cur}</span>
                          <span className="font-medium">{formatMoney(cur, amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {detailTotals.unconvertibleLines.length > 0 && (
                    <p className="text-xs text-amber-600">
                      Hay líneas en otra moneda sin TC cargado: no se incluyen en el total convertido.
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total recibo</span>
                    <span className="font-bold text-lg">
                      {formatMoney(receipt.currency, detailTotals.convertedTotal)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
