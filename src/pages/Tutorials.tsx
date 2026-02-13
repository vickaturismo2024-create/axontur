import { Header } from '@/components/layout/Header';
import { Accordion } from '@/components/ui/accordion';
import { TutorialSection } from '@/components/tutorials/TutorialSection';
import { TutorialDemo } from '@/components/tutorials/TutorialDemo';
import { TutorialCallout } from '@/components/tutorials/TutorialCallout';
import { flightDemoSteps } from '@/components/tutorials/demos/FlightDemo';
import { pricingDemoSteps } from '@/components/tutorials/demos/PricingDemo';
import { lodgingDemoSteps } from '@/components/tutorials/demos/LodgingDemo';
import { templateDemoSteps } from '@/components/tutorials/demos/TemplateDemo';
import { pdfDemoSteps } from '@/components/tutorials/demos/PDFDemo';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  UserRound,
  Plane,
  Hotel,
  TrainFront,
  Ship,
  Calculator,
  BedDouble,
  PlaneTakeoff,
  Palette,
  FileText,
  Lightbulb,
  Navigation,
} from 'lucide-react';

export default function Tutorials() {
  const { startTour } = useTour();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground">Guía del Sistema</h1>
          <p className="mt-2 text-muted-foreground">
            Todo lo que necesitás saber para crear presupuestos de viaje profesionales.
          </p>
          <Button
            variant="outline"
            className="mt-4 gap-2"
            onClick={() => startTour('general')}
          >
            <Navigation className="h-4 w-4" /> Iniciar tour guiado del editor
          </Button>
        </div>

        <Accordion type="multiple" className="space-y-0">
          {/* 1 */}
          <TutorialSection value="primeros-pasos" icon={Rocket} title="Primeros pasos">
            <p>Desde el <strong>Dashboard</strong> podés ver todos tus presupuestos. Hacé clic en <strong>"Nuevo Presupuesto"</strong> para empezar uno nuevo.</p>
            <p>Cada presupuesto tiene un asistente (wizard) que te guía paso a paso: datos del cliente, vuelos, alojamientos, transportes, precios y vista previa.</p>
            <p>Podés moverte entre las secciones usando las pestañas de arriba o los botones "Anterior" y "Siguiente".</p>
            <TutorialCallout type="tip">
              Si es tu primera vez, te recomendamos usar el <strong>tour guiado</strong> del botón de arriba para familiarizarte con el editor.
            </TutorialCallout>
          </TutorialSection>

          {/* 2 */}
          <TutorialSection value="datos-cliente" icon={UserRound} title="Datos del cliente">
            <p>En la primera pestaña completá el nombre del pasajero o grupo. Esta información aparecerá en la portada del PDF final.</p>
            <p>También podés agregar datos del viaje como destino, fechas y una imagen de portada personalizada.</p>
            <TutorialCallout type="info">
              El nombre del cliente es lo primero que se ve en el presupuesto. Asegurate de escribirlo correctamente.
            </TutorialCallout>
          </TutorialSection>

          {/* 3 */}
          <TutorialSection value="vuelos" icon={Plane} title="Vuelos">
            <p>Agregá vuelos usando el botón <strong>"Agregar vuelo"</strong>. Cada vuelo tiene origen, destino, aerolínea, horarios y opciones de equipaje.</p>
            <p><strong>Ida y vuelta:</strong> Podés vincular dos vuelos como ida y vuelta. El sistema los agrupará automáticamente en el presupuesto.</p>
            <p><strong>Escalas:</strong> Si un vuelo tiene escalas, podés agregar tramos conectados. Activá la opción "Escala" y el sistema conectará los tramos visualmente.</p>
            <p><strong>Equipaje:</strong> Configurá el tipo de equipaje incluido (carry-on, bodega, etc.) para que aparezca en el detalle del presupuesto.</p>
            <TutorialCallout type="tip">
              Podés usar el <strong>parser de PNR</strong> para importar vuelos automáticamente desde un código de reserva.
            </TutorialCallout>
            <TutorialDemo title="Agregar un vuelo" steps={flightDemoSteps} />
          </TutorialSection>

          {/* 4 */}
          <TutorialSection value="alojamientos" icon={Hotel} title="Alojamientos">
            <p>Agregá hoteles con nombre, ubicación, fechas de check-in/check-out y régimen de comidas.</p>
            <p><strong>Múltiples opciones:</strong> Podés ofrecer varias alternativas de hotel para que el cliente elija. Cada opción puede tener su propio precio.</p>
            <p><strong>Precio por noche vs total:</strong> Elegí si querés cargar el precio por noche (el sistema calcula el total) o directamente el total de la estadía.</p>
            <TutorialCallout type="info">
              Ofrecer 2-3 opciones de hotel genera más confianza y le da al cliente sensación de control.
            </TutorialCallout>
            <TutorialDemo title="Configurar alojamiento" steps={lodgingDemoSteps} />
          </TutorialSection>

          {/* 5 */}
          <TutorialSection value="transportes" icon={TrainFront} title="Transportes">
            <p>Esta sección incluye varios tipos de transporte terrestre y marítimo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Trenes:</strong> Agregá trayectos en tren con origen, destino, horarios y clase.</li>
              <li><strong>Ferrys:</strong> Para trayectos marítimos cortos entre islas o ciudades costeras.</li>
              <li><strong>Autos de alquiler:</strong> Configurá el tipo de vehículo, fechas y lugar de retiro/devolución.</li>
              <li><strong>Traslados:</strong> Transfers aeropuerto-hotel u otros traslados privados o compartidos.</li>
            </ul>
            <TutorialCallout type="warning">
              Los traslados son opcionales. Si el hotel incluye transfer, podés marcarlo como "incluido" en la descripción.
            </TutorialCallout>
          </TutorialSection>

          {/* 6 */}
          <TutorialSection value="cruceros-actividades" icon={Ship} title="Cruceros y Actividades">
            <p><strong>Cruceros:</strong> Agregá un crucero con itinerario, tipo de cabina y régimen. El sistema lo integrará en el presupuesto general.</p>
            <p><strong>Actividades:</strong> Excursiones, tours, entradas a parques o cualquier experiencia. Cada actividad tiene nombre, descripción y precio.</p>
            <TutorialCallout type="tip">
              Los cruceros pueden incluir extras como propinas, paquete de bebidas y WiFi. Configurá cada uno para más detalle.
            </TutorialCallout>
          </TutorialSection>

          {/* 7 */}
          <TutorialSection value="sistema-precios" icon={Calculator} title="Sistema de precios">
            <p>El sistema tiene dos modos de cálculo:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Automático:</strong> Ingresás el costo neto y un porcentaje de margen. El sistema calcula el precio de venta automáticamente.</li>
              <li><strong>Manual:</strong> Ingresás directamente el precio de venta que querés mostrar al cliente.</li>
            </ul>
            <p>El <strong>costo neto</strong> es lo que vos pagás al proveedor. El <strong>precio de venta</strong> es lo que ve el cliente. La diferencia es tu ganancia.</p>
            <p>El seguro de viaje también se configura desde esta sección.</p>
            <TutorialCallout type="warning">
              Los precios del cliente <strong>nunca</strong> muestran tu costo neto ni tu margen. Esa información es solo para vos.
            </TutorialCallout>
            <TutorialDemo title="Calcular precios" steps={pricingDemoSteps} />
          </TutorialSection>

          {/* 8 */}
          <TutorialSection value="ocupaciones" icon={BedDouble} title="Ocupaciones">
            <p>Configurá precios diferenciados según el tipo de habitación:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Single:</strong> Una persona sola.</li>
              <li><strong>Doble:</strong> Dos personas compartiendo habitación.</li>
              <li><strong>Triple:</strong> Tres personas compartiendo habitación.</li>
            </ul>
            <p>Esto es útil cuando el hotel tiene tarifas distintas por tipo de ocupación. El presupuesto final mostrará un precio por persona según cada modalidad.</p>
            <TutorialCallout type="info">
              Activá las ocupaciones dentro de cada hotel en la sección de alojamiento. Los precios se recalculan automáticamente.
            </TutorialCallout>
          </TutorialSection>

          {/* 9 */}
          <TutorialSection value="opciones-vuelo" icon={PlaneTakeoff} title="Opciones de vuelo">
            <p>Si tenés varias alternativas de vuelo con precios diferentes, podés presentarlas como <strong>opciones independientes</strong>.</p>
            <p>Esto genera tarjetas de precio separadas en el PDF, para que el cliente pueda comparar y elegir la que prefiera.</p>
            <p>Para activar esta función, agregá vuelos con diferentes unidades de grupo. El sistema detectará automáticamente que hay múltiples opciones.</p>
          </TutorialSection>

          {/* 10 */}
          <TutorialSection value="plantillas" icon={Palette} title="Plantillas de diseño">
            <p>Desde la sección <strong>"Plantillas"</strong> podés personalizar el diseño del PDF:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Colores:</strong> Elegí los colores principales del presupuesto.</li>
              <li><strong>Logo:</strong> Subí el logo de tu agencia para que aparezca en el PDF.</li>
              <li><strong>Fuentes:</strong> Seleccioná tipografías para títulos y texto.</li>
              <li><strong>Secciones:</strong> Activá o desactivá secciones del PDF según lo que necesites mostrar.</li>
              <li><strong>Contacto:</strong> Configurá los datos de contacto y agentes de WhatsApp.</li>
            </ul>
            <p>Podés crear varias plantillas y asignar una diferente a cada presupuesto.</p>
            <TutorialDemo title="Personalizar plantilla" steps={templateDemoSteps} />
          </TutorialSection>

          {/* 11 */}
          <TutorialSection value="vista-previa-pdf" icon={FileText} title="Vista previa y PDF final">
            <p>En la última pestaña del asistente verás una <strong>vista previa en vivo</strong> del presupuesto tal como se verá en el PDF.</p>
            <p>Desde ahí podés:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Exportar a PDF:</strong> Generá el archivo PDF listo para enviar.</li>
              <li><strong>Compartir por link:</strong> Obtené un enlace directo al presupuesto.</li>
              <li><strong>Código QR:</strong> Generá un QR que el cliente puede escanear para ver el presupuesto.</li>
            </ul>
            <TutorialDemo title="Exportar y compartir" steps={pdfDemoSteps} />
          </TutorialSection>

          {/* 12 */}
          <TutorialSection value="tips" icon={Lightbulb} title="Tips para un buen presupuesto">
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Usá imágenes de portada atractivas</strong> — Una buena foto del destino hace que el presupuesto se vea más profesional.</li>
              <li><strong>Completá todos los detalles</strong> — Cuanta más información tenga el presupuesto, más confianza genera en el cliente.</li>
              <li><strong>Ofrecé alternativas</strong> — Presentá 2-3 opciones de hotel o vuelo para que el cliente sienta que tiene control.</li>
              <li><strong>Revisá la vista previa</strong> — Antes de exportar, asegurate de que todo se vea bien en la preview.</li>
              <li><strong>Personalizá la plantilla</strong> — Usá los colores y logo de tu agencia para dar una imagen profesional.</li>
              <li><strong>Guardá seguido</strong> — El sistema guarda automáticamente, pero no está de más hacer clic en "Guardar" periódicamente.</li>
            </ul>
          </TutorialSection>
        </Accordion>
      </main>
    </div>
  );
}
