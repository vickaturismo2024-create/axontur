import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLinkReservationToFile } from '@/hooks/useFlightReservations';
import { toast } from 'sonner';

interface Props {
  fileId: string;
}

export function LinkFileToReservationDialog({ fileId }: Props) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string>('');
  const { user } = useAuth();
  
  const linkMutation = useLinkReservationToFile();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['unlinked-reservations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('id, locator, gds')
        .is('file_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  const handleLink = () => {
    if (!selectedResId) {
      toast.error('Selecciona un vuelo primero');
      return;
    }
    
    linkMutation.mutate({ reservationId: selectedResId, fileId }, {
      onSuccess: () => {
        toast.success('Reserva vinculada al expediente exitosamente');
        setOpen(false);
      },
      onError: (err) => {
        toast.error('Error al vincular: ' + err.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <LinkIcon className="h-3 w-3 mr-2" />
          Vincular Vuelo Existente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vincular Vuelo Existente</DialogTitle>
          <DialogDescription>
            Busca una reserva que hayas importado en el panel global pero que aún no esté asignada a ningún expediente.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={comboboxOpen}
                className="w-full justify-between"
                disabled={isLoading}
              >
                {selectedResId
                  ? reservations?.find((r) => r.id === selectedResId)?.locator
                    ? `PNR: ${reservations.find(r => r.id === selectedResId)?.locator}`
                    : 'Reserva seleccionada'
                  : isLoading ? 'Cargando vuelos sueltos...' : 'Buscar vuelo sin vincular...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por PNR..." />
                <CommandList>
                  <CommandEmpty>No se encontraron vuelos sin vincular.</CommandEmpty>
                  <CommandGroup>
                    {reservations?.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.locator || 'SIN PNR'}
                        onSelect={() => {
                          setSelectedResId(r.id);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedResId === r.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="font-mono text-muted-foreground mr-2">
                          {r.locator || 'SIN PNR'}
                        </span>
                        <span>{r.gds ? `(${r.gds})` : ''}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleLink} 
            disabled={!selectedResId || linkMutation.isPending}
          >
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
