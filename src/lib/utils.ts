import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any, formatStr: string = 'MMM dd, yyyy'): string {
  if (!date) return 'N/A';
  
  try {
    let d: Date;
    
    // Handle Firestore Timestamp
    if (date && typeof date === 'object' && 'seconds' in date) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    return format(d, formatStr);
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Error';
  }
}
