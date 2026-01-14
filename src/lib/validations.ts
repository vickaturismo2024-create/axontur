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

// Client validation
export const clientSchema = z.object({
  name: z.string().max(200, 'El nombre es demasiado largo').default(''),
  phone: z.string().max(50, 'El teléfono es demasiado largo').default(''),
  email: z.string().max(255, 'El email es demasiado largo').default(''),
});

// Flight validation
export const flightSchema = z.object({
  id: z.string().max(100),
  origin: z.string().max(200, 'El origen es demasiado largo').default(''),
  destination: z.string().max(200, 'El destino es demasiado largo').default(''),
  date: z.string().max(50).default(''),
  departureTime: z.string().max(50).default(''),
  arrivalTime: z.string().max(50).default(''),
  airline: z.string().max(200).default(''),
  flightNumber: z.string().max(50).default(''),
  luggage: z.string().max(200).default(''),
  notes: z.string().max(1000).default(''),
});

// Lodging validation
export const lodgingSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().max(300).default(''),
  category: z.string().max(100).default(''),
  address: z.string().max(500).default(''),
  checkIn: z.string().max(50).default(''),
  checkOut: z.string().max(50).default(''),
  regime: z.string().max(100).default(''),
  roomType: z.string().max(100).default(''),
  nights: z.number().min(0).max(365).default(0),
  notes: z.string().max(2000).default(''),
  destination: z.string().max(200).optional(),
}).partial();

// Transfer validation
export const transferSchema = z.object({
  id: z.string().max(100),
  type: z.string().max(100).default(''),
  description: z.string().max(500).default(''),
  dateTime: z.string().max(50).default(''),
  included: z.boolean().default(false),
});

// Train validation
export const trainSchema = z.object({
  id: z.string().max(100),
  origin: z.string().max(200).default(''),
  destination: z.string().max(200).default(''),
  date: z.string().max(50).default(''),
  departureTime: z.string().max(50).default(''),
  arrivalTime: z.string().max(50).default(''),
  company: z.string().max(200).default(''),
  trainNumber: z.string().max(50).default(''),
  class: z.string().max(100).default(''),
  seat: z.string().max(50).default(''),
  notes: z.string().max(1000).default(''),
});

// Ferry validation
export const ferrySchema = z.object({
  id: z.string().max(100),
  origin: z.string().max(200).default(''),
  destination: z.string().max(200).default(''),
  date: z.string().max(50).default(''),
  departureTime: z.string().max(50).default(''),
  arrivalTime: z.string().max(50).default(''),
  company: z.string().max(200).default(''),
  vessel: z.string().max(200).default(''),
  cabinType: z.string().max(100).default(''),
  notes: z.string().max(1000).default(''),
});

// Rental Car validation
export const rentalCarSchema = z.object({
  id: z.string().max(100),
  company: z.string().max(200).default(''),
  pickupLocation: z.string().max(300).default(''),
  dropoffLocation: z.string().max(300).default(''),
  pickupDate: z.string().max(50).default(''),
  pickupTime: z.string().max(50).default(''),
  dropoffDate: z.string().max(50).default(''),
  dropoffTime: z.string().max(50).default(''),
  carType: z.string().max(100).default(''),
  extras: z.string().max(500).default(''),
  notes: z.string().max(1000).default(''),
});

// Activity validation
export const activitySchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200).default(''),
  description: z.string().max(1000).default(''),
  date: z.string().max(50).default(''),
  time: z.string().max(50).default(''),
  duration: z.string().max(50).default(''),
  location: z.string().max(300).default(''),
  included: z.boolean().default(false),
  price: z.number().min(0).max(99999999).optional(),
  notes: z.string().max(1000).default(''),
});

// Cruise Port validation
export const cruisePortSchema = z.object({
  id: z.string().max(100),
  day: z.number().min(1).max(365).default(1),
  port: z.string().max(200).default(''),
  country: z.string().max(100).default(''),
  arrivalTime: z.string().max(50).default(''),
  departureTime: z.string().max(50).default(''),
  notes: z.string().max(500).default(''),
});

// Cruise Extras validation
export const cruiseExtrasSchema = z.object({
  tips: z.string().max(500).default(''),
  beverages: z.string().max(500).default(''),
  wifi: z.string().max(500).default(''),
  excursions: z.string().max(500).default(''),
  specialDining: z.string().max(500).default(''),
  spa: z.string().max(500).default(''),
  other: z.string().max(1000).default(''),
});

