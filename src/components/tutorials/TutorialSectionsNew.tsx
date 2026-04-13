import { TutorialSection } from './TutorialSection';
import { TutorialCallout } from './TutorialCallout';
import {
  Users, Store, ShieldCheck, CreditCard, LayoutDashboard,
  CalendarDays, BarChart3, Building2, Wrench,
} from 'lucide-react';

export function TutorialSectionsNew() {
  return (
    <>
      {/* Gestión de clientes (CRM) */}
      <TutorialSection value="clientes-crm" icon={Users} title="Gestión de clientes (CRM)">
        <p>Desde la sección <strong>"Clientes"</strong> podés gestionar tu base de datos de pasajeros.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Crear y editar:</strong> Cargá nombre, email, teléfono y datos personales de cada cliente.</li>
          <li><strong>Documentos:</strong> Registrá DNI, pasaporte, fecha de emisión y vencimiento. El sistema te avisa con alertas cuando un documento está por vencer.</li>
          <li><strong>Grupos:</strong> Organizá clientes en grupos (ej: "Familia González", "Viaje empresa XYZ") para asociarlos fácilmente a presupuestos grupales.</li>
          <li><strong>Notas:</strong> Agregá notas internas sobre preferencias, restricciones alimentarias, pedidos especiales, etc.</li>
          <li><strong>Importar desde Excel:</strong> Si ya tenés una base de clientes en planilla, podés importarla masivamente.</li>
        </ul>
        <TutorialCallout type="tip">
          Mantené actualizados los documentos de tus clientes. Las alertas de vencimiento te ayudan a avisar al pasajero con tiempo para renovar antes del viaje.
        </TutorialCallout>
      </TutorialSection>

      {/* Proveedores */}
      <TutorialSection value="proveedores" icon={Store} title="Proveedores">
        <p>La sección <strong>"Proveedores"</strong> te permite gestionar tus prestadores de servicios turísticos.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Crear proveedores:</strong> Cargá nombre, tipo (aerolínea, hotel, operador, etc.), email, teléfono y notas.</li>
          <li><strong>Asignar a servicios:</strong> Desde el editor de presupuestos, cada vuelo, hotel, transporte o actividad puede tener un proveedor asignado.</li>
          <li><strong>Métricas en reportes:</strong> En la sección de reportes podés ver cuánto facturaste con cada proveedor, tu margen de ganancia y la cantidad de servicios contratados.</li>
        </ul>
        <TutorialCallout type="info">
          Asignar proveedores a los servicios es opcional pero muy recomendado. Te permite analizar qué proveedores te dejan mejor margen y cuáles usás más frecuentemente.
        </TutorialCallout>
      </TutorialSection>

      {/* Seguros */}
      <TutorialSection value="seguros" icon={ShieldCheck} title="Seguros de viaje">
        <p>Configurá el seguro de viaje desde la pestaña de seguros en el editor de presupuestos.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Compañía:</strong> Indicá la aseguradora (ej: Assist Card, Universal Assistance, etc.).</li>
          <li><strong>Plan y cobertura:</strong> Especificá el tipo de plan y el monto de cobertura médica.</li>
          <li><strong>Precio:</strong> Cargá el costo neto y el precio de venta, igual que con los demás servicios.</li>
          <li><strong>Vigencia:</strong> Las fechas del seguro generalmente coinciden con las del viaje.</li>
        </ul>
        <p>El seguro aparece como un ítem separado en el desglose de precios del presupuesto y se suma al total automáticamente.</p>
        <TutorialCallout type="warning">
          No te olvides de incluir el seguro en los presupuestos internacionales. Muchos destinos lo exigen como requisito de ingreso.
        </TutorialCallout>
      </TutorialSection>

      {/* Pagos y cobranzas */}
      <TutorialSection value="pagos" icon={CreditCard} title="Pagos y cobranzas">
        <p>Llevá un registro detallado de los pagos que recibís por cada presupuesto.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Pagos parciales:</strong> Registrá cada pago a medida que el cliente va abonando (seña, cuotas, saldo final).</li>
          <li><strong>Método de pago:</strong> Indicá si fue efectivo, transferencia, tarjeta de crédito, etc.</li>
          <li><strong>Estado:</strong> Cada pago puede estar pendiente o confirmado.</li>
          <li><strong>Saldo:</strong> El sistema calcula automáticamente cuánto falta cobrar restando los pagos registrados del total del presupuesto.</li>
          <li><strong>Moneda:</strong> Cada pago se registra en la moneda del presupuesto (USD o ARS).</li>
        </ul>
        <TutorialCallout type="tip">
          Registrar los pagos te permite tener una visión clara de tu flujo de caja y saber exactamente cuánto te deben en cada presupuesto.
        </TutorialCallout>
      </TutorialSection>

      {/* Dashboard y filtros */}
      <TutorialSection value="dashboard-filtros" icon={LayoutDashboard} title="Dashboard y filtros">
        <p>El dashboard es tu centro de control. Desde ahí gestionás todos los presupuestos.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Estados:</strong> Filtrá por <em>Borrador</em> (en preparación), <em>Enviado</em> (compartido con el cliente), <em>Aprobado</em> (confirmado) o <em>Archivado</em>.</li>
          <li><strong>Filtros por fecha:</strong> Buscá presupuestos por rango de fechas de creación o de viaje.</li>
          <li><strong>Etiquetas (tags):</strong> Creá etiquetas de colores para categorizar presupuestos (ej: "Europa", "Caribe", "Corporativo", "Luna de miel"). Podés filtrar por una o varias etiquetas.</li>
          <li><strong>Favoritos:</strong> Marcá presupuestos importantes con estrella para encontrarlos rápido.</li>
          <li><strong>Búsqueda:</strong> Buscá por nombre de cliente, destino o cualquier dato del presupuesto.</li>
        </ul>
        <p>Los gráficos del dashboard muestran estadísticas de ventas, estados y actividad reciente para tener una visión general del negocio.</p>
        <TutorialCallout type="info">
          Usá las etiquetas de color para organizar tu trabajo. Podés crear las que necesites y asignar varias a un mismo presupuesto.
        </TutorialCallout>
      </TutorialSection>

      {/* Calendario de viajes */}
      <TutorialSection value="calendario" icon={CalendarDays} title="Calendario de viajes">
        <p>El calendario muestra una vista mensual de todos los viajes aprobados que están en curso o son futuros.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Vista visual:</strong> Cada viaje se muestra como una barra que abarca desde la fecha de inicio hasta la de fin.</li>
          <li><strong>Solo viajes activos:</strong> Los viajes que ya finalizaron se ocultan automáticamente para mantener la vista limpia.</li>
          <li><strong>Acceso rápido:</strong> Hacé clic en un viaje para ir directamente al editor del presupuesto.</li>
        </ul>
        <TutorialCallout type="info">
          El calendario solo muestra presupuestos con estado "Aprobado" y fechas de viaje cargadas. Asegurate de completar las fechas del viaje en cada presupuesto.
        </TutorialCallout>
      </TutorialSection>

      {/* Reportes y rentabilidad */}
      <TutorialSection value="reportes" icon={BarChart3} title="Reportes y rentabilidad">
        <p>La sección de <strong>Reportes</strong> te da visibilidad sobre la performance de tu negocio.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Gráficos de ventas:</strong> Visualizá el volumen de ventas por mes y la evolución a lo largo del tiempo.</li>
          <li><strong>Rentabilidad por proveedor:</strong> Analizá qué proveedores te dejan mejor margen y cuáles tienen mayor volumen de facturación.</li>
          <li><strong>Filtro por moneda:</strong> Los reportes separan USD y ARS para no mezclar valores. Seleccioná la moneda que querés analizar.</li>
          <li><strong>Exportar a Excel:</strong> Descargá los datos de reportes en formato Excel para análisis adicional o para compartir con socios.</li>
        </ul>
        <p><strong>Métricas clave:</strong> El margen de ganancia se calcula sobre el precio de venta. Si vendés a US$100 con costo de US$70, tu ganancia es US$30 y tu margen es 30%.</p>
        <TutorialCallout type="tip">
          Revisá los reportes mensualmente para identificar tendencias. Si un proveedor tiene bajo margen, puede ser momento de renegociar tarifas.
        </TutorialCallout>
      </TutorialSection>

      {/* Datos de agencia */}
      <TutorialSection value="agencia" icon={Building2} title="Datos de agencia">
        <p>Desde la sección <strong>"Agencia"</strong> configurá los datos de tu empresa.</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Nombre de la agencia:</strong> Aparece en el header del PDF y en los datos de contacto.</li>
          <li><strong>Logo:</strong> Subí el logo de tu agencia. Se usará en las plantillas de PDF.</li>
          <li><strong>Datos de contacto:</strong> Teléfono, email y sitio web.</li>
          <li><strong>Datos legales:</strong> CUIT y dirección fiscal para incluir en el presupuesto si lo necesitás.</li>
        </ul>
        <TutorialCallout type="info">
          Los datos de agencia se usan como valores por defecto en las plantillas. Podés sobrescribirlos en cada plantilla si necesitás datos diferentes.
        </TutorialCallout>
      </TutorialSection>

      {/* Herramientas avanzadas */}
      <TutorialSection value="herramientas-avanzadas" icon={Wrench} title="Herramientas avanzadas">
        <p>El sistema incluye herramientas que agilizan el trabajo diario:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Importar desde URL:</strong> Pegá el link de un paquete turístico de un operador y el sistema extraerá automáticamente los datos del viaje (vuelos, hoteles, precios).</li>
          <li><strong>Parser de PNR:</strong> Pegá un código de reserva (PNR/GDS) y el sistema reconocerá los vuelos con todos sus datos.</li>
          <li><strong>Duplicar presupuesto:</strong> Copiá un presupuesto existente para otro cliente. Ideal cuando vendés el mismo paquete a diferentes pasajeros.</li>
          <li><strong>Comparador de presupuestos:</strong> Compará dos o más presupuestos lado a lado para analizar diferencias de precio, servicios y márgenes.</li>
          <li><strong>Historial de versiones:</strong> Cada vez que guardás, se crea una versión. Podés volver a una versión anterior si necesitás deshacer cambios.</li>
          <li><strong>Búsqueda global:</strong> Desde cualquier pantalla, usá el buscador del header para encontrar presupuestos, clientes o proveedores al instante.</li>
          <li><strong>Recordatorios:</strong> Creá recordatorios con fecha para no olvidarte de seguimientos, vencimientos o tareas pendientes.</li>
        </ul>
        <TutorialCallout type="tip">
          La combinación de importar desde URL + parser de PNR te permite armar un presupuesto completo en minutos en lugar de cargar todo manualmente.
        </TutorialCallout>
      </TutorialSection>
    </>
  );
}
