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
  luggageType?: LuggageType;
  notes: string;
  cost?: number;
  price?: number;
  supplier?: string;
  isOption?: boolean;
  optionLabel?: string;
  groupId?: string;
  flightType?: 'direct' | 'stopover' | 'charter';
  connectionGroupId?: string;
}

export interface FlightGroup {
  id: string;
  origin: string;
  destination: string;
  date: string;
  optionIds: string[];
}

export interface RoomOccupancy {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  customTypeName?: string;
  roomCount: number;
  guestsPerRoom: number;
  costPerNight?: number;
  pricePerNight?: number;
  totalCost?: number;
  totalPrice?: number;
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
  destination?: string;
  isOption?: boolean;
  optionLabel?: string;
  costPerNight?: number;
  pricePerNight?: number;
  totalCost?: number;
  totalPrice?: number;
  pricingMode?: 'perNight' | 'total';
  groupId?: string;
  occupancies?: RoomOccupancy[];
  useOccupancies?: boolean;
  supplier?: string;
}

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
  supplier?: string;
}

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
  supplier?: string;
  included?: boolean;
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
  supplier?: string;
  included?: boolean;
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
  extras: string;
  notes: string;
  cost?: number;
  price?: number;
  supplier?: string;
  included?: boolean;
}

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
  supplier?: string;
}

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
  regime: string;
  itinerary: CruisePort[];
  extras: CruiseExtras;
  notes: string;
  cost?: number;
  price?: number;
  supplier?: string;
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
  supplier?: string;
}

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

export interface OccupancyPricing {
  occupancyId: string;
  occupancyType: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  guestCount: number;
  roomCount: number;
  sharedServicesPerPerson: number;
  lodgingTotalPrice: number;
  lodgingPerPerson: number;
  totalPerPerson: number;
  totalForType: number;
  sharedServicesCostPerPerson: number;
  lodgingTotalCost: number;
  lodgingCostPerPerson: number;
  totalCostPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
}

export interface LodgingOptionOccupancyPricing {
  lodgingId: string;
  lodgingLabel: string;
  lodgingName: string;
  occupancyPricing: OccupancyPricing[];
  totalPrice: number;
  totalCost: number;
  margin: number;
  marginPercentage: number;
}

export interface LodgingOptionForOccupancy {
  lodgingId: string;
  lodgingName: string;
  optionLabel: string;
  destination?: string;
  lodgingPricePerPerson: number;
  totalPricePerPerson: number;
  lodgingCostPerPerson: number;
  totalCostPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
}

export interface OccupancyTypeWithOptions {
  id: string;
  roomType: 'single' | 'double' | 'triple' | 'quadruple' | 'custom';
  customTypeName?: string;
  occupancyLabel: string;
  guestsPerRoom: number;
  totalRooms: number;
  totalGuests: number;
  sharedServicesPerPerson: number;
  sharedServicesCostPerPerson: number;
  mainLodgingPricePerPerson: number;
  mainLodgingCostPerPerson: number;
  basePricePerPerson: number;
  baseCostPerPerson: number;
  mainLodgingDetails: {
    lodgingId: string;
    lodgingName: string;
    destination?: string;
    pricePerPerson: number;
    costPerPerson: number;
  }[];
  hasOptions: boolean;
  lodgingOptions: LodgingOptionForOccupancy[];
  singleTotalPerPerson?: number;
  singleTotalCostPerPerson?: number;
  marginPerPerson?: number;
  marginPercentage?: number;
}

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
  flightPrice: number;
  flightCost: number;
  basePriceWithoutFlights: number;
  baseCostWithoutFlights: number;
  totalPrice: number;
  totalCost: number;
  pricePerPerson: number;
  costPerPerson: number;
  marginPerPerson: number;
  marginPercentage: number;
  flightIds?: string[];
  isConnectionGroup?: boolean;
  connectionLabel?: string;
  segments?: FlightSegment[];
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'expired';

export interface Pricing {
  totalPrice: number;
  pricePerPerson: number;
  taxes: number;
  paymentMethod: string;
  conditions: string;
  observations: string;
  calculationMode?: 'manual' | 'automatic';
  fixedServicesTotal?: number;
  fixedServicesCost?: number;
  breakdown?: PricingBreakdown;
  lodgingOptions?: LodgingOptionPricing[];
  totalCost?: number;
  margin?: number;
  marginPercentage?: number;
  showItemPrices?: boolean;
  itemPricesConfig?: ItemPricesConfig;
  useOccupancyPricing?: boolean;
  occupancyPricing?: OccupancyPricing[];
  lodgingOptionsOccupancy?: LodgingOptionOccupancyPricing[];
  occupancyTypesWithOptions?: OccupancyTypeWithOptions[];
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
  agencyName?: string;
  logoUrl: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background?: string;
    cardBackground?: string;
    text?: string;
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
    coverLayout?: 'classic' | 'split' | 'fullOverlay' | 'minimal';
    headingStyle?: 'underline' | 'background' | 'accent-left' | 'pill';
    iconStyle?: 'filled' | 'outlined' | 'none';
    contentDensity?: 'compact' | 'normal' | 'spacious';
    coverOverlay?: 'gradient' | 'solid' | 'blur' | 'vignette' | 'none';
    logoPosition?: 'top-right' | 'top-left' | 'top-center' | 'bottom-center';
    logoSize?: 'small' | 'medium' | 'large';
    tableStyle?: 'striped' | 'clean' | 'bordered' | 'minimal';
    dateFormat?: 'long' | 'short' | 'medium';
    footerStyle?: 'simple' | 'banner' | 'centered' | 'minimal';
    cardHoverEffect?: 'none' | 'lift' | 'glow' | 'border-accent';
    coverOverlayOpacity?: number;
    coverTextAlign?: 'center' | 'left' | 'right';
    showCreationDate?: boolean;
    preparedForLabel?: string;
    itineraryLayout?: 'timeline' | 'cards' | 'compact' | 'magazine';
    itineraryDotStyle?: 'numbered' | 'icon' | 'filled' | 'ring';
    itineraryCardStyle?: 'bordered' | 'filled' | 'minimal' | 'accent-top';
    itinerarySummaryStyle?: 'gradient-banner' | 'simple-text' | 'card' | 'none';
    itineraryShowDayDate?: boolean;
    itineraryActivityIcon?: 'checkmark' | 'bullet' | 'arrow' | 'star';
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
  lodging: Lodging;
  lodgings?: Lodging[];
  transfers: Transfer[];
  trains?: Train[];
  ferries?: Ferry[];
  rentalCars?: RentalCar[];
  activities?: Activity[];
  cruise?: Cruise;
  insurance: Insurance;
  pricing: Pricing;
  itineraryDays: ItineraryDay[];
  status?: QuoteStatus;
  internalNotes?: string;
  publicLinkExpiry?: string;
  archived?: boolean;
  favorited?: boolean;
  approvedAt?: string;
  approvedByName?: string;
  approvedIp?: string;
  viewCount?: number;
}

export interface QuoteVersion {
  id: string;
  quoteId: string;
  versionNumber: number;
  data: any;
  createdAt: string;
}
