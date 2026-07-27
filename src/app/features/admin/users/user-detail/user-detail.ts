import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { finalize } from 'rxjs/operators';

import {
	ApiResource,
	ApiService,
	AuditLogDto,
	AuditLogListResponse,
	UserDto,
} from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/auth/auth';

type UserDetailTab = 'details' | 'access' | 'audit';

type UserProfileDto = UserDto & {
	created_at?: string | null;
	updated_at?: string | null;
	email_verified_at?: string | null;
};

type UserAuditLogDto = AuditLogDto & {
	changes?: unknown;
	source?: string | null;
	performed_at?: string | null;
	created_at?: string | null;
};

interface AuditChangeEntry {
	field: string;
	isDiff: boolean;
	from?: unknown;
	to?: unknown;
	value?: unknown;
}

@Component({
	standalone: true,
	selector: 'app-admin-user-detail',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './user-detail.html',
	styleUrls: ['./user-detail.scss'],
})
export class UserDetailComponent implements OnInit {
	activeTab: UserDetailTab = 'details';
	
	loadingUser = true;
	loadingAudit = false;
	
	error: string | null = null;
	auditError: string | null = null;
	
	userId = 0;
	user: UserProfileDto | null = null;
	
	auditRows: UserAuditLogDto[] = [];
	auditLoaded = false;
	auditApiPending = false;
	
	auditPage = 1;
	auditMeta = {
		current_page: 1,
		last_page: 1,
		per_page: 20,
		total: 0,
	};
	
	auditFilters = {
		action: '',
		entity_type: '',
		date_from: '',
		date_to: '',
		per_page: 20,
	};
	
	readonly auditActions = [
		'',
		'LOGIN',
		'LOGOUT',
		'CREATE',
		'UPDATE',
		'DELETE',
		'SYNC',
		'DOWNLOAD',
		'ATTACH',
		'DETACH',
	];
	
	readonly auditEntityTypes = [
		'',
		'AUTH',
		'USER',
		'USER_ROLE',
		'PROJECT',
		'TASK',
		'PROJECT_MILESTONE',
		'PROJECT_BUDGET',
		'FILE',
		'FILE_LINK',
		'EXTERNAL_PERMIT',
		'EPTW_SYNC',
	];
	
	selectedAudit: UserAuditLogDto | null = null;
	selectedAuditEntries: AuditChangeEntry[] = [];
	
	constructor(
		private api: ApiService,
		private auth: AuthService,
		private route: ActivatedRoute,
		private router: Router,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		const rawId = this.route.snapshot.paramMap.get('id');
		const id = Number(rawId);
		
		if (!Number.isInteger(id) || id <= 0) {
			this.error = 'Invalid user ID.';
			this.loadingUser = false;
			return;
		}
		
		this.userId = id;
		this.loadUser();
	}
	
