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
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useLinkReservationToFile } from '@/hooks/useFlightReservations';
import { toast } from 'sonner';

interface Props {
  reservationId: string;
}

export function LinkReservationToFileDialog({ reservationId }: Props) {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const { user } = useAuth();
  
  const linkMutation = useLinkReservationToFile();

  const { data: files, isLoading } = useQuery({
    queryKey: queryKeys.files.all(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('id, file_number, client_name, destination')
        .order('file_number', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open && !!user,
  });

  const handleLink = () => {
    if (!selectedFileId) {
      toast.error('Selecciona un expediente primero');
      return;
    }
    
    linkMutation.mutate({ reservationId, fileId: selectedFileId }, {
      onSuccess: () => {
        toast.success('Reserva vinculada y servicio generado');
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
        <Button variant="outline" size="sm" className="mt-2 text-xs">
          <LinkIcon className="h-3 w-3 mr-2" />
          Vincular a Expediente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Vincular a Expediente</DialogTitle>
          <DialogDescription>
            El vuelo se agregará operativamente al expediente y se generará una línea de costo/precio en sus Servicios.
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
                {selectedFileId
                  ? files?.find((f) => f.id === selectedFileId)?.file_number
                    ? `FILE-${String(files.find(f => f.id === selectedFileId)?.file_number).padStart(3, '0')} - ${files.find(f => f.id === selectedFileId)?.client_name}`
                    : 'Expediente seleccionado'
                  : isLoading ? 'Cargando...' : 'Buscar expediente...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[380px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar por cliente o destino..." />
                <CommandList>
                  <CommandEmpty>No se encontraron expedientes.</CommandEmpty>
                  <CommandGroup>
                    {files?.map((file) => (
                      <CommandItem
                        key={file.id}
                        value={`${file.file_number} ${file.client_name} ${file.destination}`}
                        onSelect={() => {
                          setSelectedFileId(file.id);
                          setComboboxOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            selectedFileId === file.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="font-mono text-muted-foreground mr-2">
                          FILE-{String(file.file_number).padStart(3, '0')}
                        </span>
                        <span>{file.client_name} {file.destination ? `(${file.destination})` : ''}</span>
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
            disabled={!selectedFileId || linkMutation.isPending}
          >
            {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vincular
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
