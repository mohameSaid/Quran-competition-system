// ─────────────────────────────────────────────────────────────
// PLATFORM · Enrollment (Person ↔ Program join)
// ─────────────────────────────────────────────────────────────
// Enrollment connects a Person to a Program in a specific capacity.
// It is the single, uniform way anyone participates in anything, which
// keeps history queryable per-person across all programs and years.

import { AuditableEntity, TenantScoped } from './common.model';
import { RoleType } from './role.model';

export enum EnrollmentStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
  Completed = 'completed',
}

export interface Enrollment extends AuditableEntity, TenantScoped {
  readonly personId: string;
  readonly programId: string;
  readonly programType: string;
  /** The capacity in which the person joins (student, evaluator, ...). */
  readonly asRole: RoleType;
  readonly status: EnrollmentStatus;
  /** Master Data reference (competition category / circle level). */
  readonly categoryId?: string;
  /** Denormalized person name for list rendering without a join. */
  readonly personName: string;
  readonly notes?: string;
}

export type EnrollmentCreate = Omit<
  Enrollment,
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'status'
>;
