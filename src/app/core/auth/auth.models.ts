export type RoleName = 'ADMIN' | 'AUDITOR' | 'PMO' | 'PM' | 'STAFF';

export interface ApiRole {
  id: number;
  code: RoleName;   // ✅ use code for checks
  name: string;     // display label (Admin, etc.)
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;

  roles?: ApiRole[]; // ✅ roles from backend
}

export interface MeResponse {
  user: AuthUser;
}
