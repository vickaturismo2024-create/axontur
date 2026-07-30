import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns today (or given date) as YYYY-MM-DD using the device's local timezone */
export function localDateStr(date?: Date): string {
  const d = date || new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Formats a date string for display using the device's locale and timezone */
export function formatDateSafe(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  
  // If it's a timestamp containing T and maybe Z / offsets
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  }
  
  // If it is a YYYY-MM-DD string — parse without timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return date.toLocaleDateString();
  }

  // Fallback for other formats
  try {
    const date = new Date(dateStr + 'T12:00:00');
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
  } catch {
    // Ignore and fallback
  }
  return dateStr;
}
