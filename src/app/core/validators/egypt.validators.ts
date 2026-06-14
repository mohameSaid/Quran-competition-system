import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CompetitionCategory } from '../models';

/** Egyptian mobile — 01 + 9 digits (11 total) */
export const EGYPT_MOBILE_PATTERN = /^01\d{9}$/;

export function egyptMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    return EGYPT_MOBILE_PATTERN.test(v) ? null : { egyptMobile: true };
  };
}

/** Required Egyptian mobile */
export function requiredEgyptMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return { required: true };
    return EGYPT_MOBILE_PATTERN.test(v) ? null : { egyptMobile: true };
  };
}

/** Optional — validate format only when filled */
export function optionalEgyptMobileValidator(): ValidatorFn {
  return egyptMobileValidator();
}

export function categoryFromJuz(juz: number): CompetitionCategory {
  if (juz >= 30) return 'full30';
  if (juz >= 15) return 'half15';
  if (juz >= 10) return 'ten10';
  return 'five5';
}

export function formatEgyptDate(value: unknown): string {
  if (!value) return '—';
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === 'object' && value !== null) {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === 'function') d = v.toDate();
    else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
  }
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const PREVIOUS_LEVEL_OPTIONS = [
  'لم أشارك من قبل',
  '3 أجزاء',
  '5 أجزاء',
  '7 أجزاء',
  '10 أجزاء',
  '15 جزءاً',
  '20 جزءاً',
  '25 جزءاً',
  '30 جزءاً (كامل)',
] as const;
