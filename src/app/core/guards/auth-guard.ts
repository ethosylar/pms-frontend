import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth';
import { catchError, map, of, switchMap, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) return router.parseUrl('/login');

  return auth.user$.pipe(
    take(1),
    switchMap(user => user ? of(true) : auth.me().pipe(map(() => true))),
    catchError(() => of(router.parseUrl('/login')))
  );
};
