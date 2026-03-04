import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, ProjectStatusDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-project-statuses',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './project-statuses.html',
	styleUrls: ['./project-statuses.scss'],
})
export class ProjectStatusesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: ProjectStatusDto[] = [];
	
	page = 1;
	perPage = 50;
	total = 0;
	lastPage = 1;
	
	search = '';
	isActiveFilter: '' | '1' | '0' = '';
	
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
		
		this.api.getProjectStatuses({
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
			next: (res: ApiCollection<ProjectStatusDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load project statuses.';
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
	
	isActive(row: ProjectStatusDto): boolean {
		return (row.is_active as unknown) === true || (row.is_active as unknown) === 1;
	}
	
	badgeClass(row: ProjectStatusDto): string {
		return this.isActive(row) ? 'bg-success' : 'bg-secondary';
	}
	
	badgeText(row: ProjectStatusDto): string {
		return this.isActive(row) ? 'Active' : 'Inactive';
	}
	
	confirmDelete(row: ProjectStatusDto): void {
		const ok = window.confirm(
			`Delete/Disable "${row.code}"?\n\nIf used by projects, it will SOFT delete (is_active=false).`
		);
		if (!ok) return;
		
		this.api.deleteProjectStatus(row.id).subscribe({
			next: (res) => {
				this.toast.success(`Project status deleted (${res.mode}).`);
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete project status.');
			}
		});
	}
}
