import { ChangeDetectorRef,	Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiCollection,	ApiService, PermissionDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-permissions',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './permissions.html',
	styleUrls: ['./permissions.scss'],
})
export class PermissionsComponent implements OnInit {
	loading = false;
	error: string | null = null;
	
	rows: PermissionDto[] = [];
	
	search = '';
	moduleFilter = '';
	isActiveFilter: '' | '1' | '0' = '';
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getPermissions({
			search: this.search || undefined,
			module: this.moduleFilter || undefined,
			is_active:
			this.isActiveFilter === ''
			? undefined
			: Number(this.isActiveFilter),
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
			next: (res: ApiCollection<PermissionDto>) => {
				this.rows = res.data ?? [];
				
				this.total = res.meta?.total ?? this.rows.length;
				this.page = res.meta?.current_page ?? this.page;
				this.lastPage = res.meta?.last_page ?? 1;
				
				this.cdr.detectChanges();
			},
			error: err => {
				console.error(err);
				this.error = 'Failed to load permissions.';
				this.cdr.detectChanges();
			}
		});
	}
	
	onSearchEnter(): void {
		this.page = 1;
		this.fetch();
	}
	
	changePage(page: number): void {
		if (page < 1 || page > this.lastPage) {
			return;
		}
		
		this.page = page;
		this.fetch();
	}
	
	confirmDelete(row: PermissionDto): void {
		if (row.code === 'system.all') {
			this.toast.error('system.all permission cannot be deleted.');
			return;
		}
		
		if (!confirm(`Delete permission "${row.code}"?`)) {
			return;
		}
		
		this.api.deletePermission(row.id).subscribe({
			next: res => {
				if (res.mode === 'SOFT') {
					this.toast.success('Permission is in use, so it was deactivated.');
					} else {
					this.toast.success('Permission deleted.');
				}
				
				this.fetch();
			},
			error: err => {
				console.error(err);
				this.toast.error('Failed to delete permission.');
			}
		});
	}
	
	badgeClass(row: PermissionDto): string {
		return row.is_active
		? 'bg-success'
		: 'bg-secondary';
	}
	
	badgeText(row: PermissionDto): string {
		return row.is_active
		? 'Active'
		: 'Inactive';
	}
	
	moduleText(row: PermissionDto): string {
		return row.module || 'General';
	}
}