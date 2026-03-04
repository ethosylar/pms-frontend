import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, RoleDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-roles',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './roles.html',
	styleUrls: ['./roles.scss'],
})
export class RolesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: RoleDto[] = [];
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	search = '';
	isActiveFilter: '' | '1' | '0' = ''; // '' = all
	
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
		
		this.api.getRoles({
			search: this.search || undefined,
			is_active: this.isActiveFilter === '' ? undefined : Number(this.isActiveFilter),
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiCollection<RoleDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load roles.';
				this.cdr.detectChanges();
			}
		});
	}
	
	onSearchEnter(): void {
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (next < 1 || next > this.lastPage) return;
		this.page = next;
		this.fetch();
	}
	
	badgeClass(r: RoleDto): string {
		const active = (r.is_active as unknown) === true || (r.is_active as unknown) === 1;
		return active ? 'bg-success' : 'bg-secondary';
	}
	
	badgeText(r: RoleDto): string {
		const active = (r.is_active as unknown) === true || (r.is_active as unknown) === 1;
		return active ? 'Active' : 'Inactive';
	}
	
	confirmDelete(r: RoleDto): void {
		const ok = window.confirm(`Delete role "${r.code}"?\n\nIf role is in use, backend will SOFT delete (set inactive).`);
		if (!ok) return;
		
		this.api.deleteRole(r.id).subscribe({
			next: (res) => {
				this.toast.success(`Role deleted (${res.mode}).`);
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete role.');
			}
		});
	}
}
