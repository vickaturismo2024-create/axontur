import { TutorialSection } from './TutorialSection';
import { TutorialDemo } from './TutorialDemo';
import { TutorialCallout } from './TutorialCallout';
import InteractiveFlightDemo from './demos/FlightDemo';
import InteractivePricingDemo from './demos/PricingDemo';
import InteractiveLodgingDemo from './demos/LodgingDemo';
import InteractiveTemplateDemo from './demos/TemplateDemo';
import InteractivePDFDemo from './demos/PDFDemo';
import InteractiveTransportDemo from './demos/TransportDemo';
import InteractiveOccupancyDemo from './demos/OccupancyDemo';
import {
  Rocket, UserRound, Plane, Hotel, TrainFront, Ship, Calculator,
  BedDouble, PlaneTakeoff, Palette, FileText, Lightbulb,
} from 'lucide-react';

export function TutorialSectionsExisting() {
  return (
    <>
      {/* 1 - Primeros pasos */}
      <TutorialSection value="primeros-pasos" icon={Rocket} title="Primeros pasos">
        <p>Desde el <strong>Dashboard</strong> podés ver todos tus presupuestos. Hacé clic en <strong>"Nuevo Presupuesto"</strong> para empezar uno nuevo.</p>
        <p>Cada presupuesto tiene un asistente (wizard) que te guía paso a paso: datos del cliente, vuelos, alojamientos, transportes, precios y vista previa.</p>
        <p>Podés moverte entre las secciones usando las pestañas de arriba o los botones "Anterior" y "Siguiente".</p>
        <p><strong>Estados del presupuesto:</strong> cada presupuesto pasa por distintos estados — <em>Borrador</em>, <em>Enviado</em>, <em>Aprobado</em> y <em>Archivado</em>. Podés cambiar el estado desde el editor o el dashboard.</p>
        <p><strong>Búsqueda global:</strong> Usá el buscador del header para encontrar presupuestos, clientes o proveedores rápidamente desde cualquier pantalla.</p>
        <p><strong>Recordatorios:</strong> Configurá recordatorios para no olvidarte de seguimientos. Se muestran con una campana en el header y podés asociarlos a un presupuesto específico.</p>
        <TutorialCallout type="tip">
          Si es tu primera vez, te recomendamos usar el <strong>tour guiado</strong> del botón de arriba para familiarizarte con el editor.
        </TutorialCallout>
      </TutorialSection>

      {/* 2 - Datos del cliente */}
      <TutorialSection value="datos-cliente" icon={UserRound} title="Datos del cliente">
        <p>En la primera pestaña completá el nombre del pasajero o grupo. Esta información aparecerá en la portada del PDF final.</p>
        <p>También podés agregar datos del viaje como destino, fechas y una imagen de portada personalizada.</p>
        <p><strong>Selector de cliente:</strong> Si ya tenés clientes cargados en el CRM, podés seleccionar uno desde el desplegable y se completarán los datos automáticamente.</p>
        <p>El campo de destino acepta múltiples ciudades separadas por coma (ej: "Roma, Florencia, Venecia").</p>
        <TutorialCallout type="info">
          El nombre del cliente es lo primero que se ve en el presupuesto. Asegurate de escribirlo correctamente.
        </TutorialCallout>
      </TutorialSection>

      {/* 3 - Vuelos */}
      <TutorialSection value="vuelos" icon={Plane} title="Vuelos">
        <p>Agregá vuelos usando el botón <strong>"Agregar vuelo"</strong>. Cada vuelo tiene origen, destino, aerolínea, horarios y opciones de equipaje.</p>
        <p><strong>Ida y vuelta:</strong> Podés vincular dos vuelos como ida y vuelta. El sistema los agrupará automáticamente en el presupuesto.</p>
        <p><strong>Escalas:</strong> Si un vuelo tiene escalas, podés agregar tramos conectados. Activá la opción "Escala" y el sistema conectará los tramos visualmente.</p>
        <p><strong>Equipaje:</strong> Configurá el tipo de equipaje incluido (carry-on, bodega, etc.) para que aparezca en el detalle del presupuesto.</p>
        <p><strong>Parser de PNR:</strong> Si tenés un código de reserva (PNR), podés pegarlo y el sistema extraerá automáticamente los datos de los vuelos: aerolínea, número de vuelo, fechas, horarios y rutas.</p>
        <p><strong>Opciones de grupo:</strong> Asigná vuelos a diferentes grupos para ofrecer alternativas de vuelo con precios independientes. Cada grupo genera una tarjeta de precio separada en el PDF.</p>
        <p><strong>Proveedor:</strong> Podés asignar un proveedor (consolidador, aerolínea directa, etc.) a cada vuelo para el seguimiento en reportes.</p>
        <TutorialCallout type="tip">
          Podés usar el <strong>parser de PNR</strong> para importar vuelos automáticamente desde un código de reserva. También podés importar desde una URL de paquete.
        </TutorialCallout>
        <TutorialDemo title="Agregar un vuelo">
          <InteractiveFlightDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 4 - Alojamientos */}
      <TutorialSection value="alojamientos" icon={Hotel} title="Alojamientos">
        <p>Agregá hoteles con nombre, ubicación, fechas de check-in/check-out y régimen de comidas.</p>
        <p><strong>Múltiples opciones:</strong> Podés ofrecer varias alternativas de hotel para que el cliente elija. Cada opción puede tener su propio precio.</p>
        <p><strong>Precio por noche vs total:</strong> Elegí si querés cargar el precio por noche (el sistema calcula el total) o directamente el total de la estadía.</p>
        <p><strong>Proveedor:</strong> Asigná un proveedor a cada alojamiento (operador, booking directo, etc.) para rastrear costos y márgenes en los reportes.</p>
        <p><strong>Régimen de comidas:</strong> Seleccioná entre solo alojamiento, desayuno incluido, media pensión, pensión completa o all-inclusive.</p>
        <p><strong>Estrellas y categoría:</strong> Indicá la categoría del hotel para que aparezca en la presentación al cliente.</p>
        <TutorialCallout type="info">
          Ofrecer 2-3 opciones de hotel genera más confianza y le da al cliente sensación de control sobre su viaje.
        </TutorialCallout>
        <TutorialDemo title="Configurar alojamiento">
          <InteractiveLodgingDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 5 - Transportes */}
      <TutorialSection value="transportes" icon={TrainFront} title="Transportes">
        <p>Esta sección incluye varios tipos de transporte terrestre y marítimo:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Trenes:</strong> Agregá trayectos en tren con origen, destino, horarios, clase y compañía ferroviaria (ej: Eurostar, AVE, TGV).</li>
          <li><strong>Ferrys:</strong> Para trayectos marítimos cortos entre islas o ciudades costeras. Incluí tipo de cabina y duración del viaje.</li>
          <li><strong>Autos de alquiler:</strong> Configurá el tipo de vehículo, categoría, fechas y lugar de retiro/devolución. Ideal para road trips.</li>
          <li><strong>Traslados:</strong> Transfers aeropuerto-hotel u otros traslados privados o compartidos. Indicá si es privado o regular.</li>
        </ul>
        <p>Cada tipo de transporte permite asignar un proveedor y un precio con costo neto para calcular márgenes.</p>
        <TutorialCallout type="warning">
          Los traslados son opcionales. Si el hotel incluye transfer, podés marcarlo como "incluido" en la descripción en lugar de agregarlo como servicio separado.
        </TutorialCallout>
        <TutorialDemo title="Tipos de transporte">
          <InteractiveTransportDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 6 - Cruceros y Actividades */}
      <TutorialSection value="cruceros-actividades" icon={Ship} title="Cruceros y Actividades">
        <p><strong>Cruceros:</strong> Agregá un crucero con itinerario detallado, naviera, nombre del barco, tipo de cabina y régimen. El sistema lo integrará en el presupuesto general.</p>
        <p><strong>Extras del crucero:</strong> Configurá extras opcionales como paquete de bebidas, propinas prepagadas, WiFi a bordo y excursiones en puerto. Cada extra tiene su propio precio.</p>
        <p><strong>Actividades:</strong> Excursiones, tours, entradas a parques, experiencias gastronómicas o cualquier servicio adicional. Cada actividad tiene nombre, descripción, ubicación, duración y precio.</p>
        <p><strong>Organización:</strong> Las actividades se pueden asociar a días específicos del itinerario para una presentación más clara al cliente.</p>
        <TutorialCallout type="tip">
          Los cruceros pueden incluir muchos extras. Detallá cada uno para que el cliente sepa exactamente qué está incluido y qué tiene costo adicional.
        </TutorialCallout>
      </TutorialSection>

      {/* 7 - Sistema de precios */}
      <TutorialSection value="sistema-precios" icon={Calculator} title="Sistema de precios">
        <p>El sistema tiene dos modos de cálculo:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Automático:</strong> Ingresás el costo neto y un porcentaje de margen. El sistema calcula el precio de venta automáticamente.</li>
          <li><strong>Manual:</strong> Ingresás directamente el precio de venta que querés mostrar al cliente.</li>
        </ul>
        <p>El <strong>costo neto</strong> es lo que vos pagás al proveedor. El <strong>precio de venta</strong> es lo que ve el cliente. La diferencia es tu ganancia.</p>
        <p><strong>Moneda:</strong> Podés trabajar en USD o ARS. Cada presupuesto tiene una moneda principal. Los reportes agrupan por moneda para evitar mezclar valores.</p>
        <p><strong>Margen sobre venta:</strong> El porcentaje de ganancia se calcula sobre el precio de venta (no sobre el costo), lo cual refleja el margen real del negocio.</p>
        <p>El seguro de viaje también se configura desde esta sección (ver sección dedicada más abajo).</p>
        <TutorialCallout type="warning">
          Los precios del cliente <strong>nunca</strong> muestran tu costo neto ni tu margen. Esa información es solo para vos y aparece únicamente en los reportes internos.
        </TutorialCallout>
        <TutorialDemo title="Calcular precios">
          <InteractivePricingDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 8 - Ocupaciones */}
      <TutorialSection value="ocupaciones" icon={BedDouble} title="Ocupaciones">
        <p>Configurá precios diferenciados según el tipo de habitación:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Single:</strong> Una persona sola en habitación individual.</li>
          <li><strong>Doble:</strong> Dos personas compartiendo habitación (precio por persona).</li>
          <li><strong>Triple:</strong> Tres personas compartiendo habitación (precio por persona).</li>
        </ul>
        <p>Esto es útil cuando el hotel tiene tarifas distintas por tipo de ocupación. El presupuesto final mostrará un precio por persona según cada modalidad.</p>
        <p><strong>Ejemplo de cálculo:</strong> Si una habitación doble cuesta US$200/noche por 3 noches = US$600 total. En ocupación doble, el precio por persona es US$300. En single, el pasajero paga el total de US$600.</p>
        <p>Los servicios no hoteleros (vuelos, excursiones, seguros) se suman igual para todas las ocupaciones; solo varía la parte de alojamiento.</p>
        <TutorialCallout type="info">
          Activá las ocupaciones dentro de cada hotel en la sección de alojamiento. Los precios se recalculan automáticamente según la cantidad de pasajeros por habitación.
        </TutorialCallout>
        <TutorialDemo title="Ocupaciones y precios">
          <InteractiveOccupancyDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 9 - Opciones de vuelo */}
      <TutorialSection value="opciones-vuelo" icon={PlaneTakeoff} title="Opciones de vuelo">
        <p>Si tenés varias alternativas de vuelo con precios diferentes, podés presentarlas como <strong>opciones independientes</strong>.</p>
        <p>Esto genera tarjetas de precio separadas en el PDF, para que el cliente pueda comparar y elegir la que prefiera.</p>
        <p><strong>Cómo funciona:</strong> Al agregar vuelos, asigná cada alternativa a un grupo diferente (Grupo A, Grupo B, etc.). El sistema detectará automáticamente que hay múltiples opciones y generará una tarjeta por grupo.</p>
        <p><strong>Ejemplo:</strong> Grupo A con vuelo directo por US$1.200 y Grupo B con escala por US$800. El cliente ve ambas opciones lado a lado en el presupuesto.</p>
        <p>Cada grupo puede tener su propia configuración de ida/vuelta, escalas y equipaje.</p>
        <TutorialCallout type="tip">
          Nombrar los grupos de forma descriptiva (ej: "Opción directa", "Opción económica") ayuda al cliente a decidir más rápido.
        </TutorialCallout>
      </TutorialSection>

      {/* 10 - Plantillas */}
      <TutorialSection value="plantillas" icon={Palette} title="Plantillas de diseño">
        <p>Desde la sección <strong>"Plantillas"</strong> podés personalizar el diseño del PDF:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Colores:</strong> Elegí los colores principales del presupuesto (primario, secundario, acentos).</li>
          <li><strong>Logo:</strong> Subí el logo de tu agencia para que aparezca en el encabezado del PDF.</li>
          <li><strong>Fuentes:</strong> Seleccioná tipografías para títulos y texto del cuerpo.</li>
          <li><strong>Secciones:</strong> Activá o desactivá secciones del PDF según lo que necesites mostrar (vuelos, hoteles, itinerario, contacto, etc.).</li>
          <li><strong>Contacto y WhatsApp:</strong> Configurá los datos de contacto y agentes de WhatsApp que aparecen en la página de contacto del PDF.</li>
        </ul>
        <p><strong>Plantillas preestablecidas:</strong> El sistema incluye plantillas prediseñadas que podés usar como punto de partida y después personalizar.</p>
        <p>Podés crear varias plantillas y asignar una diferente a cada presupuesto según el tipo de cliente o destino.</p>
        <TutorialCallout type="tip">
          Creá una plantilla para viajes corporativos (colores sobrios) y otra para viajes de placer (colores vibrantes) para dar un toque personalizado.
        </TutorialCallout>
        <TutorialDemo title="Personalizar plantilla">
          <InteractiveTemplateDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 11 - Vista previa y PDF */}
      <TutorialSection value="vista-previa-pdf" icon={FileText} title="Vista previa y PDF final">
        <p>En la última pestaña del asistente verás una <strong>vista previa en vivo</strong> del presupuesto tal como se verá en el PDF.</p>
        <p>Desde ahí podés:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Exportar a PDF:</strong> Generá el archivo PDF listo para enviar por mail o WhatsApp.</li>
          <li><strong>Compartir por link:</strong> Obtené un enlace público directo al presupuesto. El cliente puede verlo online sin necesidad de descargar nada.</li>
          <li><strong>Código QR:</strong> Generá un QR que el cliente puede escanear para ver el presupuesto desde su celular.</li>
          <li><strong>Aprobación online:</strong> El cliente puede aprobar el presupuesto directamente desde el link público. Se registra quién aprobó, cuándo y desde qué IP.</li>
        </ul>
        <p><strong>Link público:</strong> El enlace compartido muestra una versión limpia del presupuesto sin datos internos (costos, márgenes). Solo ve lo que vos querés que vea.</p>
        <TutorialCallout type="info">
          Cuando un cliente aprueba un presupuesto desde el link público, recibirás una notificación y el estado cambiará automáticamente a "Aprobado".
        </TutorialCallout>
        <TutorialDemo title="Exportar y compartir">
          <InteractivePDFDemo />
        </TutorialDemo>
      </TutorialSection>

      {/* 12 - Tips */}
      <TutorialSection value="tips" icon={Lightbulb} title="Tips para un buen presupuesto">
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Usá imágenes de portada atractivas</strong> — Una buena foto del destino hace que el presupuesto se vea más profesional.</li>
          <li><strong>Completá todos los detalles</strong> — Cuanta más información tenga el presupuesto, más confianza genera en el cliente.</li>
          <li><strong>Ofrecé alternativas</strong> — Presentá 2-3 opciones de hotel o vuelo para que el cliente sienta que tiene control.</li>
          <li><strong>Revisá la vista previa</strong> — Antes de exportar, asegurate de que todo se vea bien en la preview.</li>
          <li><strong>Personalizá la plantilla</strong> — Usá los colores y logo de tu agencia para dar una imagen profesional.</li>
          <li><strong>Guardá seguido</strong> — El sistema guarda automáticamente, pero no está de más hacer clic en "Guardar" periódicamente.</li>
          <li><strong>Cargá proveedores</strong> — Asignar proveedores a cada servicio te permite analizar rentabilidad por proveedor en los reportes.</li>
          <li><strong>Registrá pagos</strong> — Llevá un registro de los pagos parciales para saber cuánto falta cobrar de cada presupuesto.</li>
          <li><strong>Revisá los reportes</strong> — Consultá periódicamente la sección de reportes para entender tus márgenes y los proveedores más rentables.</li>
          <li><strong>Usá etiquetas</strong> — Las tags de color te ayudan a categorizar presupuestos (ej: "Europa", "Luna de miel", "Corporativo").</li>
        </ul>
      </TutorialSection>
    </>
  );
}
