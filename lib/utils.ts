import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSecurePassword(length = 8): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*';
  
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = upper + lower + digits + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function normalizeDate(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0));
}

export function formatDateString(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function isPastCutoff(cutoffTimeStr: string, targetDate?: Date | string): boolean {
  const now = new Date();
  const target = targetDate ? new Date(targetDate) : new Date();

  // Compare year, month, date
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // If target date is in the past, cutoff is always passed
  if (targetMidnight < todayMidnight) {
    return true;
  }
  // If target date is in the future (tomorrow or later), cutoff is not passed
  if (targetMidnight > todayMidnight) {
    return false;
  }

  // If target date is today, compare hours and minutes
  const [cutoffHours, cutoffMinutes] = cutoffTimeStr.split(':').map(Number);
  const cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cutoffHours || 0, cutoffMinutes || 0, 0);

  return now.getTime() >= cutoffDate.getTime();
}

export function formatCurrency(amount: number, currency = 'LKR'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