// Cruise validation
export const cruiseSchema = z.object({
  id: z.string().max(100),
  shipName: z.string().max(200).default(''),
  company: z.string().max(200).default(''),
  cabinType: z.string().max(100).default(''),
  cabinNumber: z.string().max(50).default(''),
  deck: z.string().max(50).default(''),
  embarkationPort: z.string().max(200).default(''),
  embarkationDate: z.string().max(50).default(''),
  disembarkationPort: z.string().max(200).default(''),
  disembarkationDate: z.string().max(50).default(''),
  nights: z.number().min(0).max(365).default(0),
  regime: z.string().max(100).default(''),
  itinerary: z.array(cruisePortSchema).max(50).default([]),
  extras: cruiseExtrasSchema.default({}),
  notes: z.string().max(2000).default(''),
});

// Insurance validation
export const insuranceSchema = z.object({
  company: z.string().max(200).default(''),
  plan: z.string().max(200).default(''),
  coverage: z.string().max(500).default(''),
  notes: z.string().max(2000).default(''),
}).partial();

// Pricing validation
export const pricingSchema = z.object({
  totalPrice: z.number().min(0).max(99999999).default(0),
  pricePerPerson: z.number().min(0).max(99999999).default(0),
  taxes: z.number().min(0).max(99999999).default(0),
  paymentMethod: z.string().max(200).default(''),
  conditions: z.string().max(5000).default(''),
  observations: z.string().max(5000).default(''),
}).partial();

// Itinerary day validation
export const itineraryDaySchema = z.object({
  id: z.string().max(100),
  dayNumber: z.number().min(0).max(365).default(0),
  date: z.string().max(50).default(''),
  title: z.string().max(300).default(''),
  description: z.string().max(5000).default(''),
  activities: z.array(z.string().max(500)).max(50).default([]),
});

// Cover validation
export const coverSchema = z.object({
  title: z.string().max(200).default('PRESUPUESTO DE VIAJE'),
  subtitle: z.string().max(300).default(''),
  imageUrl: safeUrlSchema.default(''),
});

// Trip validation
export const tripSchema = z.object({
  destination: z.string().max(200).default(''),
  startDate: z.string().max(50).default(''),
  endDate: z.string().max(50).default(''),
  travelers: z.number().min(1).max(100).default(1),
  currency: z.string().max(10).default('USD'),
  type: z.enum(['standard', 'cruise', 'multiDestination']).optional(),
});

// Full Quote validation
export const quoteSchema = z.object({
  id: z.string().max(100),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  templateId: z.string().max(100).default('default'),
  client: clientSchema,
  trip: tripSchema,
  cover: coverSchema,
  flights: z.array(flightSchema).max(50).default([]),
  lodging: lodgingSchema.default({}),
  lodgings: z.array(lodgingSchema).max(20).optional(),
  transfers: z.array(transferSchema).max(50).default([]),
  trains: z.array(trainSchema).max(50).optional(),
  ferries: z.array(ferrySchema).max(50).optional(),
  rentalCars: z.array(rentalCarSchema).max(20).optional(),
  activities: z.array(activitySchema).max(100).optional(),
  cruise: cruiseSchema.optional(),
  insurance: insuranceSchema.default({}),
  pricing: pricingSchema.default({}),
  itineraryDays: z.array(itineraryDaySchema).max(100).default([]),
});

// WhatsApp Agent validation
export const whatsappAgentSchema = z.object({
  name: z.string().max(100).default(''),
  phone: z.string().max(50).default(''),
});

// Color validation (hex or hsl)
const colorSchema = z.string().max(50).default('');
const optionalColorSchema = z.string().max(50).optional().default('');

// Template validation
export const templateSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(100, 'El nombre es demasiado largo'),
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
    heading: z.string().max(100).default('Playfair Display'),
    body: z.string().max(100).default('Inter'),
  }),
  styles: z.object({
    borderRadius: z.string().max(50).default('12px'),
    cardShadow: z.boolean().default(true),
    separatorStyle: z.enum(['line', 'dots', 'gradient', 'decorative', 'none']).default('line'),
    borderStyle: z.enum(['none', 'solid', 'dashed', 'double', 'decorative']).default('none'),
    borderWidth: z.string().max(20).default('1px'),
    backgroundPattern: z.enum(['none', 'dots', 'lines', 'grid', 'waves']).default('none'),
    cardStyle: z.enum(['flat', 'elevated', 'outlined', 'glass']).default('elevated'),
  }),
  whatsappAgents: z.array(whatsappAgentSchema).max(20).default([]),
  footerText: z.string().max(500).default(''),
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
