import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useGoBack } from '@/hooks/useGoBack';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { FlightImporter } from '@/components/reservations/FlightImporter';

export default function ReservationImport() {
  const navigate = useNavigate();
  const goBack = useGoBack('/reservations');
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('file_id') || undefined;

  const handleSuccess = (reservationId: string) => {
    if (fileId) {
      navigate(`/files/${fileId}`);
    } else {
      navigate(`/reservations/${reservationId}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-sans text-2xl font-bold">Importar Vuelo</h1>
              <p className="text-muted-foreground">Pegá el texto del PNR o subí un PDF para extraer los vuelos</p>
            </div>
          </div>

          <FlightImporter
            fileId={fileId}
            onSuccess={handleSuccess}
            onCancel={goBack}
          />
        </div>
      </main>
    </div>
  );
}
