import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
export const sheikhGuard: CanActivateFn = () => {
  const a = inject(AuthService), r = inject(Router);
  return (a.isSheikh() || a.isAdmin()) ? true : r.createUrlTree(['/login']);
};
