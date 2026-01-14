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
  id: string;
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

// Crucero
export interface CruisePort {
  id: string;
  day: number;
  port: string;
  country: string;
  arrival: string;
  departure: string;
  description?: string;
}

export interface Cruise {
  enabled: boolean;
  cruiseLine: string;
  shipName: string;
  cabinType: string;
  cabinNumber: string;
  deck: string;
  embarkationPort: string;
  embarkationDate: string;
  disembarkationPort: string;
  disembarkationDate: string;
  nights: number;
  itinerary: CruisePort[];
  // Extras incluidos
  tipsIncluded: boolean;
  tipsAmount: number;
  beveragePackage: string;
  wifiPackage: string;
  diningPackage: string;
  excursionsIncluded: boolean;
  excursionsNotes: string;
  notes: string;
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
    cruise: boolean;
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
  };
  cover: {
    title: string;
    subtitle: string;
    imageUrl: string;
  };
  flights: Flight[];
  lodgings: Lodging[]; // Ahora soporta múltiples alojamientos
  lodging?: Lodging; // Legacy - para compatibilidad
  transfers: Transfer[];
  insurance: Insurance;
  pricing: Pricing;
  itineraryDays: ItineraryDay[];
  cruise?: Cruise; // Información de crucero
}
