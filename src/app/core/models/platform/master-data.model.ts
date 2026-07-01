// ─────────────────────────────────────────────────────────────
// PLATFORM · Master Data (Configuration over Code)
// ─────────────────────────────────────────────────────────────
// Every value the PRD lists as "manageable from the dashboard"
// lives here as data — never as a hardcoded literal in a component.
// A single generic collection shape powers a single generic CRUD
// screen, so adding a new lookup domain requires *zero* new code.

import { AuditableEntity, Localized, TenantScoped } from './common.model';

/**
 * The catalog of reference-data domains. Extending the platform with a
 * new lookup list means adding one entry here — the admin UI, service
 * and security rules all key off this enum generically.
 */
export enum MasterDataDomain {
  Provinces = 'provinces',
  Cities = 'cities',
  Villages = 'villages',
  Nationalities = 'nationalities',
  EducationStages = 'educationStages',
  StudyYears = 'studyYears',
  MemorizationLevels = 'memorizationLevels',
  ProgramTypes = 'programTypes',
  AwardTypes = 'awardTypes',
  ExamTypes = 'examTypes',
  Categories = 'categories',
  ExclusionReasons = 'exclusionReasons',
  RegistrationStatuses = 'registrationStatuses',
  ProgramStatuses = 'programStatuses',
  StudentStatuses = 'studentStatuses',
}

/**
 * A single reference-data entry. `parentId` models hierarchical lookups
 * (province → city → village) without extra collections. `metadata`
 * carries domain-specific extras (e.g. a mosque's geo-location) while
 * keeping the shared shape stable.
 */
export interface MasterDataItem extends AuditableEntity, TenantScoped {
  readonly domain: MasterDataDomain;
  readonly code: string;
  readonly name: Localized;
  /** Sort weight for deterministic ordering in dropdowns. */
  readonly order: number;
  readonly isActive: boolean;
  /** References another `MasterDataItem.id` for cascading lists. */
  readonly parentId?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
}

/** Human-facing labels + icons for each domain, used by the generic UI. */
export interface MasterDataDomainMeta {
  readonly domain: MasterDataDomain;
  readonly label: Localized;
  readonly icon: string;
  /** Domain this one cascades from (enables the parent picker in the UI). */
  readonly parentDomain?: MasterDataDomain;
}

export const MASTER_DATA_DOMAINS: readonly MasterDataDomainMeta[] = [
  { domain: MasterDataDomain.Provinces, label: { ar: 'المحافظات', en: 'Provinces' }, icon: 'map' },
  { domain: MasterDataDomain.Cities, label: { ar: 'المدن', en: 'Cities' }, icon: 'location_city', parentDomain: MasterDataDomain.Provinces },
  { domain: MasterDataDomain.Villages, label: { ar: 'القرى', en: 'Villages' }, icon: 'holiday_village', parentDomain: MasterDataDomain.Cities },
  { domain: MasterDataDomain.Nationalities, label: { ar: 'الجنسيات', en: 'Nationalities' }, icon: 'public' },
  { domain: MasterDataDomain.EducationStages, label: { ar: 'المراحل الدراسية', en: 'Education Stages' }, icon: 'school' },
  { domain: MasterDataDomain.StudyYears, label: { ar: 'السنوات الدراسية', en: 'Study Years' }, icon: 'calendar_month', parentDomain: MasterDataDomain.EducationStages },
  { domain: MasterDataDomain.MemorizationLevels, label: { ar: 'مستويات الحفظ', en: 'Memorization Levels' }, icon: 'menu_book' },
  { domain: MasterDataDomain.ProgramTypes, label: { ar: 'أنواع البرامج', en: 'Program Types' }, icon: 'category' },
  { domain: MasterDataDomain.AwardTypes, label: { ar: 'أنواع الجوائز', en: 'Award Types' }, icon: 'emoji_events' },
  { domain: MasterDataDomain.ExamTypes, label: { ar: 'أنواع الاختبارات', en: 'Exam Types' }, icon: 'quiz' },
  { domain: MasterDataDomain.Categories, label: { ar: 'الفئات', en: 'Categories' }, icon: 'workspaces' },
  { domain: MasterDataDomain.ExclusionReasons, label: { ar: 'أسباب الاستبعاد', en: 'Exclusion Reasons' }, icon: 'block' },
  { domain: MasterDataDomain.RegistrationStatuses, label: { ar: 'حالات التسجيل', en: 'Registration Statuses' }, icon: 'how_to_reg' },
  { domain: MasterDataDomain.ProgramStatuses, label: { ar: 'حالات البرنامج', en: 'Program Statuses' }, icon: 'flag' },
  { domain: MasterDataDomain.StudentStatuses, label: { ar: 'حالات الطالب', en: 'Student Statuses' }, icon: 'person_pin' },
];

export type MasterDataCreate = Omit<
  MasterDataItem,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>;
