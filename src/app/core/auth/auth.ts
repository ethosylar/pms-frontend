import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
	BehaviorSubject,
	Observable,
	of,
	throwError
} from 'rxjs';
import {
	catchError,
	map,
	tap
} from 'rxjs/operators';

import {
	AuthPayload,
	AuthUser,
	LoginResponse,
	MeResponse,
	PermissionCode,
	RoleName
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private tokenKey = 'pms_token';
	private userKey = 'pms_user';
	private rolesKey = 'pms_roles';
	private permissionsKey = 'pms_permissions';
	
	private _user$ = new BehaviorSubject<AuthUser | null>(this.readUser());
	user$ = this._user$.asObservable();
	
	private _roles$ = new BehaviorSubject<string[]>(this.readStringArray(this.rolesKey));
	roles$ = this._roles$.asObservable();
	
	private _permissions$ = new BehaviorSubject<string[]>(
		this.readStringArray(this.permissionsKey)
	);
	permissions$ = this._permissions$.asObservable();
	
	constructor(private http: HttpClient) {}
	
	initSession(): void {
		if (!this.getToken()) return;
		
		this.me().subscribe({
			next: () => {},
			error: () => {}
		});
	}
	
	login(login: string, password: string): Observable<AuthUser> {
		return this.http.post<LoginResponse>('/api/login', { login, password }).pipe(
			tap(res => {
				if (res?.token) {
					localStorage.setItem(this.tokenKey, res.token);
				}
			}),
			tap(res => this.setAuthPayload(res)),
			map(res => res.user)
		);
	}
	
	logout() {
		return this.http.post('/api/logout', {}).pipe(
			catchError(() => of(null)),
			tap(() => this.clearLocalAuth())
		);
	}
	
	me(): Observable<AuthUser> {
		return this.http.get<MeResponse>('/api/me').pipe(
			tap(res => this.setAuthPayload(res)),
			map(res => res.user),
			catchError(err => {
				this.clearLocalAuth();
				return throwError(() => err);
			})
		);
	}
	
	ensureUser(): Observable<AuthUser> {
		const user = this._user$.value;
		
		if (user && this.getToken()) {
			return of(user);
		}
		
		return this.me();
	}
	
	getToken(): string | null {
		return localStorage.getItem(this.tokenKey);
	}
	
	isLoggedIn(): boolean {
		return !!this.getToken();
	}
	
	getRoleNames(user: AuthUser | null = this._user$.value): RoleName[] {
		const storedRoles = this._roles$.value;
		
		if (storedRoles.length) {
			return storedRoles;
		}
		
		return (user?.roles ?? [])
		.map(r => r?.code)
		.filter(Boolean);
	}
	
	getPermissionCodes(user: AuthUser | null = this._user$.value): PermissionCode[] {
		const storedPermissions = this._permissions$.value;
		
		if (storedPermissions.length) {
			return storedPermissions;
		}
		
		return user?.permissions ?? [];
	}
	
	hasAnyRole(allowed: RoleName[]): boolean {
		const roles = this.getRoleNames();
		return allowed.some(role => roles.includes(role));
	}
	
	hasPermission(permission: PermissionCode): boolean {
		const permissions = this.getPermissionCodes();
		
		return permissions.includes('system.all') ||
		permissions.includes(permission);
	}
	
	hasAnyPermission(required: PermissionCode[]): boolean {
		const permissions = this.getPermissionCodes();
		
		if (permissions.includes('system.all')) {
			return true;
		}
		
		return required.some(permission => permissions.includes(permission));
	}
	
	private setAuthPayload(payload: AuthPayload): void {
		const roles = payload.roles ?? [];
		const permissions = payload.permissions ?? [];
		
		const user: AuthUser = {
			...payload.user,
			permissions,
		};
		
		this._user$.next(user);
		this._roles$.next(roles);
		this._permissions$.next(permissions);
		
		localStorage.setItem(this.userKey, JSON.stringify(user));
		localStorage.setItem(this.rolesKey, JSON.stringify(roles));
		localStorage.setItem(this.permissionsKey, JSON.stringify(permissions));
	}
	
	private readUser(): AuthUser | null {
		try {
			const raw = localStorage.getItem(this.userKey);
			return raw ? JSON.parse(raw) : null;
			} catch {
			return null;
		}
	}
	
	private readStringArray(key: string): string[] {
		try {
			const raw = localStorage.getItem(key);
			const parsed = raw ? JSON.parse(raw) : [];
			return Array.isArray(parsed) ? parsed : [];
			} catch {
			return [];
		}
	}
	
	clearLocalAuth(): void {
		localStorage.removeItem(this.tokenKey);
		localStorage.removeItem(this.userKey);
		localStorage.removeItem(this.rolesKey);
		localStorage.removeItem(this.permissionsKey);
		
		this._user$.next(null);
		this._roles$.next([]);
		this._permissions$.next([]);
	}
}