// ─────────────────────────────────────────────────────────────
// PLATFORM · Person (the core entity — "Person First")
// ─────────────────────────────────────────────────────────────
// All data hangs off a Person, not off a program or competition.
// One human = one Person document = one unified record, regardless of
// how many roles they hold or programs they join over the years.

import { AuditableEntity, TenantScoped } from './common.model';

export enum Gender {
  Male = 'male',
  Female = 'female',
}

export enum PersonStatus {
  Active = 'active',
  Inactive = 'inactive',
  Blocked = 'blocked',
}

/** Communication channels — a list so a person may have several. */
export interface ContactChannel {
  readonly type: 'mobile' | 'whatsapp' | 'email' | 'landline';
  readonly value: string;
  readonly isPrimary: boolean;
  readonly isVerified: boolean;
}

/** Address built from Master Data references (province/city/village). */
export interface PersonAddress {
  readonly provinceId?: string;
  readonly cityId?: string;
  readonly villageId?: string;
  readonly line?: string;
}

/**
 * The unified person record.
 *
 * `nationalId` is optional at the platform level (non-Egyptian users,
 * children) but, when present, is the natural key used for de-duplication
 * and from which the birth date can be derived. Sensitive identifiers are
 * kept minimal here and protected by security rules.
 */
export interface Person extends AuditableEntity, TenantScoped {
  readonly fullName: string;
  readonly gender: Gender;
  readonly birthDate?: Date;
  readonly nationalId?: string;
  readonly nationalityId?: string;
  readonly motherName?: string;
  readonly address?: PersonAddress;
  readonly contacts: readonly ContactChannel[];
  readonly status: PersonStatus;
  /** Cached list of active role types for cheap filtering/badges. */
  readonly roles: readonly string[];
  /** Firebase Auth uid, once the person has a login account. */
  readonly accountUid?: string;
  readonly photoPath?: string;
  /** Free-form searchable tokens (name parts) for prefix search. */
  readonly searchTokens?: readonly string[];
}

export type PersonCreate = Omit<
  Person,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'roles'
>;
