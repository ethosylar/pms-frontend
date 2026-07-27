import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiCollection, ApiService, UserDto, } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/auth/auth';

@Component({
	standalone: true,
	selector: 'app-admin-users',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './users.html',
	styleUrls: ['./users.scss'],
})
export class UsersComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: UserDto[] = [];
	
	page = 1;
	perPage = 10;
	total = 0;
	lastPage = 1;
	
	search = '';
	
	constructor(
		private api: ApiService,
		private auth: AuthService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	canManageUsers(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'users.manage',
		]);
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getUsers({
			search: this.search || undefined,
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiCollection<UserDto>) => {
				this.rows = res.data ?? [];
				this.total =
				res.meta?.total ??
				this.rows.length;
				this.lastPage =
				res.meta?.last_page ??
				1;
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 403) {
					this.error =
					'You do not have permission to view user management.';
					return;
				}
				
				this.error =
				'Failed to load users.';
			},
		});
	}
	
	onSearchEnter(): void {
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (
			next < 1 ||
			next > this.lastPage
			) {
			return;
		}
		
		this.page = next;
		this.fetch();
	}
	
	roleText(user: UserDto): string {
		const roles = user.roles ?? [];
		
		return roles
		.map(role => role.code)
		.filter(Boolean)
		.join(', ') || '-';
	}
	
	deptText(user: UserDto): string {
		const department = user.department;
		
		if (!department) {
			return '-';
		}
		
		return department.name ||
		department.code ||
		'-';
	}
	
	deleteUser(user: UserDto): void {
		if (!this.canManageUsers()) {
			this.error =
			'You do not have permission to delete users.';
			return;
		}
		
		const confirmed = confirm(
			`Delete user "${user.name}" (${user.email})?\n\n` +
			'Review project ownership, task assignments and audit references before deleting.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.loading = true;
		this.error = null;
		
		this.api.deleteUser(user.id)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				this.error =
				err?.error?.message ||
				'Failed to delete user.';
			},
		});
	}
	
	permissionCount(user: UserDto): number {
		return this.permissionCodes(user).length;
	}
	
	permissionPreview(user: UserDto): string {
		const permissions =
		this.permissionCodes(user);
		
		if (!permissions.length) {
			return '-';
		}
		
		if (permissions.length <= 4) {
			return permissions.join(', ');
		}
		
		return `${permissions.slice(0, 4).join(', ')} +${permissions.length - 4} more`;
	}
	
	private permissionCodes(user: UserDto): string[] {
		return ((user.permissions ?? []) as any[])
		.map(permission => {
			if (typeof permission === 'string') {
				return permission;
			}
			
			return permission?.code;
		})
		.filter((code): code is string => !!code);
	}
}