	loadUser(): void {
		this.loadingUser = true;
		this.error = null;
		
		this.api.getUser(this.userId)
		.pipe(
			finalize(() => {
				this.loadingUser = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiResource<UserDto>) => {
				this.user = res.data as UserProfileDto;
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 404) {
					this.error = 'User was not found.';
					return;
				}
				
				if (err?.status === 403) {
					this.error = 'You do not have permission to view this user.';
					return;
				}
				
				this.error = 'Failed to load user details.';
			},
		});
	}
	
	setTab(tab: UserDetailTab): void {
		if (tab === 'audit' && !this.canViewAudit()) {
			return;
		}
		
		this.activeTab = tab;
		
		if (tab === 'audit' && !this.auditLoaded) {
			this.loadAuditLogs(1);
		}
	}
	
	canManageUsers(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'users.manage',
		]);
	}
	
	canViewAudit(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'audit.view',
		]);
	}
	
	editUser(): void {
		if (!this.canManageUsers()) {
			return;
		}
		
		this.router.navigate([
			'/admin/users',
			this.userId,
			'edit',
		]);
	}
	
	backToUsers(): void {
		this.router.navigateByUrl('/admin/users');
	}
	
	userInitials(): string {
		const name = this.user?.name?.trim();
		
		if (!name) {
			return '?';
		}
		
		return name
		.split(/\s+/)
		.slice(0, 2)
		.map(part => part.charAt(0).toUpperCase())
		.join('');
	}
	
	departmentText(): string {
		const department = this.user?.department;
		
		if (!department) {
			return '-';
		}
		
		if (department.code && department.name) {
			return `${department.code} - ${department.name}`;
		}
		
		return department.name || department.code || '-';
	}
	
	roleCodes(): string[] {
		return (this.user?.roles ?? [])
		.map(role => role.code)
		.filter((code): code is string => !!code);
	}
	
	effectivePermissionCodes(): string[] {
		const userPermissions = ((this.user?.permissions ?? []) as any[])
		.map(permission => {
			if (typeof permission === 'string') {
				return permission;
			}
			
			return permission?.code;
		})
		.filter((code): code is string => !!code);
		
		if (userPermissions.length) {
			return Array.from(new Set(userPermissions)).sort();
		}
		
		const rolePermissions = (this.user?.roles ?? [])
		.flatMap(role => role.permissions ?? [])
		.map(permission => permission.code)
		.filter((code): code is string => !!code);
		
		return Array.from(new Set(rolePermissions)).sort();
	}
	
	permissionGroups(): Array<{
		name: string;
		permissions: string[];
		}> {
		const groups = new Map<string, string[]>();
		
		for (const permission of this.effectivePermissionCodes()) {
			const prefix = permission.split('.')[0] || 'other';
			const groupName = this.permissionGroupLabel(prefix);
			
			if (!groups.has(groupName)) {
				groups.set(groupName, []);
			}
			
			groups.get(groupName)!.push(permission);
		}
		
		return Array.from(groups.entries())
		.map(([name, permissions]) => ({
			name,
			permissions: permissions.sort(),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	}
	
	rolePermissionCodes(role: any): string[] {
		return (role?.permissions ?? [])
		.map((permission: any) => {
			if (typeof permission === 'string') {
				return permission;
			}
			
			return permission?.code;
		})
		.filter((code: unknown): code is string => typeof code === 'string')
		.sort();
	}
	
	private normalizeAuditList(
		res: AuditLogListResponse
		): UserAuditLogDto[] {
		const data: unknown = res.data as unknown;
		
		if (Array.isArray(data)) {
			return data as UserAuditLogDto[];
		}
		
		if (
			data &&
			typeof data === 'object' &&
			Array.isArray((data as any).data)
			) {
			return (data as any).data as UserAuditLogDto[];
		}
		
		return [];
	}
	
	loadAuditLogs(page = this.auditPage): void {
		if (!this.canViewAudit()) {
			return;
		}
		
		this.auditPage = page;
		this.loadingAudit = true;
		this.auditError = null;
		this.auditApiPending = false;
		
		this.api.getAuditLogs({
			user_id: this.userId,
			action: this.auditFilters.action || undefined,
			entity_type: this.auditFilters.entity_type || undefined,
			from: this.auditFilters.date_from || undefined,
			to: this.auditFilters.date_to || undefined,
			page: this.auditPage,
			per_page: this.auditFilters.per_page,
		})
		.pipe(
			finalize(() => {
				this.loadingAudit = false;
				this.auditLoaded = true;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: AuditLogListResponse) => {
				this.auditRows = this.normalizeAuditList(res);
				
				this.auditMeta = {
					current_page: res.meta?.current_page ?? 1,
					last_page: res.meta?.last_page ?? 1,
					per_page:
					res.meta?.per_page ??
					this.auditFilters.per_page,
					total:
					res.meta?.total ??
					this.auditRows.length,
				};
				
				this.cdr.detectChanges();
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 403) {
					this.auditError =
					'You do not have permission to view audit activity.';
					return;
				}
				
				this.auditError =
				err?.error?.message ||
				'Failed to load audit activity.';
			},
		});
	}
	
	resetAuditFilters(): void {
		this.auditFilters = {
			action: '',
			entity_type: '',
			date_from: '',
			date_to: '',
			per_page: 20,
		};
		
		this.loadAuditLogs(1);
	}
	
	changeAuditPage(direction: -1 | 1): void {
		const nextPage =
		this.auditMeta.current_page + direction;
		
		if (
			nextPage < 1 ||
			nextPage > this.auditMeta.last_page
			) {
			return;
		}
		
		this.loadAuditLogs(nextPage);
	}
	
	openAuditDetail(log: UserAuditLogDto): void {
		this.selectedAudit = log;
		this.selectedAuditEntries =
		this.makeAuditChangeEntries(log.changes);
	}
	
	closeAuditDetail(): void {
		this.selectedAudit = null;
		this.selectedAuditEntries = [];
	}
	
	auditTimestamp(log: UserAuditLogDto): string | null {
		return log.performed_at ||
		log.created_at ||
		null;
	}
	
	actionBadgeClass(action?: string | null): string {
		switch (String(action ?? '').toUpperCase()) {
			case 'CREATE':
			return 'bg-success';
			
			case 'UPDATE':
			case 'SYNC':
			return 'bg-primary';
			
			case 'DELETE':
			return 'bg-danger';
			
			case 'LOGIN':
			case 'LOGOUT':
			return 'bg-info text-dark';
			
			case 'DOWNLOAD':
			return 'bg-secondary';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	displayValue(value: unknown): string {
		if (value === null || value === undefined || value === '') {
			return '-';
		}
		
		if (typeof value === 'object') {
			try {
				return JSON.stringify(value, null, 2);
				} catch {
				return String(value);
			}
		}
		
		return String(value);
	}
	
	rawAuditChanges(): string {
		if (!this.selectedAudit) {
			return '-';
		}
		
		const parsed = this.parseChanges(
			this.selectedAudit.changes
		);
		
		if (parsed === null) {
			return this.displayValue(
				this.selectedAudit.changes
			);
		}
		
		return JSON.stringify(parsed, null, 2);
	}
	
	private permissionGroupLabel(prefix: string): string {
		const normalized = prefix
		.replace(/[_-]+/g, ' ')
		.trim();
		
		return normalized
		.replace(/\b\w/g, char => char.toUpperCase());
	}
	
	private makeAuditChangeEntries(
		changes: unknown
		): AuditChangeEntry[] {
		const parsed = this.parseChanges(changes);
		
		if (!parsed || Array.isArray(parsed)) {
			return [];
		}
		
		return Object.entries(parsed)
		.map(([field, value]) => {
			if (
				value &&
				typeof value === 'object' &&
				!Array.isArray(value) &&
				(
					Object.prototype.hasOwnProperty.call(
						value,
						'from'
					) ||
					Object.prototype.hasOwnProperty.call(
						value,
						'to'
					)
				)
				) {
				const diff = value as {
					from?: unknown;
					to?: unknown;
				};
				
				return {
					field,
					isDiff: true,
					from: diff.from,
					to: diff.to,
				};
			}
			
			return {
				field,
				isDiff: false,
				value,
			};
		});
	}
	
	private parseChanges(
		changes: unknown
		): Record<string, unknown> | unknown[] | null {
		if (!changes) {
			return null;
		}
		
		if (typeof changes === 'object') {
			return changes as
			| Record<string, unknown>
			| unknown[];
		}
		
		if (typeof changes !== 'string') {
			return null;
		}
		
		try {
			return JSON.parse(changes);
			} catch {
			return null;
		}
	}
}