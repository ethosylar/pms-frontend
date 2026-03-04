import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { MeResponse, AuthUser, RoleName } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
	private tokenKey = 'pms_token';
	private userKey = 'pms_user';
	
	private _user$ = new BehaviorSubject<AuthUser | null>(this.readUser());
	user$ = this._user$.asObservable();
	
	constructor(private http: HttpClient) {}
	
	initSession() {
		if (this.getToken()) {
			this.me().subscribe({
				next: () => {},
				error: () => {}
			});
		}
	}
	
	login(login: string, password: string) {
		return this.http.post<any>('/api/login', { login, password }).pipe(
			tap(res => {
				if (res?.token) localStorage.setItem(this.tokenKey, res.token);
			}),
			// after token saved, load /me
			switchMap(() => this.me()),
		);
	}
	
	logout() {
		return this.http.post('/api/logout', {}).pipe(
			catchError(() => of(null)), // even if API fails, proceed to clear locally
			tap(() => this.clearLocalAuth())
		);
	}
	
	me(): Observable<AuthUser> {
		return this.http.get<MeResponse>('/api/me').pipe(
			map(res => res.user),
			tap(user => this.setUser(user)),
			catchError(err => {
				this.clearLocalAuth();
				return throwError(() => err);
			})
		);
	}
	
	getToken(): string | null {
		return localStorage.getItem(this.tokenKey);
	}
	
	isLoggedIn(): boolean {
		return !!this.getToken();
	}
	
	getRoleNames(user: AuthUser | null): RoleName[] {
		const roles = user?.roles ?? [];
		return roles
		.map(r => r?.code)
		.filter(Boolean) as RoleName[];
	}
	
	getRoleLabels(user: AuthUser | null): string[] {
		return (user?.roles ?? []).map(r => r.name);
	}
	
	hasAnyRole(allowed: RoleName[]): boolean {
		const user = this._user$.value;
		const roles = this.getRoleNames(user);
		return allowed.some(a => roles.includes(a));
	}
	
	// ---- local helpers ----
	private setUser(user: AuthUser) {
		this._user$.next(user);
		localStorage.setItem(this.userKey, JSON.stringify(user));
	}
	
	private readUser(): AuthUser | null {
		try {
			const raw = localStorage.getItem(this.userKey);
			return raw ? JSON.parse(raw) : null;
			} catch {
			return null;
		}
	}
	
	clearLocalAuth() {
		localStorage.removeItem(this.tokenKey);
		localStorage.removeItem(this.userKey);
		this._user$.next(null);
	}
}
