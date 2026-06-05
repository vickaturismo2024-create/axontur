import { Lodging, RoomOccupancy } from '@/types/quote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Users, BedDouble, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createEmptyOccupancy, getGuestsPerRoomType, getOccupancyLabel } from '@/hooks/useOccupancyPricingCalculator';

interface OccupancyConfigProps {
  lodging: Lodging;
  totalTravelers: number;
  currency: string;
  onUpdate: (updates: Partial<Lodging>) => void;
}

export function OccupancyConfig({ lodging, totalTravelers, currency, onUpdate }: OccupancyConfigProps) {
  const occupancies = lodging.occupancies || [];
  const useOccupancies = lodging.useOccupancies ?? false;
  
  // Calcular total de pasajeros asignados
  const totalAssigned = occupancies.reduce((sum, o) => sum + (o.roomCount * o.guestsPerRoom), 0);
  const isValidAssignment = totalAssigned === totalTravelers;
  const remaining = totalTravelers - totalAssigned;

  const handleToggleOccupancies = (enabled: boolean) => {
    onUpdate({ 
      useOccupancies: enabled,
      occupancies: enabled && occupancies.length === 0 
        ? [createEmptyOccupancy('double')] 
        : occupancies
    });
  };

  const addOccupancy = (roomType: RoomOccupancy['roomType'] = 'double') => {
    const newOccupancy = createEmptyOccupancy(roomType);
    onUpdate({ occupancies: [...occupancies, newOccupancy] });
  };

  const updateOccupancy = (id: string, updates: Partial<RoomOccupancy>) => {
    // Si cambia el tipo, actualizar automáticamente los pasajeros por habitación
    if (updates.roomType && !updates.guestsPerRoom) {
      updates.guestsPerRoom = getGuestsPerRoomType(updates.roomType);
    }
    
    onUpdate({
      occupancies: occupancies.map(o => o.id === id ? { ...o, ...updates } : o)
    });
  };

  const removeOccupancy = (id: string) => {
    const newOccupancies = occupancies.filter(o => o.id !== id);
    onUpdate({ 
      occupancies: newOccupancies,
      useOccupancies: newOccupancies.length > 0
    });
  };

  // Helper para calcular subtotal de una ocupación
  const getOccupancySubtotal = (occupancy: RoomOccupancy) => {
    const nights = lodging.nights || 0;
    if (occupancy.pricingMode === 'total') {
      return {
        cost: occupancy.totalCost || 0,
        price: occupancy.totalPrice || 0,
      };
    }
    return {
      cost: (occupancy.costPerNight || 0) * nights * occupancy.roomCount,
      price: (occupancy.pricePerNight || 0) * nights * occupancy.roomCount,
    };
  };

  return (
    <div className="border-t pt-4 mt-4">
      {/* Toggle para activar sistema de ocupaciones */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BedDouble className="h-4 w-4 text-gold" />
          <Label htmlFor={`use-occupancies-${lodging.id}`} className="text-sm font-medium">
            Configurar ocupaciones diferenciadas
          </Label>
        </div>
        <Switch
          id={`use-occupancies-${lodging.id}`}
          checked={useOccupancies}
          onCheckedChange={handleToggleOccupancies}
        />
      </div>

      {useOccupancies && (
        <div className="space-y-4">
          {/* Info de pasajeros */}
          <div className={`flex items-center justify-between rounded-lg p-3 text-sm ${
            isValidAssignment 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
          }`}>
            <div className="flex items-center gap-2">
              {isValidAssignment ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>
                {isValidAssignment 
                  ? `${totalAssigned} pasajeros asignados correctamente`
                  : remaining > 0 
                    ? `Faltan asignar ${remaining} pasajero(s)`
                    : `Exceden ${Math.abs(remaining)} pasajero(s)`
                }
              </span>
            </div>
            <Badge variant="outline" className="bg-background">
              Total: {totalTravelers} pasajeros
            </Badge>
          </div>

          {/* Lista de ocupaciones */}
          <div className="space-y-3">
            {occupancies.map((occupancy, index) => {
              const guestCount = occupancy.roomCount * occupancy.guestsPerRoom;
              const subtotal = getOccupancySubtotal(occupancy);
              
              return (
                <Card key={occupancy.id} className="border-dashed border-accent/50">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-accent/20">
                          {getOccupancyLabel(occupancy)}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {guestCount} pax
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeOccupancy(occupancy.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-4">
                      {/* Tipo de habitación */}
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select
                          value={occupancy.roomType}
                          onValueChange={(value) => updateOccupancy(occupancy.id, { 
                            roomType: value as RoomOccupancy['roomType'] 
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single (1 pax)</SelectItem>
                            <SelectItem value="double">Doble (2 pax)</SelectItem>
                            <SelectItem value="triple">Triple (3 pax)</SelectItem>
                            <SelectItem value="quadruple">Cuádruple (4 pax)</SelectItem>
                            <SelectItem value="custom">Personalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Cantidad de habitaciones */}
                      <div>
                        <Label className="text-xs">Habitaciones</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-8 text-xs"
                          value={occupancy.roomCount || ''}
                          onChange={(e) => updateOccupancy(occupancy.id, { 
                            roomCount: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) 
                          })}
                        />
                      </div>

                      {/* Pasajeros por habitación (editable para custom) */}
                      <div>
                        <Label className="text-xs">Pax/hab</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          className="h-8 text-xs"
                          value={occupancy.guestsPerRoom || ''}
                          onChange={(e) => updateOccupancy(occupancy.id, { 
                            guestsPerRoom: e.target.value === '' ? 0 : (parseInt(e.target.value) || 0) 
                          })}
                          disabled={occupancy.roomType !== 'custom'}
                        />
                      </div>

                      {/* Nombre personalizado */}
                      {occupancy.roomType === 'custom' && (
                        <div className="md:col-span-4">
                          <Label className="text-xs">Nombre personalizado</Label>
                          <Input
                            className="h-8 text-xs"
                            value={occupancy.customTypeName || ''}
                            onChange={(e) => updateOccupancy(occupancy.id, { 
                              customTypeName: e.target.value 
                            })}
                            placeholder="Ej: Suite Familiar"
                          />
                        </div>
                      )}
                    </div>

                    {/* Precios */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center gap-4 mb-2">
                        <Label className="text-xs font-medium">Precio:</Label>
                        <RadioGroup
                          value={occupancy.pricingMode || 'perNight'}
                          onValueChange={(value) => updateOccupancy(occupancy.id, { 
                            pricingMode: value as 'perNight' | 'total' 
                          })}
                          className="flex gap-3"
                        >
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="perNight" id={`perNight-${occupancy.id}`} className="h-3 w-3" />
                            <Label htmlFor={`perNight-${occupancy.id}`} className="text-xs cursor-pointer">
                              Por noche
                            </Label>
                          </div>
                          <div className="flex items-center gap-1">
                            <RadioGroupItem value="total" id={`total-${occupancy.id}`} className="h-3 w-3" />
                            <Label htmlFor={`total-${occupancy.id}`} className="text-xs cursor-pointer">
                              Total
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {(occupancy.pricingMode || 'perNight') === 'perNight' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Costo/noche ({currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-7 text-xs"
                              value={occupancy.costPerNight || ''}
                              onChange={(e) => updateOccupancy(occupancy.id, { 
                                costPerNight: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Precio/noche ({currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-7 text-xs"
                              value={occupancy.pricePerNight || ''}
                              onChange={(e) => updateOccupancy(occupancy.id, { 
                                pricePerNight: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Costo total ({currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-7 text-xs"
                              value={occupancy.totalCost || ''}
                              onChange={(e) => updateOccupancy(occupancy.id, { 
                                totalCost: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="0.00"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Precio total ({currency})</Label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-7 text-xs"
                              value={occupancy.totalPrice || ''}
                              onChange={(e) => updateOccupancy(occupancy.id, { 
                                totalPrice: parseFloat(e.target.value) || undefined 
                              })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      )}

                      {/* Subtotal calculado */}
                      {subtotal.price > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground text-right">
                          {occupancy.roomCount} hab × {lodging.nights} noches = {' '}
                          <span className="font-medium text-foreground">
                            {currency} {subtotal.price.toLocaleString()}
                          </span>
                          {subtotal.cost > 0 && (
                            <span className="ml-2 text-muted-foreground">
                              (costo: {currency} {subtotal.cost.toLocaleString()})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Botones para agregar */}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addOccupancy('double')}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Doble
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addOccupancy('single')}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Single
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addOccupancy('triple')}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Triple
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addOccupancy('custom')}
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Otro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
