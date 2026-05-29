import { Template } from '@/types/quote';
import type { CSSProperties } from 'react';

/**
 * Textos por defecto del PDF. Se pueden sobreescribir por plantilla en
 * `template.styles.labels`. Usar el helper `t(template, key)` para leerlos.
 */
export const DEFAULT_LABELS: Record<string, string> = {
  // Portada
  coverEyebrow: 'PRESUPUESTO DE VIAJE',
  from: 'Desde',
  to: 'Hasta',
  travelers: 'Pasajeros',
  preparedFor: 'Preparado para',
  // Detalles
  detailsTitle: 'Detalles del Viaje',
  flights: 'Vuelos',
  flightOptions: 'Opciones de Vuelo',
  lodging: 'Alojamiento',
  lodgings: 'Alojamientos',
  lodgingOptions: 'Opciones de Alojamiento',
  cruise: 'Crucero',
  transfers: 'Traslados',
  trains: 'Trenes',
  ferries: 'Ferrys',
  rentalCars: 'Autos de Alquiler',
  activities: 'Actividades y Excursiones',
  insurance: 'Asistencia al Viajero',
  pricing: 'Valor del Viaje',
  // Campos
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  regime: 'Régimen',
  room: 'Habitación',
  nights: 'Noches',
  luggage: 'Equipaje',
  // Itinerario / Contacto
  itineraryTitle: 'Itinerario día a día',
  contactTitle: 'Ubicación y Contacto',
  whatsappTitle: 'Contactanos por WhatsApp',
  // Sufijos
  perPerson: 'por persona',
};

export type LabelKey = keyof typeof DEFAULT_LABELS;

/**
 * Devuelve el label custom de la plantilla o el default. Nunca devuelve vacío
 * (si la plantilla guarda un string vacío, también cae al default).
 */
export function t(template: Template | undefined, key: LabelKey | string): string {
  const labels = (template?.styles as any)?.labels as Record<string, string> | undefined;
  const custom = labels?.[key];
  if (typeof custom === 'string' && custom.trim() !== '') return custom;
  return DEFAULT_LABELS[key] ?? '';
}

export function getBorderRadius(template: Template, fallback = '8px'): string {
  return template.styles.borderRadius || fallback;
}

/**
 * Estilo para el contenedor de una "tarjeta" de sección del PDF (vuelos,
 * alojamiento, etc.) respetando cardStyle + borderRadius + colores.
 */
export function getCardContainerStyle(template: Template): CSSProperties {
  const bg = template.colors.background || '#ffffff';
  const cardBg = template.colors.cardBackground || '#f8f9fa';
  const secondary = template.colors.secondary;
  const radius = getBorderRadius(template);
  const style: CSSProperties = {
    borderRadius: radius,
    backgroundColor: bg,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
  switch (template.styles.cardStyle) {
    case 'flat':
      return { ...style, backgroundColor: cardBg, border: 'none' };
    case 'outlined':
      return { ...style, border: `1px solid ${secondary}` };
    case 'glass':
      return {
        ...style,
        backgroundColor: `${cardBg}cc`,
        backdropFilter: 'blur(6px)',
        border: `1px solid ${secondary}40`,
      };
    case 'elevated':
      return {
        ...style,
        border: `1px solid ${secondary}80`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      };
    default:
      return { ...style, border: `1px solid ${secondary}` };
  }
}

/**
 * Estilo del badge que envuelve los íconos de sección (filled / outlined / none).
 * Retorna `null` para `none` (no se debe renderizar el badge).
 */
export function getIconBadgeStyle(
  template: Template,
): { wrapper: CSSProperties | null; iconColor: string; iconSize: number } {
  const primary = template.colors.primary;
  const style = template.styles.iconStyle || 'filled';
  if (style === 'none') return { wrapper: null, iconColor: primary, iconSize: 0 };
  if (style === 'outlined') {
    return {
      wrapper: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
      iconColor: primary,
      iconSize: 14,
    };
  }
  return {
    wrapper: {
      width: '24px',
      height: '24px',
      borderRadius: getBorderRadius(template, '6px'),
      backgroundColor: `${primary}1a`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    },
    iconColor: primary,
    iconSize: 12,
  };
}

export function getTableHeadStyle(template: Template): CSSProperties {
  const cardBg = template.colors.cardBackground || '#f8f9fa';
  const ts = template.styles.tableStyle || 'clean';
  if (ts === 'bordered') {
    return {
      backgroundColor: cardBg,
      borderBottom: `1px solid ${template.colors.secondary}`,
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    };
  }
  if (ts === 'minimal') {
    return {
      backgroundColor: 'transparent',
      borderBottom: `1px solid ${template.colors.secondary}80`,
      WebkitPrintColorAdjust: 'exact',
      printColorAdjust: 'exact',
    };
  }
  return {
    backgroundColor: cardBg,
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
}

export function getTableRowStyle(template: Template, idx: number): CSSProperties {
  const bg = template.colors.background || '#ffffff';
  const cardBg = template.colors.cardBackground || '#f8f9fa';
  const secondary = template.colors.secondary;
  const ts = template.styles.tableStyle || 'clean';
  const base: CSSProperties = {
    WebkitPrintColorAdjust: 'exact',
    printColorAdjust: 'exact',
  };
  switch (ts) {
    case 'striped':
      return { ...base, backgroundColor: idx % 2 === 0 ? bg : cardBg };
    case 'bordered':
      return { ...base, backgroundColor: bg, borderBottom: `1px solid ${secondary}80` };
    case 'minimal':
      return { ...base, backgroundColor: 'transparent', borderBottom: `1px solid ${secondary}30` };
    case 'clean':
    default:
      return { ...base, backgroundColor: idx % 2 === 0 ? bg : cardBg };
  }
}

/**
 * Estilo aplicado al wrapper del footer text. Variantes:
 *  - simple: línea sola
 *  - banner: banda con color primary y texto blanco
 *  - centered: centrado con separador superior
 *  - minimal: texto chico gris
 */
export function getFooterContainerStyle(template: Template): {
  wrapper: CSSProperties;
  textColor: string;
} {
  const primary = template.colors.primary;
  const secondary = template.colors.secondary;
  const style = template.styles.footerStyle || 'simple';
  switch (style) {
    case 'banner':
      return {
        wrapper: {
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: getBorderRadius(template, '6px'),
          backgroundColor: primary,
          textAlign: 'center',
          fontSize: '11px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        },
        textColor: '#ffffff',
      };
    case 'centered':
      return {
        wrapper: {
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: `1px solid ${secondary}`,
          textAlign: 'center',
          fontSize: '10px',
        },
        textColor: `${primary}cc`,
      };
    case 'minimal':
      return {
        wrapper: { marginTop: '8px', textAlign: 'center', fontSize: '9px' },
        textColor: `${primary}80`,
      };
    case 'simple':
    default:
      return {
        wrapper: { marginTop: '12px', textAlign: 'center', fontSize: '10px' },
        textColor: `${primary}99`,
      };
  }
}
