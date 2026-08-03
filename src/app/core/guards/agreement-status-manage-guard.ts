import { inject } from '@angular/core';
import { CanActivateFn, Router, } from '@angular/router';
import { catchError, map, of, } from 'rxjs';

import { ApiService } from '../services/api.service';

export const agreementStatusManageGuard:
CanActivateFn = () => {
	const api =
	inject(ApiService);
	
	const router =
	inject(Router);
	
	return api.me()
	.pipe(
		map((response: any) => {
			const principal =
			response?.data?.user ??
			response?.data ??
			response ??
			{};
			
			const permissions =
			principal?.permissions ??
			response?.permissions ??
			[];
			
			const roles =
			principal?.roles ??
			response?.roles ??
			[];
			
			const permissionCodes =
			[
				...(Array.isArray(
					permissions
				)
				? permissions
				: []),
				...(
					Array.isArray(roles)
					? roles.flatMap(
						(role: any) =>
						role?.permissions ??
						[]
					)
					: []
				),
			]
			.map((permission: any) =>
				String(
					typeof permission ===
					'string'
					? permission
					: (
						permission?.code ??
						permission?.name ??
						''
					)
				)
			);
			
			if (
				permissionCodes.includes(
					'system.all'
				) ||
				permissionCodes.includes(
					'agreements.status.manage'
				)
				) {
				return true;
			}
			
			const roleCodes =
			(Array.isArray(roles)
				? roles
			: [])
			.map((role: any) =>
				String(
					typeof role ===
					'string'
					? role
					: (
						role?.code ??
						role?.name ??
						''
					)
				)
				.toUpperCase()
			);
			
			if (
				roleCodes.includes('ADMIN') ||
				roleCodes.includes(
					'AGREEMENT_ADMIN'
				)
				) {
				return true;
			}
			
			return router.createUrlTree([
				'/dashboard',
			]);
		}),
		catchError(() =>
			of(
				router.createUrlTree([
					'/login',
				])
			)
		)
	);
};
