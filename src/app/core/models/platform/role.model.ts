// ─────────────────────────────────────────────────────────────
// PLATFORM · Roles (Person-First, multi-role)
// ─────────────────────────────────────────────────────────────
// A Person is the core entity; a Role is something a Person *has*,
// possibly several at once and possibly changing over time. Role data
// that only makes sense for that role (e.g. a memorizer's approval
// state) lives in a Role Profile, keeping the Person document lean.

import { AuditableEntity, TenantScoped } from './common.model';

/**
 * The role catalog. New roles (the PRD's "extensible roles") are added
 * here; permissions are mapped separately in the RBAC layer, so a role
 * never carries hardcoded capabilities.
 */
export enum RoleType {
  SuperAdmin = 'superAdmin',
  CompetitionAdmin = 'competitionAdmin',
  CenterAdmin = 'centerAdmin',
  Supervisor = 'supervisor',
  Evaluator = 'evaluator',
  Memorizer = 'memorizer',
  Teacher = 'teacher',
  Student = 'student',
  Parent = 'parent',
  Volunteer = 'volunteer',
  Viewer = 'viewer',
}

export const ROLE_LABELS: Readonly<Record<RoleType, string>> = {
  [RoleType.SuperAdmin]: 'مدير النظام',
  [RoleType.CompetitionAdmin]: 'مدير المسابقات',
  [RoleType.CenterAdmin]: 'مدير مركز التحفيظ',
  [RoleType.Supervisor]: 'مشرف',
  [RoleType.Evaluator]: 'محكّم',
  [RoleType.Memorizer]: 'محفّظ',
  [RoleType.Teacher]: 'معلّم',
  [RoleType.Student]: 'طالب',
  [RoleType.Parent]: 'ولي أمر',
  [RoleType.Volunteer]: 'متطوّع',
  [RoleType.Viewer]: 'مشاهد',
};

/** Roles a member of the public may self-select during registration. */
export const SELF_REGISTERABLE_ROLES: readonly RoleType[] = [
  RoleType.Student,
  RoleType.Memorizer,
  RoleType.Teacher,
  RoleType.Parent,
  RoleType.Volunteer,
];

/** Lifecycle of a role assignment — some roles require admin approval. */
export enum RoleAssignmentStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Revoked = 'revoked',
}

/**
 * The link between a Person and a Role. Stored under
 * `persons/{personId}/roles/{roleType}` so a person's roles are a
 * cheap subcollection read and each can be governed independently.
 */
export interface RoleAssignment extends AuditableEntity, TenantScoped {
  readonly personId: string;
  readonly role: RoleType;
  readonly status: RoleAssignmentStatus;
  /** Extra permissions granted to this individual beyond their role. */
  readonly extraPermissions?: readonly string[];
  /** Permissions explicitly withheld from this individual. */
  readonly deniedPermissions?: readonly string[];
  /** uid of the approver, when the role required approval. */
  readonly approvedBy?: string;
  readonly approvedAt?: Date;
}

/**
 * Role-specific profile data. One document per role a person holds,
 * keeping the Person entity free of role-coupled fields.
 * `attributes` is deliberately open so new roles need no schema change.
 */
export interface RoleProfile extends AuditableEntity, TenantScoped {
  readonly personId: string;
  readonly role: RoleType;
  readonly attributes: Readonly<Record<string, unknown>>;
}
