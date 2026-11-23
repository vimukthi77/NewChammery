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

export function getSriLankaDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const d = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return d.toISOString().split('T')[0];
  }
}

export function getSriLankaTimeString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Colombo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    const d = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
    return d.toISOString().substring(11, 16);
  }
}

export function normalizeDate(date: Date | string): Date {
  const dateStr = typeof date === 'string'
    ? (date.includes('T') ? date.split('T')[0] : date.slice(0, 10))
    : getSriLankaDateString(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

export function formatDateString(date: Date | string): string {
  if (typeof date === 'string') {
    return date.includes('T') ? date.split('T')[0] : date.slice(0, 10);
  }
  return getSriLankaDateString(date);
}

export function isPastCutoff(cutoffTimeStr: string, targetDate?: Date | string): boolean {
  if (!cutoffTimeStr) return false;

  const todayStr = getSriLankaDateString(new Date());

  let targetStr = todayStr;
  if (targetDate) {
    if (typeof targetDate === 'string') {
      targetStr = targetDate.includes('T') ? targetDate.split('T')[0] : targetDate.slice(0, 10);
    } else {
      targetStr = getSriLankaDateString(targetDate);
    }
  }

  // If target date is in the past (before today in Sri Lanka)
  if (targetStr < todayStr) {
    return true;
  }
  // If target date is in the future (after today in Sri Lanka)
  if (targetStr > todayStr) {
    return false;
  }

  // Target date is TODAY in Sri Lanka: compare current Sri Lanka time with cutoff time
  const currentSriLankaTime = getSriLankaTimeString(new Date());
  const [cutoffH, cutoffM] = cutoffTimeStr.split(':').map(Number);
  const [nowH, nowM] = currentSriLankaTime.split(':').map(Number);

  const cutoffMinutes = (cutoffH || 0) * 60 + (cutoffM || 0);
  const nowMinutes = (nowH || 0) * 60 + (nowM || 0);

  return nowMinutes >= cutoffMinutes;
}

export function formatCurrency(amount: number, currency = 'LKR'): string {
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

