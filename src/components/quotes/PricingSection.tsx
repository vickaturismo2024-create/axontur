import { Quote, Pricing } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator,
  TrendingUp,
  Plane,
  Building2,
  Car,
  Shield,
  Train,
  Ship,
  Anchor,
  Compass,
  Edit3
} from 'lucide-react';
import { usePricingCalculator, applyCalculatedPricing } from '@/hooks/usePricingCalculator';

interface PricingSectionProps {
  quote: Quote;
  onUpdatePricing: (pricing: Partial<Pricing>) => void;
}

export function PricingSection({ quote, onUpdatePricing }: PricingSectionProps) {
  const calculation = usePricingCalculator(quote);
  const isAutomatic = quote.pricing.calculationMode === 'automatic';
  const hasLodgingOptions = calculation.lodgingOptionsPricing.length > 0;

  const handleCalculateAutomatic = () => {
    const calculatedPricing = applyCalculatedPricing(
      quote.pricing,
      calculation,
      quote.trip.travelers
    );
    onUpdatePricing(calculatedPricing);
  };

  const handleSetManual = () => {
    onUpdatePricing({ calculationMode: 'manual' });
  };

  const formatCurrency = (value: number) => {
    return `${quote.trip.currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  // Get all lodgings to check for options
  const allLodgings = (quote.lodgings && quote.lodgings.length > 0)
    ? quote.lodgings
    : (quote.lodging?.name ? [quote.lodging] : []);
  const optionLodgings = allLodgings.filter(l => l.isOption);

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex items-center gap-4">
        <Label className="text-base font-semibold">Modo de carga:</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isAutomatic ? 'default' : 'outline'}
            size="sm"
            onClick={handleSetManual}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Manual
          </Button>
          <Button
            type="button"
            variant={isAutomatic ? 'default' : 'outline'}
            size="sm"
            onClick={handleCalculateAutomatic}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Automático
          </Button>
        </div>
      </div>

      {/* Automatic Mode */}
      {isAutomatic && (
        <div className="space-y-4">
          {/* Fixed Services Breakdown */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="h-4 w-4 text-gold" />
                Desglose de Servicios Fijos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="py-2 text-left font-medium">Servicio</th>
                      <th className="py-2 text-right font-medium text-muted-foreground">Costo</th>
                      <th className="py-2 text-right font-medium">Precio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculation.breakdown.flights.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Plane className="h-4 w-4 text-muted-foreground" />
                          Vuelos
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.flights.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.flights.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.transfers.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          Transfers
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.transfers.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.transfers.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.trains.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Train className="h-4 w-4 text-muted-foreground" />
                          Trenes
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.trains.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.trains.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.ferries.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Ship className="h-4 w-4 text-muted-foreground" />
                          Ferries
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.ferries.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.ferries.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.rentalCars.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          Alquiler de autos
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.rentalCars.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.rentalCars.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.activities.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Compass className="h-4 w-4 text-muted-foreground" />
                          Actividades
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.activities.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.activities.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.cruise.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Anchor className="h-4 w-4 text-muted-foreground" />
                          Crucero
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.cruise.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.cruise.price)}
                        </td>
                      </tr>
                    )}
                    {calculation.breakdown.insurance.price > 0 && (
                      <tr>
                        <td className="flex items-center gap-2 py-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          Asistencia
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {formatCurrency(calculation.breakdown.insurance.cost)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(calculation.breakdown.insurance.price)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr className="font-semibold">
                      <td className="py-2">SUBTOTAL FIJO</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {formatCurrency(calculation.fixedServices.cost)}
                      </td>
                      <td className="py-2 text-right">
                        {formatCurrency(calculation.fixedServices.price)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Lodging Options Pricing */}
          {hasLodgingOptions ? (
            <Card className="border-gold/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4 text-gold" />
                  Opciones de Alojamiento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculation.lodgingOptionsPricing.map((option, index) => (
                  <div 
                    key={option.lodgingId}
                    className="rounded-lg border border-dashed border-gold/40 bg-gold/5 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="outline" className="bg-gold/10 text-gold-dark">
                        🏷️ {option.lodgingLabel}
                      </Badge>
                      <div className="text-right text-sm">
                        <span className="text-muted-foreground">Alojamiento: </span>
                        <span className="font-medium">{formatCurrency(option.lodgingPrice)}</span>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-lg bg-primary/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground">TOTAL</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(option.totalPrice)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted p-3 text-center">
                        <p className="text-xs text-muted-foreground">Por persona</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(option.pricePerPerson)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">Costo total</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(option.totalCost)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-3 text-center dark:bg-green-900/20">
                        <p className="text-xs text-muted-foreground">Margen</p>
                        <p className="flex items-center justify-center gap-1 text-sm font-semibold text-green-700 dark:text-green-400">
                          <TrendingUp className="h-3 w-3" />
                          {option.marginPercentage.toFixed(1)}%
                          <span className="text-xs font-normal">
                            ({formatCurrency(option.margin)})
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : calculation.singleLodgingPricing && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Resumen y Margen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-primary/10 p-4 text-center">
                    <p className="text-xs text-muted-foreground">TOTAL</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(calculation.singleLodgingPricing.totalPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted p-4 text-center">
                    <p className="text-xs text-muted-foreground">Por persona</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(calculation.singleLodgingPricing.pricePerPerson)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <p className="text-xs text-muted-foreground">Costo total</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(calculation.singleLodgingPricing.totalCost)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                    <p className="text-xs text-muted-foreground">Margen</p>
                    <p className="flex items-center justify-center gap-1 font-semibold text-green-700 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      {calculation.singleLodgingPricing.marginPercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-green-600">
                      ({formatCurrency(calculation.singleLodgingPricing.margin)})
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleCalculateAutomatic}
            className="w-full"
          >
            <Calculator className="mr-2 h-4 w-4" />
            Recalcular precios
          </Button>
        </div>
      )}

      {/* Manual Mode / Common fields */}
      <div className="grid gap-4 md:grid-cols-2">
        {!isAutomatic && (
          <>
            <div>
              <Label>Precio total</Label>
              <Input
                type="number"
                min={0}
                value={quote.pricing.totalPrice || ''}
                onChange={(e) => onUpdatePricing({ totalPrice: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Precio por persona</Label>
              <Input
                type="number"
                min={0}
                value={quote.pricing.pricePerPerson || ''}
                onChange={(e) => onUpdatePricing({ pricePerPerson: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Manual lodging options pricing */}
            {optionLodgings.length > 0 && (
              <div className="md:col-span-2">
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Precios por opción de alojamiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {optionLodgings.map((lodging, index) => (
                      <div key={lodging.id || index} className="grid grid-cols-3 gap-2">
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-xs">
                            {lodging.optionLabel || `Opción ${index + 1}`}
                          </Badge>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Total"
                            value={
                              quote.pricing.lodgingOptions?.find(o => o.lodgingId === lodging.id)?.totalPrice || ''
                            }
                            onChange={(e) => {
                              const totalPrice = parseFloat(e.target.value) || 0;
                              const pricePerPerson = quote.trip.travelers > 0 ? totalPrice / quote.trip.travelers : 0;
                              const currentOptions = quote.pricing.lodgingOptions || [];
                              const existingIndex = currentOptions.findIndex(o => o.lodgingId === lodging.id);
                              const newOption = {
                                lodgingId: lodging.id || `option-${index}`,
                                lodgingLabel: lodging.optionLabel || `Opción ${index + 1}`,
                                lodgingCost: 0,
                                lodgingPrice: 0,
                                totalPrice,
                                totalCost: 0,
                                pricePerPerson,
                                margin: 0,
                                marginPercentage: 0,
                              };
                              const newOptions = existingIndex >= 0
                                ? currentOptions.map((o, i) => i === existingIndex ? newOption : o)
                                : [...currentOptions, newOption];
                              onUpdatePricing({ lodgingOptions: newOptions });
                            }}
                          />
                        </div>
                        <div>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Por persona"
                            value={
                              quote.pricing.lodgingOptions?.find(o => o.lodgingId === lodging.id)?.pricePerPerson || ''
                            }
                            onChange={(e) => {
                              const pricePerPerson = parseFloat(e.target.value) || 0;
                              const currentOptions = quote.pricing.lodgingOptions || [];
                              const existingIndex = currentOptions.findIndex(o => o.lodgingId === lodging.id);
                              if (existingIndex >= 0) {
                                const updatedOptions = currentOptions.map((o, i) => 
                                  i === existingIndex ? { ...o, pricePerPerson } : o
                                );
                                onUpdatePricing({ lodgingOptions: updatedOptions });
                              }
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
        
        <div>
          <Label>Impuestos</Label>
          <Input
            type="number"
            min={0}
            value={quote.pricing.taxes || ''}
            onChange={(e) => onUpdatePricing({ taxes: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Forma de pago</Label>
          <Input
            value={quote.pricing.paymentMethod || ''}
            onChange={(e) => onUpdatePricing({ paymentMethod: e.target.value })}
            placeholder="Transferencia bancaria o tarjeta de crédito"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Condiciones</Label>
          <Textarea
            value={quote.pricing.conditions || ''}
            onChange={(e) => onUpdatePricing({ conditions: e.target.value })}
            placeholder="Seña del 30% al confirmar..."
            rows={2}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Observaciones</Label>
          <Textarea
            value={quote.pricing.observations || ''}
            onChange={(e) => onUpdatePricing({ observations: e.target.value })}
            placeholder="Precio sujeto a disponibilidad..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}
