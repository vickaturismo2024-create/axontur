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
}

export interface Transfer {
  id: string;
  type: string;
  description: string;
  dateTime: string;
  included: boolean;
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
}

export interface Pricing {
  totalPrice: number;
  pricePerPerson: number;
  taxes: number;
  paymentMethod: string;
  conditions: string;
  observations: string;
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
