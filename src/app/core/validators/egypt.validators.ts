import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CompetitionCategory, CATEGORY_RANK } from '../models';

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

/** اسم رباعي على الأقل: عدد الكلمات ≥ min (لا يتحقق من الفراغ — اتركه لـ required) */
export function minWordsValidator(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return null;
    const words = v.split(/\s+/).filter(Boolean);
    return words.length >= min ? null : { minWords: { required: min, actual: words.length } };
  };
}

/** الرقم القومي المصري — 14 رقم يبدأ بـ 2 (مواليد القرن 19xx) أو 3 (20xx) */
export const EGYPT_NATIONAL_ID_PATTERN = /^[23]\d{13}$/;

/**
 * استخراج تاريخ الميلاد من الرقم القومي:
 *   [0] قرن (2→19xx، 3→20xx)، [1..2] السنة، [3..4] الشهر، [5..6] اليوم.
 * يُعيد null إذا كان الرقم غير صالح أو التاريخ غير حقيقي (مثل 30 فبراير).
 */
export function parseBirthDateFromNationalId(id: string): Date | null {
  const s = (id ?? '').toString().trim();
  if (!EGYPT_NATIONAL_ID_PATTERN.test(s)) return null;
  const century = s[0] === '2' ? 1900 : 2000;
  const year  = century + Number(s.slice(1, 3));
  const month = Number(s.slice(3, 5));
  const day   = Number(s.slice(5, 7));
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // رفض التواريخ المنزاحة (مثل 31 أبريل ⇒ 1 مايو)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/** الرقم القومي مطلوب + بنية صحيحة + تاريخ ميلاد حقيقي مُستخرج منه */
export function nationalIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').toString().trim();
    if (!v) return { required: true };
    return parseBirthDateFromNationalId(v) ? null : { nationalId: true };
  };
}

/**
 * التحقق من اتساق المستوى المختار (يُطبَّق على الـ FormGroup):
 *  - يجب أن يكون مساوياً لمستوى عدد الأجزاء المحفوظة أو مستوى واحد أعلى
 *    (مثال: 14 جزءاً ⇒ يجوز اختيار 10 أو 15، لا 5 ولا 30).
 *  - ويجب أن يكون "مساوياً أو أعلى" من آخر مستوى أتمّه سابقاً (floorRank)
 *    — يُمرَّر floorRank من نتيجة الربط بالمسابقات السابقة (0 = لا قيد).
 * يُعيد الخطأ على مستوى المجموعة؛ تعرضه الواجهة أسفل حقل المستوى.
 */
export function levelConsistencyValidator(floorRank = 0): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const juz = Number(group.get('juzCount')?.value);
    const cat = group.get('category')?.value as CompetitionCategory | null;
    if (!cat || !juz) return null;
    const bracketRank = CATEGORY_RANK[categoryFromJuz(juz)];
    const chosenRank  = CATEGORY_RANK[cat];
    const minRank = Math.max(bracketRank, floorRank);
    const maxRank = Math.min(bracketRank + 1, 4);
    if (chosenRank < minRank) return { levelTooLow: true };
    if (chosenRank > maxRank) return { levelTooHigh: true };
    return null;
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

/**
 * تحويل وصف المستوى النصّي (من بيانات المسابقات السابقة) إلى فئة المسابقة.
 * يتعامل مع صيغ مثل: "القرآن كاملا"، "30 جزء"، "15 جزءاً"، "10 أجزاء"، "5 أجزاء"، "جزء واحد".
 * يُعيد null إذا تعذّر التعرّف على المستوى.
 */
export function previousLevelToCategory(level: string | null | undefined): CompetitionCategory | null {
  const s = (level ?? '').toString();
  if (!s.trim()) return null;
  if (/كامل|كاملا|كاملاً|٣٠|30/.test(s)) return 'full30';
  if (/١٥|15/.test(s)) return 'half15';
  if (/١٠|10/.test(s)) return 'ten10';
  if (/خمس|٥|(?<!١)5/.test(s)) return 'five5';
  return null;
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
