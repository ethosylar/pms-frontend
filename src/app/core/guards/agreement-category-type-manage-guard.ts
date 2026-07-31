import { inject } from '@angular/core';
import { CanActivateFn, Router, } from '@angular/router';

import { AuthService } from '../auth/auth';

export const agreementCategoryTypeManageGuard:
	CanActivateFn = () => {

	const auth =
		inject(AuthService);

	const router =
		inject(Router);

	const allowed =
		auth.hasAnyPermission([
			'system.all',
			'agreements.categories.manage',
			'agreements.types.manage',
		]);

	return allowed
		? true
		: router.createUrlTree([
			'/dashboard',
		]);
};