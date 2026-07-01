// ─────────────────────────────────────────────────────────────
// PLATFORM · Permissions (flexible RBAC)
// ─────────────────────────────────────────────────────────────
// Permissions are `resource:action` strings. Components/guards check
// *permissions*, never roles, so authorization can be re-mapped from
// configuration without touching feature code (Configuration over Code).

/** Coarse-grained resources the platform protects. */
export enum PermissionResource {
  Person = 'person',
  User = 'user',
  Role = 'role',
  Program = 'program',
  Competition = 'competition',
  Circle = 'circle',
  Mosque = 'mosque',
  Enrollment = 'enrollment',
  Exam = 'exam',
  Attendance = 'attendance',
  Evaluation = 'evaluation',
  Certificate = 'certificate',
  Award = 'award',
  Report = 'report',
  Notification = 'notification',
  MasterData = 'masterData',
  AuditLog = 'auditLog',
  Setting = 'setting',
}

export enum PermissionAction {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Approve = 'approve',
  Publish = 'publish',
  Export = 'export',
  Manage = 'manage', // wildcard action ⇒ all of the above for the resource
}

/** A permission token, e.g. `program:create`. */
export type Permission = `${PermissionResource}:${PermissionAction}`;

export function permission(
  resource: PermissionResource,
  action: PermissionAction,
): Permission {
  return `${resource}:${action}`;
}

/** Grants every action on every resource. Reserved for Super Admin. */
export const WILDCARD_PERMISSION = '*:*' as const;
export type WildcardPermission = typeof WILDCARD_PERMISSION;

export type PermissionGrant = Permission | WildcardPermission;
