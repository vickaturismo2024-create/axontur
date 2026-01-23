import { useMemo } from 'react';
import { Lodging, LodgingGroup } from '@/types/quote';

// Normalize destination string for comparison
function normalizeDestination(destination: string): string {
  return destination
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim();
}

// Check if two destinations are similar
function areDestinationsSimilar(dest1: string, dest2: string): boolean {
  const norm1 = normalizeDestination(dest1);
  const norm2 = normalizeDestination(dest2);
  
  // Exact match after normalization
  if (norm1 === norm2) return true;
  
  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Simple word overlap check
  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
  
  const commonWords = words1.filter(w => words2.includes(w));
  if (commonWords.length > 0) return true;
  
  return false;
}

// Check if lodgings are for same dates
function areSameDates(l1: Lodging, l2: Lodging): boolean {
  return l1.checkIn === l2.checkIn && l1.checkOut === l2.checkOut;
}

// Check if lodgings have same number of nights
function areSameNights(l1: Lodging, l2: Lodging): boolean {
  return l1.nights === l2.nights;
}

export interface LodgingGroupResult {
  groups: LodgingGroup[];
  groupedLodgings: Map<string, Lodging[]>;
  ungroupedLodgings: Lodging[];
  suggestGroups: (lodgings: Lodging[]) => LodgingGroup[];
}

export function useLodgingGroups(lodgings: Lodging[]): LodgingGroupResult {
  return useMemo(() => {
    // Filter only option lodgings for grouping
    const optionLodgings = lodgings.filter(l => l.isOption);
    
    // Build groups based on existing groupId
    const existingGroups = new Map<string, Lodging[]>();
    const ungrouped: Lodging[] = [];
    
    optionLodgings.forEach(lodging => {
      if (lodging.groupId) {
        const group = existingGroups.get(lodging.groupId) || [];
        group.push(lodging);
        existingGroups.set(lodging.groupId, group);
      } else {
        ungrouped.push(lodging);
      }
    });
    
    // Build LodgingGroup objects from existing groups
    const groups: LodgingGroup[] = [];
    existingGroups.forEach((lodgingsInGroup, groupId) => {
      if (lodgingsInGroup.length > 0) {
        const first = lodgingsInGroup[0];
        groups.push({
          id: groupId,
          destination: first.destination || '',
          checkIn: first.checkIn || '',
          checkOut: first.checkOut || '',
          nights: first.nights || 0,
          optionIds: lodgingsInGroup.map(l => l.id || '').filter(Boolean),
        });
      }
    });
    
    // Function to suggest groups based on similarity
    const suggestGroups = (lodgingsToGroup: Lodging[]): LodgingGroup[] => {
      const options = lodgingsToGroup.filter(l => l.isOption);
      if (options.length < 2) return [];
      
      const suggested: LodgingGroup[] = [];
      const processed = new Set<string>();
      
      options.forEach((lodging, i) => {
        if (processed.has(lodging.id || '')) return;
        
        const similar: Lodging[] = [lodging];
        processed.add(lodging.id || '');
        
        // Find similar lodgings
        options.slice(i + 1).forEach(other => {
          if (processed.has(other.id || '')) return;
          
          const sameDestination = areDestinationsSimilar(
            lodging.destination || lodging.name,
            other.destination || other.name
          );
          const sameDates = areSameDates(lodging, other);
          const sameNights = areSameNights(lodging, other);
          
          // Must match at least dates and nights, or destination + nights
          if ((sameDates && sameNights) || (sameDestination && sameNights)) {
            similar.push(other);
            processed.add(other.id || '');
          }
        });
        
        // Create group if we found similar lodgings
        if (similar.length > 1) {
          const first = similar[0];
          suggested.push({
            id: crypto.randomUUID(),
            destination: first.destination || '',
            checkIn: first.checkIn || '',
            checkOut: first.checkOut || '',
            nights: first.nights || 0,
            optionIds: similar.map(l => l.id || '').filter(Boolean),
          });
        }
      });
      
      return suggested;
    };
    
    return {
      groups,
      groupedLodgings: existingGroups,
      ungroupedLodgings: ungrouped,
      suggestGroups,
    };
  }, [lodgings]);
}

// Helper to apply suggested groups to lodgings
export function applyLodgingGroups(
  lodgings: Lodging[],
  groups: LodgingGroup[]
): Lodging[] {
  const idToGroupId = new Map<string, string>();
  
  groups.forEach(group => {
    group.optionIds.forEach(id => {
      idToGroupId.set(id, group.id);
    });
  });
  
  return lodgings.map(l => ({
    ...l,
    groupId: l.id ? idToGroupId.get(l.id) || l.groupId : l.groupId,
  }));
}

// Helper to get lodgings organized by groups
export function organizeLodgingsByGroups(
  lodgings: Lodging[],
  groups: LodgingGroup[]
): { grouped: Map<string, { group: LodgingGroup; lodgings: Lodging[] }>; ungrouped: Lodging[] } {
  const grouped = new Map<string, { group: LodgingGroup; lodgings: Lodging[] }>();
  const ungrouped: Lodging[] = [];
  
  // Initialize groups
  groups.forEach(group => {
    grouped.set(group.id, { group, lodgings: [] });
  });
  
  // Sort lodgings into groups
  lodgings.filter(l => l.isOption).forEach(lodging => {
    if (lodging.groupId && grouped.has(lodging.groupId)) {
      grouped.get(lodging.groupId)!.lodgings.push(lodging);
    } else {
      ungrouped.push(lodging);
    }
  });
  
  return { grouped, ungrouped };
}
