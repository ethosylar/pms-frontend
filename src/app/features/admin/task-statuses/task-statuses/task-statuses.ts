import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, TaskStatusDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-task-statuses',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './task-statuses.html',
	styleUrls: ['./task-statuses.scss'],
})
export class TaskStatusesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: TaskStatusDto[] = [];
	
	page = 1;
	perPage = 10;
	total = 0;
	lastPage = 1;
	
	search = '';
	isActiveFilter: 'ALL' | '1' | '0' = 'ALL';
	
	deletingId: number | null = null;
	
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
		
		const is_active =
		this.isActiveFilter === 'ALL' ? undefined : Number(this.isActiveFilter);
		
		this.api.getTaskStatuses({
			search: this.search || undefined,
			is_active,
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiCollection<TaskStatusDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load task statuses.';
				this.cdr.detectChanges();
			},
		});
	}
	
	onSearchEnter(): void {
		this.page = 1;
		this.fetch();
	}
	
	onActiveFilterChange(val: string) {
		this.isActiveFilter = val as any;
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (next < 1 || next > this.lastPage) return;
		this.page = next;
		this.fetch();
	}
	
	activeText(v: unknown): string {
		return (v as any) === true || (v as any) === 1 ? 'Active' : 'Inactive';
	}
	
	deleteRow(row: TaskStatusDto): void {
		if (this.deletingId) return;
		
		const ok = window.confirm(`Delete task status "${row.code} - ${row.name}"?`);
		if (!ok) return;
		
		this.deletingId = row.id;
		
		this.api.deleteTaskStatus(row.id)
		.pipe(finalize(() => {
			this.deletingId = null;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => {
				const mode = res?.mode ?? 'SOFT';
				this.toast.success(`Task status deleted (${mode}).`);
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete task status.');
				this.cdr.detectChanges();
			}
		});
	}
}
