import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from '../models';
import { RoleType } from '../models/platform/role.model';
import {
  Permission,
  PermissionAction,
  PermissionGrant,
  PermissionResource,
  WILDCARD_PERMISSION,
} from '../models/platform/permission.model';
import { DEFAULT_ROLE_POLICY } from '../rbac/role-permissions';

/**
 * Central authorization service — the single place that answers
 * "can the current user do X?". Feature code and guards depend on this,
 * never on raw role strings, so the policy can evolve independently.
 *
 * The effective policy is `DEFAULT_ROLE_POLICY` merged with any runtime
 * override loaded into `policyOverride` (e.g. from `rolePolicies/*`),
 * plus per-user `extraPermissions` / `deniedPermissions`.
 */
@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly auth = inject(AuthService);

  /** Bridges the legacy single-role account model onto platform roles. */
  private static readonly LEGACY_ROLE_MAP: Readonly<Record<UserRole, RoleType[]>> = {
    admin: [RoleType.SuperAdmin],
    sheikh: [RoleType.Evaluator],
    public: [RoleType.Viewer],
  };

  /** Runtime policy overrides (admin-editable, config over code). */
  readonly policyOverride = signal<Partial<Record<RoleType, readonly PermissionGrant[]>>>({});
  /** Individual grants beyond the user's roles. */
  readonly extraPermissions = signal<readonly Permission[]>([]);
  /** Individual denials that win over any grant. */
  readonly deniedPermissions = signal<readonly Permission[]>([]);

  /** The current user's effective platform roles. */
  readonly roles: Signal<readonly RoleType[]> = computed(() => {
    const legacy = this.auth.currentUser()?.role;
    return legacy ? AuthorizationService.LEGACY_ROLE_MAP[legacy] : [];
  });

  /** The flattened set of permission tokens the current user holds. */
  readonly permissions: Signal<ReadonlySet<PermissionGrant>> = computed(() => {
    const override = this.policyOverride();
    const set = new Set<PermissionGrant>();
    for (const role of this.roles()) {
      const grants = override[role] ?? DEFAULT_ROLE_POLICY[role] ?? [];
      grants.forEach((g) => set.add(g));
    }
    this.extraPermissions().forEach((p) => set.add(p));
    return set;
  });

  /** True if the user holds `perm` (honoring wildcards and denials). */
  can(perm: Permission): boolean {
    if (this.deniedPermissions().includes(perm)) return false;
    const held = this.permissions();
    if (held.has(WILDCARD_PERMISSION)) return true;
    if (held.has(perm)) return true;
    // `resource:manage` implies every action on that resource.
    const resource = perm.split(':')[0] as PermissionResource;
    return held.has(`${resource}:${PermissionAction.Manage}`);
  }

  canAny(perms: readonly Permission[]): boolean {
    return perms.some((p) => this.can(p));
  }

  canAll(perms: readonly Permission[]): boolean {
    return perms.every((p) => this.can(p));
  }

  hasRole(role: RoleType): boolean {
    return this.roles().includes(role);
  }
}
