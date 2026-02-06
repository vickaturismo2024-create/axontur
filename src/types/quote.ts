export interface Client {
  name: string;
  phone: string;
  email: string;
}

// Tipos de equipaje predefinidos
export type LuggageType = 'personal' | 'personal_carryon' | 'personal_carryon_checked' | 'custom';

// Labels para tipos de equipaje
export const LUGGAGE_LABELS: Record<LuggageType, string> = {
  personal: 'Artículo Personal',
  personal_carryon: 'Artículo Personal + Carry On',
  personal_carryon_checked: 'Art. Personal + Carry On + Equipaje en Bodega',
  custom: 'Personalizado',
};

export interface Flight {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
  luggage: string;
  luggageType?: LuggageType; // Tipo predefinido de equipaje
  notes: string;
  cost?: number;
  price?: number;
  // Sistema de opciones de vuelo
  isOption?: boolean;
  optionLabel?: string;
  groupId?: string;
  flightType?: 'direct' | 'stopover' | 'charter';
  // Vinculación de tramos (escalas)
  connectionGroupId?: string; // ID para vincular tramos que son parte de una misma conexión
}

// Grupo de opciones de vuelo (para agrupación por ruta/fecha)
export interface FlightGroup {
  id: string;
  origin: string;
  destination: string;
  date: string;
  optionIds: string[];
}

// Tipo de ocupación/habitación dentro de un alojamiento
export interface RoomOccupancy {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  customTypeName?: string; // Para tipos personalizados
  roomCount: number; // Cantidad de habitaciones de este tipo
  guestsPerRoom: number; // Pasajeros por habitación (1 para single, 2 para doble, etc.)
  costPerNight?: number; // Costo neto por noche por habitación
  pricePerNight?: number; // Precio de venta por noche por habitación
  totalCost?: number; // Para modo pricing = 'total'
  totalPrice?: number; // Para modo pricing = 'total'
  pricingMode?: 'perNight' | 'total';
}

export interface Lodging {
  id?: string;
  name: string;
  category: string;
  address: string;
  checkIn: string;
  checkOut: string;
  regime: string;
  roomType: string;
  nights: number;
  notes: string;
  destination?: string; // Para viajes multi-destino
  isOption?: boolean; // Es una opción alternativa para el pasajero
  optionLabel?: string; // Etiqueta para la opción (ej: "Opción 1", "Opción económica")
  costPerNight?: number; // Costo real por noche (interno) - legacy, usar occupancies
  pricePerNight?: number; // Precio de venta por noche - legacy, usar occupancies
  totalCost?: number; // Costo total de la estadía (si pricingMode = 'total')
  totalPrice?: number; // Precio total de la estadía (si pricingMode = 'total')
  pricingMode?: 'perNight' | 'total'; // Modo de ingreso de precios - legacy
  groupId?: string; // ID del grupo de opciones al que pertenece
  // Nuevo: configuración de ocupaciones múltiples
  occupancies?: RoomOccupancy[];
  // Flag para usar sistema de ocupaciones (si false, usa sistema legacy)
  useOccupancies?: boolean;
}

// Grupo de opciones de alojamiento (para agrupación por destino/fechas)
export interface LodgingGroup {
  id: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  optionIds: string[];
}

export interface Transfer {
  id: string;
  type: string;
  description: string;
  dateTime: string;
  included: boolean;
  cost?: number;
  price?: number;
}

// Nuevos tipos de transporte
export interface Train {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  company: string;
  trainNumber: string;
  class: string;
  seat: string;
  notes: string;
  cost?: number;
  price?: number;
}

export interface Ferry {
  id: string;
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  company: string;
  vessel: string;
  cabinType: string;
  notes: string;
  cost?: number;
  price?: number;
}

export interface RentalCar {
  id: string;
  company: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  carType: string;
  extras: string; // GPS, silla bebé, etc
  notes: string;
  cost?: number;
  price?: number;
}

// Excursiones/Actividades
export interface Activity {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  included: boolean;
  cost?: number;
  price?: number;
  notes: string;
}

// Cruceros
export interface Cruise {
  id: string;
  shipName: string;
  company: string;
  cabinType: string;
  cabinNumber: string;
  deck: string;
  embarkationPort: string;
  embarkationDate: string;
  disembarkationPort: string;
  disembarkationDate: string;
  nights: number;
  regime: string; // All inclusive, full board, etc.
  itinerary: CruisePort[];
  extras: CruiseExtras;
  notes: string;
  cost?: number;
  price?: number;
}

