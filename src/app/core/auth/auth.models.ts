export type RoleName = string;
export type PermissionCode = string;

export interface ApiPermission {
	id: number;
	code: string;
	name: string;
	module?: string | null;
	description?: string | null;
	sort_order?: number;
	is_active?: boolean;
}

export interface ApiRole {
	id: number;
	role_id?: number;
	code: string;
	name: string;
	is_active?: boolean;
	permissions?: ApiPermission[];
}

export interface AuthDepartment {
	id: number;
	code?: string;
	name?: string;
}

export interface AuthUser {
	id: number;
	name: string;
	username?: string;
	email: string;
	department?: AuthDepartment | null;
	roles?: ApiRole[];
	permissions?: string[];
}

export interface AuthPayload {
	user: AuthUser;
	roles: string[];
	permissions: string[];
}

export interface LoginResponse extends AuthPayload {
	token: string;
}

export interface MeResponse extends AuthPayload {}