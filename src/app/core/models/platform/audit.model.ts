// ─────────────────────────────────────────────────────────────
// PLATFORM · Audit Log (append-only)
// ─────────────────────────────────────────────────────────────
// Immutable trail of security-relevant actions. Never updated or
// deleted (enforced by security rules) to preserve accountability.

import { TenantScoped } from './common.model';

export enum AuditAction {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Login = 'login',
  Logout = 'logout',
  RoleGranted = 'roleGranted',
  RoleRevoked = 'roleRevoked',
  Publish = 'publish',
  Export = 'export',
}

export interface AuditLogEntry extends TenantScoped {
  readonly id: string;
  readonly at: Date;
  readonly actorUid: string;
  readonly actorName: string;
  readonly action: AuditAction;
  readonly resource: string;
  readonly resourceId: string;
  /** Shallow before/after diff, sensitive fields redacted upstream. */
  readonly changes?: Readonly<Record<string, unknown>>;
}
