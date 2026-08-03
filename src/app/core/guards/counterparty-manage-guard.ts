import { inject } from '@angular/core';
import { CanActivateFn, Router, } from '@angular/router';

import { AuthService } from '../auth/auth';

export const counterpartyManageGuard:
CanActivateFn = () => {
	
	const auth = inject(AuthService);
	
	const router = inject(Router);
	
	const allowed = auth.hasAnyPermission([
		'system.all',
		'agreements.counterparties.manage',
	]);
	
	return allowed ? true : router.createUrlTree(['/dashboard',]);
};