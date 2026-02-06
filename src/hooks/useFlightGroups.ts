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

export interface FlightGroupResult {
  groups: FlightGroup[];
  groupedFlights: Map<string, Flight[]>;
  ungroupedFlights: Flight[];
  mainFlights: Flight[];
  optionFlights: Flight[];
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
