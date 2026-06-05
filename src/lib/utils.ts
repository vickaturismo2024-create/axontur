import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // If it's a timestamp containing T and maybe Z / offsets
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR');
  }
  
  // If it is a YYYY-MM-DD string
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}/${month}/${year}`;
  }

  // Fallback for other formats
  try {
    const date = new Date(dateStr + 'T12:00:00');
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-AR');
    }
  } catch {
    // Ignore and fallback
  }
  return dateStr;
}
