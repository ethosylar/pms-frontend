import { inject } from '@angular/core';
import {
	CanActivateFn,
	Router
} from '@angular/router';
import {
	catchError,
	map,
	of
} from 'rxjs';

import { AuthService } from '../auth/auth';

export function permissionGuard(required: string[]): CanActivateFn {
	return () => {
		const auth = inject(AuthService);
		const router = inject(Router);
		
		if (!auth.isLoggedIn()) {
			return router.parseUrl('/login');
		}
		
		return auth.ensureUser().pipe(
			map(() => {
				if (!required.length || auth.hasAnyPermission(required)) {
					return true;
				}
				
				return router.parseUrl('/forbidden');
			}),
			catchError(() => of(router.parseUrl('/login')))
		);
	};
}