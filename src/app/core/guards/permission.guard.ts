import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthorizationService } from '../services/authorization.service';
import { Permission } from '../models/platform/permission.model';

/**
 * Route guard factory — protects a route by required permission(s)
 * rather than by role, so routing stays decoupled from the RBAC policy.
 *
 * @param perms   permissions required to enter the route
 * @param mode    'any' (default) ⇒ at least one; 'all' ⇒ every permission
 */
export function requirePermission(
  perms: Permission | readonly Permission[],
  mode: 'any' | 'all' = 'any',
): CanActivateFn {
  const required = Array.isArray(perms) ? perms : [perms as Permission];
  return () => {
    const authz = inject(AuthorizationService);
    const router = inject(Router);
    const allowed = mode === 'all' ? authz.canAll(required) : authz.canAny(required);
    return allowed ? true : router.createUrlTree(['/login']);
  };
}
