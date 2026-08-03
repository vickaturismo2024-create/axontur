import { useFileReservations, useDeleteReservation } from '@/hooks/useFlightReservations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plane, Plus, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LinkFileToReservationDialog } from '@/components/reservations/LinkFileToReservationDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  fileId: string;
}

export function FileFlightsTab({ fileId }: Props) {
  const { data: reservations, isLoading } = useFileReservations(fileId);
  const deleteReservation = useDeleteReservation();
  
  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Cargando vuelos...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-medium">Vuelos de la Reserva</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/reservations/import?file_id=${fileId}`}>
              <Plus className="h-4 w-4 mr-2" /> Importar PNR
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Botón para vincular un PNR existente */}
      <div className="bg-muted/30 p-3 rounded-lg border border-dashed flex justify-between items-center flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          ¿Ya ingresaste el PNR en el panel global?
        </div>
        <LinkFileToReservationDialog fileId={fileId} />
      </div>

      {!reservations?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Plane className="h-8 w-8 mb-4 opacity-50" />
            <p>No hay vuelos vinculados a este expediente.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reservations.map(res => (
            <Card key={res.id} className="relative overflow-hidden group">
              <div className="absolute right-0 top-0 h-full w-1 bg-primary/20" />
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-mono">
                        {res.locator || 'SIN PNR'}
                      </Badge>
                      {res.gds && <Badge className="text-[10px]">{res.gds}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Modificado {format(new Date(res.updated_at), 'd MMM HH:mm', { locale: es })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/reservations/${res.id}`}>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar vuelo?</AlertDialogTitle>
                          <AlertDialogDescription>Se eliminarán los vuelos y pasajeros asociados a esta reserva.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteReservation.mutate(res.id)}
                            className="bg-destructive text-destructive-foreground"
                          >Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

