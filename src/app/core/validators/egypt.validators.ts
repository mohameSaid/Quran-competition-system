import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Egyptian national ID — 14 digits */
export const EGYPT_NATIONAL_ID_PATTERN = /^\d{14}$/;

/** Egyptian mobile — 01 + 9 digits (11 total) */
export const EGYPT_MOBILE_PATTERN = /^01\d{9}$/;

export function egyptNationalIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    return EGYPT_NATIONAL_ID_PATTERN.test(v) ? null : { egyptNationalId: true };
  };
}

export function egyptMobileValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    return EGYPT_MOBILE_PATTERN.test(v) ? null : { egyptMobile: true };
  };
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
