import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { RoleName } from '../auth/auth.models';

export function roleGuard(allowed: RoleName[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) return router.parseUrl('/login');
    if (!auth.hasAnyRole(allowed)) return router.parseUrl('/dashboard');

    return true;
  };
}
