import { Header } from '@/components/layout/Header';
import { Accordion } from '@/components/ui/accordion';
import { TutorialSection } from '@/components/tutorials/TutorialSection';
import { TutorialDemo } from '@/components/tutorials/TutorialDemo';
import { TutorialCallout } from '@/components/tutorials/TutorialCallout';
import InteractiveFlightDemo from '@/components/tutorials/demos/FlightDemo';
import InteractivePricingDemo from '@/components/tutorials/demos/PricingDemo';
import InteractiveLodgingDemo from '@/components/tutorials/demos/LodgingDemo';
import InteractiveTemplateDemo from '@/components/tutorials/demos/TemplateDemo';
import InteractivePDFDemo from '@/components/tutorials/demos/PDFDemo';
import InteractiveTransportDemo from '@/components/tutorials/demos/TransportDemo';
import InteractiveOccupancyDemo from '@/components/tutorials/demos/OccupancyDemo';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import {
  Rocket, UserRound, Plane, Hotel, TrainFront, Ship, Calculator,
  BedDouble, PlaneTakeoff, Palette, FileText, Lightbulb, Navigation,
  Users, Store, ShieldCheck, CreditCard, LayoutDashboard, CalendarDays,
  BarChart3, Building2, Wrench,
} from 'lucide-react';
import { TutorialSectionsExisting } from '@/components/tutorials/TutorialSectionsExisting';
import { TutorialSectionsNew } from '@/components/tutorials/TutorialSectionsNew';

const allSectionValues = [
  'primeros-pasos', 'datos-cliente', 'vuelos', 'alojamientos', 'transportes',
  'cruceros-actividades', 'sistema-precios', 'ocupaciones', 'opciones-vuelo',
  'plantillas', 'vista-previa-pdf', 'tips',
  'clientes-crm', 'proveedores', 'seguros', 'pagos', 'dashboard-filtros',
  'calendario', 'reportes', 'agencia', 'herramientas-avanzadas',
];

export default function Tutorials() {
  const { startTour } = useTour();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-sans font-bold text-foreground">Guía del Sistema</h1>
          <p className="mt-2 text-muted-foreground">
            Todo lo que necesitás saber para crear presupuestos de viaje profesionales.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => startTour('general')}>
              <Navigation className="h-4 w-4" /> Tour: Editor general
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => startTour('flights')}>
              <Plane className="h-4 w-4" /> Tour: Vuelos
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => startTour('lodging')}>
              <Hotel className="h-4 w-4" /> Tour: Alojamiento
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => startTour('pricing')}>
              <Calculator className="h-4 w-4" /> Tour: Precios
            </Button>
          </div>
        </div>

        <Accordion type="multiple" defaultValue={allSectionValues} className="space-y-0">
          <TutorialSectionsExisting />
          <TutorialSectionsNew />
        </Accordion>
      </main>
    </div>
  );
}
