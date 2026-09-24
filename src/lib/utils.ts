import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import * as XLSX from 'xlsx';
import { Timestamp } from 'firebase/firestore';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function exportToExcel<T>(data: T[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
  
  // Set column widths
  const maxLengths = data.reduce((acc, item) => {
    Object.keys(item as any).forEach(key => {
      const value = (item as any)[key] ?? '';
      const length = value.toString().length;
      acc[key] = Math.max(acc[key] || 0, length);
    });
    return acc;
  }, {} as {[key: string]: number});

  worksheet['!cols'] = Object.keys(maxLengths).map(key => ({
    wch: Math.max(key.length, maxLengths[key]) + 2, // add a little padding
  }));

  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Generates a unique Ticket ID for fault reports.
 * Format: FLT-XXXXXX (where X is a random digit)
 */
export function generateTicketId(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `FLT-${randomNum}`;
}

/**
 * Universal S/N Normalizer.
 * Handles "040" vs "40" and "MNX 003" vs "3".
 * Returns a clean numeric string if digits are found, otherwise a cleaned alpha string.
 */
export function normalizeSystemNumber(val: string | null | undefined): string {
    if (!val) return '';
    const str = val.toString().trim();
    
    // Extract only digits to check for numeric identity (handles 040 vs 40)
    const digits = str.replace(/\D/g, '');
    if (digits !== '') {
        try {
            // Parse to int to strip leading zeros, then back to string for consistency
            return parseInt(digits, 10).toString();
        } catch (e) {
            return str.toLowerCase().replace(/\s+/g, '');
        }
    }
    
    // If no digits found, just lowercase and remove spaces for alpha-only IDs
    return str.toLowerCase().replace(/\s+/g, '');
}

/**
 * Universal date parser for various Firebase and string formats.
 */
export function parseDate(date: any): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;
  
  // Handle Firestore Timestamp
  if (date instanceof Timestamp) return date.toDate();
  
  // Handle RTDB serialized Timestamp {seconds, nanoseconds}
  if (typeof date === 'object' && 'seconds' in date) {
    return new Date(date.seconds * 1000);
  }
  
  // Handle ISO strings or numeric timestamps
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}
