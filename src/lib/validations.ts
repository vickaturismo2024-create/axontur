import { z } from 'zod';

// Safe URL validation - blocks javascript: URIs, allows data: for images
const safeUrlSchema = z.preprocess(
  (val) => (val === null || val === undefined ? '' : String(val)),
  z.string().refine(
    (url) => {
      if (!url || url.length === 0) return true; // Allow empty strings
      const trimmed = url.trim().toLowerCase();
      // Block javascript: URIs but allow data: for base64 images
      return !trimmed.startsWith('javascript:');
    },
    { message: 'URL no válida' }
  )
);

// Client validation - no length restrictions
export const clientSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
});

// Flight validation - no length restrictions
export const flightSchema = z.object({
  id: z.string(),
  origin: z.string().default(''),
  destination: z.string().default(''),
  date: z.string().default(''),
  departureTime: z.string().default(''),
  arrivalTime: z.string().default(''),
  airline: z.string().default(''),
  flightNumber: z.string().default(''),
  luggage: z.string().default(''),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Lodging validation - no length restrictions
export const lodgingSchema = z.object({
  id: z.string().optional(),
  name: z.string().default(''),
  category: z.string().default(''),
  address: z.string().default(''),
  checkIn: z.string().default(''),
  checkOut: z.string().default(''),
  regime: z.string().default(''),
  roomType: z.string().default(''),
  nights: z.number().min(0).default(0),
  notes: z.string().default(''),
  destination: z.string().optional(),
  isOption: z.boolean().optional(),
  optionLabel: z.string().optional(),
  costPerNight: z.number().min(0).optional(),
  pricePerNight: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
  pricingMode: z.enum(['perNight', 'total']).optional(),
}).partial();

// Transfer validation - no length restrictions
export const transferSchema = z.object({
  id: z.string(),
  type: z.string().default(''),
  description: z.string().default(''),
  dateTime: z.string().default(''),
  included: z.boolean().default(false),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Train validation - no length restrictions
export const trainSchema = z.object({
  id: z.string(),
  origin: z.string().default(''),
  destination: z.string().default(''),
  date: z.string().default(''),
  departureTime: z.string().default(''),
  arrivalTime: z.string().default(''),
  company: z.string().default(''),
  trainNumber: z.string().default(''),
  class: z.string().default(''),
  seat: z.string().default(''),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Ferry validation - no length restrictions
export const ferrySchema = z.object({
  id: z.string(),
  origin: z.string().default(''),
  destination: z.string().default(''),
  date: z.string().default(''),
  departureTime: z.string().default(''),
  arrivalTime: z.string().default(''),
  company: z.string().default(''),
  vessel: z.string().default(''),
  cabinType: z.string().default(''),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Rental Car validation - no length restrictions
export const rentalCarSchema = z.object({
  id: z.string(),
  company: z.string().default(''),
  pickupLocation: z.string().default(''),
  dropoffLocation: z.string().default(''),
  pickupDate: z.string().default(''),
  pickupTime: z.string().default(''),
  dropoffDate: z.string().default(''),
  dropoffTime: z.string().default(''),
  carType: z.string().default(''),
  extras: z.string().default(''),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Activity validation - no length restrictions
export const activitySchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  description: z.string().default(''),
  date: z.string().default(''),
  time: z.string().default(''),
  duration: z.string().default(''),
  location: z.string().default(''),
  included: z.boolean().default(false),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
  notes: z.string().default(''),
});

// Cruise Port validation - no length restrictions
export const cruisePortSchema = z.object({
  id: z.string(),
  day: z.number().min(0).default(1),
  port: z.string().default(''),
  country: z.string().default(''),
  arrivalTime: z.string().default(''),
  departureTime: z.string().default(''),
  notes: z.string().default(''),
});

// Cruise Extras validation - no length restrictions
export const cruiseExtrasSchema = z.object({
  tips: z.string().default(''),
  beverages: z.string().default(''),
  wifi: z.string().default(''),
  excursions: z.string().default(''),
  specialDining: z.string().default(''),
  spa: z.string().default(''),
  other: z.string().default(''),
});

// Cruise validation - no length restrictions
export const cruiseSchema = z.object({
  id: z.string(),
  shipName: z.string().default(''),
  company: z.string().default(''),
  cabinType: z.string().default(''),
  cabinNumber: z.string().default(''),
  deck: z.string().default(''),
  embarkationPort: z.string().default(''),
  embarkationDate: z.string().default(''),
  disembarkationPort: z.string().default(''),
  disembarkationDate: z.string().default(''),
  nights: z.number().min(0).default(0),
  regime: z.string().default(''),
  itinerary: z.array(cruisePortSchema).default([]),
  extras: cruiseExtrasSchema.default({}),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
});

// Insurance validation - no length restrictions
export const insuranceSchema = z.object({
  company: z.string().default(''),
  plan: z.string().default(''),
  coverage: z.string().default(''),
  notes: z.string().default(''),
  cost: z.number().min(0).optional(),
  price: z.number().min(0).optional(),
}).partial();

// Lodging option pricing schema
const lodgingOptionPricingSchema = z.object({
  lodgingId: z.string(),
  lodgingLabel: z.string(),
  lodgingCost: z.number().min(0).default(0),
  lodgingPrice: z.number().min(0).default(0),
  totalPrice: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0),
  pricePerPerson: z.number().min(0).default(0),
  margin: z.number().default(0),
  marginPercentage: z.number().default(0),
});

// Pricing breakdown schema
const pricingBreakdownSchema = z.object({
  flights: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  transfers: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  trains: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  ferries: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  rentalCars: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  activities: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  cruise: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
  insurance: z.object({ cost: z.number().default(0), price: z.number().default(0) }),
});

// Pricing validation - no length restrictions
export const pricingSchema = z.object({
  totalPrice: z.number().min(0).default(0),
  pricePerPerson: z.number().min(0).default(0),
  taxes: z.number().min(0).default(0),
  paymentMethod: z.string().default(''),
  conditions: z.string().default(''),
  observations: z.string().default(''),
  calculationMode: z.enum(['manual', 'automatic']).optional(),
  fixedServicesTotal: z.number().min(0).optional(),
  fixedServicesCost: z.number().min(0).optional(),
  breakdown: pricingBreakdownSchema.optional(),
  lodgingOptions: z.array(lodgingOptionPricingSchema).optional(),
  totalCost: z.number().min(0).optional(),
  margin: z.number().optional(),
  marginPercentage: z.number().optional(),
}).partial();

// Itinerary day validation - no length restrictions
export const itineraryDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number().min(0).default(0),
  date: z.string().default(''),
  title: z.string().default(''),
  description: z.string().default(''),
  activities: z.array(z.string()).default([]),
});

// Cover validation - no length restrictions
export const coverSchema = z.object({
  title: z.string().default('PRESUPUESTO DE VIAJE'),
  subtitle: z.string().default(''),
  imageUrl: safeUrlSchema.default(''),
});

// Trip validation - no restrictions (travelers can be 0 for empty quotes)
export const tripSchema = z.object({
  destination: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  travelers: z.number().min(0).default(1),
  currency: z.string().default('USD'),
  type: z.enum(['standard', 'cruise', 'multiDestination']).optional(),
});

// Full Quote validation - no restrictions
export const quoteSchema = z.object({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  templateId: z.string().default('default'),
  client: clientSchema,
  trip: tripSchema,
  cover: coverSchema,
  flights: z.array(flightSchema).default([]),
  lodging: lodgingSchema.default({}),
  lodgings: z.array(lodgingSchema).optional(),
  transfers: z.array(transferSchema).default([]),
  trains: z.array(trainSchema).optional(),
  ferries: z.array(ferrySchema).optional(),
  rentalCars: z.array(rentalCarSchema).optional(),
  activities: z.array(activitySchema).optional(),
  cruise: cruiseSchema.optional(),
  insurance: insuranceSchema.default({}),
  pricing: pricingSchema.default({}),
  itineraryDays: z.array(itineraryDaySchema).default([]),
});

// WhatsApp Agent validation - no length restrictions
export const whatsappAgentSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
});

// Color validation (hex or hsl)
const colorSchema = z.string().default('');
const optionalColorSchema = z.string().optional().default('');

// Template validation - no length restrictions
export const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.preprocess(
    (val) => (val === null || val === undefined ? '' : String(val)),
    z.string().refine(
      (url) => {
        if (!url || url.length === 0) return true;
        const trimmed = url.trim().toLowerCase();
        return !trimmed.startsWith('javascript:');
      },
      { message: 'URL no válida' }
    )
  ).optional().default(''),
  colors: z.object({
    primary: colorSchema,
    secondary: colorSchema,
    accent: colorSchema,
    background: optionalColorSchema,
    cardBackground: optionalColorSchema,
  }).passthrough(),
  fonts: z.object({
    heading: z.string().default('Playfair Display'),
    body: z.string().default('Inter'),
  }),
  styles: z.object({
    borderRadius: z.string().default('12px'),
    cardShadow: z.boolean().default(true),
    separatorStyle: z.enum(['line', 'dots', 'gradient', 'decorative', 'none']).default('line'),
    borderStyle: z.enum(['none', 'solid', 'dashed', 'double', 'decorative']).default('none'),
    borderWidth: z.string().default('1px'),
    backgroundPattern: z.enum(['none', 'dots', 'lines', 'grid', 'waves']).default('none'),
    cardStyle: z.enum(['flat', 'elevated', 'outlined', 'glass']).default('elevated'),
  }),
  whatsappAgents: z.array(whatsappAgentSchema).default([]),
  footerText: z.string().default(''),
  sectionsToggles: z.object({
    flights: z.boolean().default(true),
    lodging: z.boolean().default(true),
    transfers: z.boolean().default(true),
    insurance: z.boolean().default(true),
    itinerary: z.boolean().default(true),
    trains: z.boolean().optional().default(false),
    ferries: z.boolean().optional().default(false),
    rentalCars: z.boolean().optional().default(false),
    activities: z.boolean().optional().default(false),
    cruise: z.boolean().optional().default(false),
  }),
});

// Validation helper that returns sanitized data or throws
export function validateQuote(data: unknown) {
  return quoteSchema.parse(data);
}

export function validateTemplate(data: unknown) {
  return templateSchema.parse(data);
}

// Safe error logging - strips sensitive details in production
export function logError(context: string, error: unknown): void {
  const isDev = import.meta.env.DEV;
  
  if (isDev) {
    console.error(`[${context}]`, error);
  } else {
    // In production, only log error type and context
    const errorType = error instanceof Error ? error.name : 'Unknown';
    console.error(`[${context}] Error type: ${errorType}`);
  }
}

// Get safe error message for users
export function getSafeErrorMessage(error: unknown): string {
  // Never expose internal error details to users
  if (error instanceof z.ZodError) {
    const firstError = error.errors[0];
    return firstError?.message || 'Datos inválidos';
  }
  return 'Ha ocurrido un error. Por favor, intenta nuevamente.';
}
