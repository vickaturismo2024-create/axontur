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
  name: string;
  category: string;
  address: string;
  checkIn: string;
  checkOut: string;
  regime: string;
  roomType: string;
  nights: number;
  notes: string;
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
  lodging: Lodging;
  transfers: Transfer[];
  insurance: Insurance;
  pricing: Pricing;
  itineraryDays: ItineraryDay[];
}