export interface CruisePort {
  id: string;
  day: number;
  port: string;
  country: string;
  arrivalTime: string;
  departureTime: string;
  notes: string;
}

export interface CruiseExtras {
  tips: string;
  beverages: string;
  wifi: string;
  excursions: string;
  specialDining: string;
  spa: string;
  other: string;
}

export interface Insurance {
  company: string;
  plan: string;
  coverage: string;
  notes: string;
  cost?: number;
  price?: number;
}

// Precio calculado por opción de alojamiento
export interface LodgingOptionPricing {
  lodgingId: string;
  lodgingLabel: string;
  lodgingCost: number;
  lodgingPrice: number;
  totalPrice: number;
  totalCost: number;
  pricePerPerson: number;
  margin: number;
  marginPercentage: number;
}

// Precio calculado por tipo de ocupación (single, double, etc.)
export interface OccupancyPricing {
  occupancyId: string;
  occupancyType: string; // "Habitación Doble", "Habitación Single"
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  guestCount: number; // Cantidad de pasajeros en este tipo
  roomCount: number; // Cantidad de habitaciones
  sharedServicesPerPerson: number; // Porción de servicios fijos por persona
  lodgingTotalPrice: number; // Precio total del alojamiento para este tipo
  lodgingPerPerson: number; // Costo de alojamiento por persona
  totalPerPerson: number; // Total por persona para este tipo
  totalForType: number; // Total para todas las personas de este tipo
  // Costos internos
  sharedServicesCostPerPerson: number;
  lodgingTotalCost: number;
  lodgingCostPerPerson: number;
  totalCostPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
}

// Precios de ocupación para una opción de alojamiento alternativa
export interface LodgingOptionOccupancyPricing {
  lodgingId: string;
  lodgingLabel: string; // "Opción 1", "Hotel económico", etc.
  lodgingName: string;
  // Precios por tipo de ocupación dentro de esta opción
  occupancyPricing: OccupancyPricing[];
  // Totales para esta opción
  totalPrice: number;
  totalCost: number;
  margin: number;
  marginPercentage: number;
}

// =====================================================
// NUEVO: Sistema de precios agrupados por tipo de ocupación
// =====================================================

// Opción de alojamiento dentro de un tipo de ocupación
export interface LodgingOptionForOccupancy {
  lodgingId: string;
  lodgingName: string;
  optionLabel: string;
  destination?: string;
  lodgingPricePerPerson: number;
  totalPricePerPerson: number;
  // Internos (no se muestran en PDF)
  lodgingCostPerPerson: number;
  totalCostPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
}

// Tipo de ocupación con todas sus opciones (NUEVA estructura principal)
export interface OccupancyTypeWithOptions {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  customTypeName?: string;
  occupancyLabel: string; // "Habitación Single", "Habitación Doble"
  guestsPerRoom: number;
  totalRooms: number; // Total de habitaciones de este tipo
  totalGuests: number; // Total de pasajeros en este tipo
  
  // Base (servicios fijos + alojamientos obligatorios)
  sharedServicesPerPerson: number;
  sharedServicesCostPerPerson: number;
  mainLodgingPricePerPerson: number; // Suma de alojamientos NO opciones
  mainLodgingCostPerPerson: number;
  basePricePerPerson: number; // sharedServices + mainLodging
  baseCostPerPerson: number;
  
  // Detalles de alojamientos principales (para mostrar desglose)
  mainLodgingDetails: {
    lodgingId: string;
    lodgingName: string;
    destination?: string;
    pricePerPerson: number;
    costPerPerson: number;
  }[];
  
  // Opciones alternativas (si existen)
  hasOptions: boolean;
  lodgingOptions: LodgingOptionForOccupancy[];
  
  // Precio único (si no hay opciones alternativas)
  singleTotalPerPerson?: number;
  singleTotalCostPerPerson?: number;
  marginPerPerson?: number;
  marginPercentage?: number;
}

// Desglose de precios por categoría
export interface PricingBreakdown {
  flights: { cost: number; price: number };
  transfers: { cost: number; price: number };
  trains: { cost: number; price: number };
  ferries: { cost: number; price: number };
  rentalCars: { cost: number; price: number };
  activities: { cost: number; price: number };
  cruise: { cost: number; price: number };
  insurance: { cost: number; price: number };
}

