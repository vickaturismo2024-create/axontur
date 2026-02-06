import { useMemo } from 'react';
import { Flight, FlightGroup } from '@/types/quote';

// Normalize route string for comparison
function normalizeRoute(origin: string, destination: string): string {
  return `${origin.toLowerCase().trim()}-${destination.toLowerCase().trim()}`;
}

// Check if two flights have the same route
function areSameRoute(f1: Flight, f2: Flight): boolean {
  return normalizeRoute(f1.origin, f1.destination) === normalizeRoute(f2.origin, f2.destination);
}

// Check if two flights are on the same date
function areSameDate(f1: Flight, f2: Flight): boolean {
  return f1.date === f2.date;
}

// Representa una opción de vuelo que puede contener múltiples tramos (conexiones)
export interface FlightOptionDisplay {
  id: string;
  flights: Flight[]; // Todos los tramos (1 para vuelo directo, 2+ para conexiones)
  isConnectionGroup: boolean;
  connectionLabel?: string; // "EZE → MIA → CUN"
  optionLabel: string;
  flightType: 'direct' | 'stopover' | 'charter';
  luggage?: string;
  totalPrice: number;
  totalCost: number;
}

export interface FlightGroupResult {
  groups: FlightGroup[];
  groupedFlights: Map<string, Flight[]>;
  ungroupedFlights: Flight[];
  mainFlights: Flight[];
  optionFlights: Flight[];
  // NUEVO: Opciones de vuelo procesadas (agrupa conexiones como una sola opción)
  flightOptions: FlightOptionDisplay[];
  suggestGroups: (flights: Flight[]) => FlightGroup[];
}

export function useFlightGroups(flights: Flight[]): FlightGroupResult {
  return useMemo(() => {
    // Separate main flights from option flights
    const mainFlights = flights.filter(f => !f.isOption);
    const optionFlights = flights.filter(f => f.isOption);
    
    // Build groups based on existing groupId
    const existingGroups = new Map<string, Flight[]>();
    const ungrouped: Flight[] = [];
    
    optionFlights.forEach(flight => {
      if (flight.groupId) {
        const group = existingGroups.get(flight.groupId) || [];
        group.push(flight);
        existingGroups.set(flight.groupId, group);
      } else {
        ungrouped.push(flight);
      }
    });
    
    // Build FlightGroup objects from existing groups
    const groups: FlightGroup[] = [];
    existingGroups.forEach((flightsInGroup, groupId) => {
      if (flightsInGroup.length > 0) {
        const first = flightsInGroup[0];
        groups.push({
          id: groupId,
          origin: first.origin || '',
          destination: first.destination || '',
          date: first.date || '',
          optionIds: flightsInGroup.map(f => f.id).filter(Boolean),
        });
      }
    });

    // =====================================================
    // NUEVO: Construir flightOptions agrupando por connectionGroupId
    // =====================================================
    const flightOptions: FlightOptionDisplay[] = [];
    const connectionGroups = new Map<string, Flight[]>();
    const standaloneOptions: Flight[] = [];

    // Separar vuelos opcionales por connectionGroupId
    for (const flight of optionFlights) {
      if (flight.connectionGroupId) {
        const group = connectionGroups.get(flight.connectionGroupId) || [];
        group.push(flight);
        connectionGroups.set(flight.connectionGroupId, group);
      } else {
        standaloneOptions.push(flight);
      }
    }

    // Procesar grupos de conexión (escalas)
    for (const [groupId, groupFlights] of connectionGroups) {
      // Ordenar por fecha y hora
      groupFlights.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.departureTime.localeCompare(b.departureTime);
      });

      // Construir label de conexión: "EZE → MIA → CUN"
      const origins = groupFlights.map(f => f.origin);
      const lastDest = groupFlights[groupFlights.length - 1].destination;
      const connectionLabel = [...origins, lastDest].join(' → ');

      const firstFlight = groupFlights[0];
      const totalPrice = groupFlights.reduce((sum, f) => sum + (f.price || 0), 0);
      const totalCost = groupFlights.reduce((sum, f) => sum + (f.cost || 0), 0);

      flightOptions.push({
        id: groupId,
        flights: groupFlights,
        isConnectionGroup: true,
        connectionLabel,
        optionLabel: firstFlight.optionLabel || 'Opción con escala',
        flightType: 'stopover',
        luggage: firstFlight.luggage || groupFlights.find(f => f.luggage)?.luggage,
        totalPrice,
        totalCost,
      });
    }

    // Procesar vuelos individuales (sin conexión)
    for (const flight of standaloneOptions) {
      flightOptions.push({
        id: flight.id,
        flights: [flight],
        isConnectionGroup: false,
        optionLabel: flight.optionLabel || 'Opción de vuelo',
        flightType: flight.flightType || 'direct',
        luggage: flight.luggage,
        totalPrice: flight.price || 0,
        totalCost: flight.cost || 0,
      });
    }
    
    // Function to suggest groups based on similarity
    const suggestGroups = (flightsToGroup: Flight[]): FlightGroup[] => {
      const options = flightsToGroup.filter(f => f.isOption);
      if (options.length < 2) return [];
      
      const suggested: FlightGroup[] = [];
      const processed = new Set<string>();
      
      options.forEach((flight, i) => {
        if (processed.has(flight.id)) return;
        
        const similar: Flight[] = [flight];
        processed.add(flight.id);
        
        // Find similar flights (same route and date)
        options.slice(i + 1).forEach(other => {
          if (processed.has(other.id)) return;
          
          const sameRoute = areSameRoute(flight, other);
          const sameDate = areSameDate(flight, other);
          
          // Must match both route and date
          if (sameRoute && sameDate) {
            similar.push(other);
            processed.add(other.id);
          }
        });
        
        // Create group if we found similar flights
        if (similar.length > 1) {
          const first = similar[0];
          suggested.push({
            id: crypto.randomUUID(),
            origin: first.origin || '',
            destination: first.destination || '',
            date: first.date || '',
            optionIds: similar.map(f => f.id).filter(Boolean),
          });
        }
      });
      
      return suggested;
    };
    
    return {
      groups,
      groupedFlights: existingGroups,
      ungroupedFlights: ungrouped,
      mainFlights,
      optionFlights,
      flightOptions,
      suggestGroups,
    };
  }, [flights]);
}

// Helper to apply suggested groups to flights
export function applyFlightGroups(
  flights: Flight[],
  groups: FlightGroup[]
): Flight[] {
  const idToGroupId = new Map<string, string>();
  
  groups.forEach(group => {
    group.optionIds.forEach(id => {
      idToGroupId.set(id, group.id);
    });
  });
  
  return flights.map(f => ({
    ...f,
    groupId: idToGroupId.get(f.id) || f.groupId,
  }));
}

// Helper to get flights organized by groups
export function organizeFlightsByGroups(
  flights: Flight[],
  groups: FlightGroup[]
): { grouped: Map<string, { group: FlightGroup; flights: Flight[] }>; ungrouped: Flight[] } {
  const grouped = new Map<string, { group: FlightGroup; flights: Flight[] }>();
  const ungrouped: Flight[] = [];
  
  // Initialize groups
  groups.forEach(group => {
    grouped.set(group.id, { group, flights: [] });
  });
  
  // Sort flights into groups
  flights.filter(f => f.isOption).forEach(flight => {
    if (flight.groupId && grouped.has(flight.groupId)) {
      grouped.get(flight.groupId)!.flights.push(flight);
    } else {
      ungrouped.push(flight);
    }
  });
  
  return { grouped, ungrouped };
}
