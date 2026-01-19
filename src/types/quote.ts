export interface Client {
  name: string;
  phone: string;
  email: string;
}

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
  notes: string;
  cost?: number;
  price?: number;
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
  costPerNight?: number; // Costo real por noche (interno)
  pricePerNight?: number; // Precio de venta por noche
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
  // Precios por opción de alojamiento
  lodgingOptions?: LodgingOptionPricing[];
  // Margen general (para cuando hay un solo alojamiento)
  totalCost?: number;
  margin?: number;
  marginPercentage?: number;
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
