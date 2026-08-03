import { inject } from '@angular/core';
import { CanActivateFn, Router, } from '@angular/router';
import { AuthService } from '../auth/auth';

function allow(permissions: string[]) {
	const auth = inject(AuthService);
	const router = inject(Router);
	return auth.hasAnyPermission([
		'system.all',
		...permissions,
	]) ? true : router.createUrlTree(['/dashboard',]);
}

export const agreementViewGuard:
CanActivateFn = () => allow([
	'agreements.view.own',
	'agreements.view.department',
	'agreements.view.all',
]);

export const agreementCreateGuard: CanActivateFn = () => allow([
	'agreements.create',
]);

export const agreementEditGuard: CanActivateFn = () => allow([
	'agreements.edit',
]);

export const agreementDocumentTypeGuard: CanActivateFn = () => allow([
	'agreements.document-types.manage',
]);