// Configuración de visibilidad de precios individuales
export interface ItemPricesConfig {
  flights: boolean;
  lodging: boolean;
  transfers: boolean;
  trains: boolean;
  ferries: boolean;
  rentalCars: boolean;
  activities: boolean;
  cruise: boolean;
  insurance: boolean;
}

// Precio calculado por opción de vuelo
// Segmento de vuelo para conexiones
export interface FlightSegment {
  origin: string;
  destination: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
  flightNumber: string;
}

export interface FlightOptionPricing {
  flightId: string;
  optionLabel: string;
  flightType: 'direct' | 'stopover' | 'charter';
  luggage: string;
  luggageType?: LuggageType;
  flightPrice: number;       // Precio del vuelo
  flightCost: number;        // Costo del vuelo
  basePriceWithoutFlights: number; // Servicios fijos sin vuelos
  baseCostWithoutFlights: number;
  totalPrice: number;        // base + flightPrice
  totalCost: number;
  pricePerPerson: number;
  costPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
  // NUEVO: Para opciones con múltiples tramos (escalas)
  flightIds?: string[]; // IDs de todos los vuelos del grupo
  isConnectionGroup?: boolean; // Es un grupo de tramos conectados
  connectionLabel?: string; // "Buenos Aires → Miami → Cancún"
  segments?: FlightSegment[];
}

export interface Pricing {
  totalPrice: number;
  pricePerPerson: number;
  taxes: number;
  paymentMethod: string;
  conditions: string;
  observations: string;
  // Modo de cálculo
  calculationMode?: 'manual' | 'automatic';
  // Servicios fijos (sin alojamiento)
  fixedServicesTotal?: number;
  fixedServicesCost?: number;
  // Desglose por categoría
  breakdown?: PricingBreakdown;
  // Precios por opción de alojamiento (sistema legacy)
  lodgingOptions?: LodgingOptionPricing[];
  // Margen general (para cuando hay un solo alojamiento)
  totalCost?: number;
  margin?: number;
  marginPercentage?: number;
  // Configuración de visibilidad de precios individuales en PDF
  showItemPrices?: boolean;
  itemPricesConfig?: ItemPricesConfig;
  // Sistema de precios diferenciados por tipo de ocupación
  useOccupancyPricing?: boolean;
  occupancyPricing?: OccupancyPricing[]; // Legacy: ocupaciones de alojamientos principales
  lodgingOptionsOccupancy?: LodgingOptionOccupancyPricing[]; // Legacy: opciones alternativas
  // NUEVO: Precios agrupados por tipo de ocupación con opciones dentro
  occupancyTypesWithOptions?: OccupancyTypeWithOptions[];
  // Precios por opción de vuelo (combinando servicios fijos + cada opción)
  flightOptionsPricing?: FlightOptionPricing[];
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  description: string;
  activities: string[];
}

export interface WhatsAppAgent {
  name: string;
  phone: string;
}

export interface Template {
  id: string;
  name: string;
  logoUrl: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    cardBackground?: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  styles: {
    borderRadius: string;
    cardShadow: boolean;
    separatorStyle: 'line' | 'dots' | 'gradient' | 'decorative' | 'none';
    borderStyle: 'none' | 'solid' | 'dashed' | 'double' | 'decorative';
    borderWidth: string;
    backgroundPattern: 'none' | 'dots' | 'lines' | 'grid' | 'waves';
    cardStyle: 'flat' | 'elevated' | 'outlined' | 'glass';
  };
  whatsappAgents: WhatsAppAgent[];
  footerText: string;
  sectionsToggles: {
    flights: boolean;
    lodging: boolean;
    transfers: boolean;
    insurance: boolean;
    itinerary: boolean;
    trains?: boolean;
    ferries?: boolean;
    rentalCars?: boolean;
    activities?: boolean;
    cruise?: boolean;
  };
}

export interface Quote {
  id: string;
  createdAt: string;
  updatedAt: string;
  templateId: string;
  client: Client;
  trip: {
    destination: string;
    startDate: string;
    endDate: string;
    travelers: number;
    currency: string;
    type?: 'standard' | 'cruise' | 'multiDestination';
  };
  cover: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };
  flights: Flight[];
  lodging: Lodging; // Alojamiento principal (retrocompatibilidad)
  lodgings?: Lodging[]; // Múltiples alojamientos
  transfers: Transfer[];
  trains?: Train[];
  ferries?: Ferry[];
  rentalCars?: RentalCar[];
  activities?: Activity[];
  cruise?: Cruise;
  insurance: Insurance;
  pricing: Pricing;
  itineraryDays: ItineraryDay[];
}
