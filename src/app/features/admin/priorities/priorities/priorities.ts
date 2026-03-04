import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, PriorityDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-priorities',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './priorities.html',
	styleUrls: ['./priorities.scss'],
})
export class PrioritiesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: PriorityDto[] = [];
	
	page = 1;
	perPage = 50;     // backend default is 50
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
		
		this.api.getPriorities({
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
			next: (res: ApiCollection<PriorityDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load priorities.';
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
	
	isActive(p: PriorityDto): boolean {
		return (p.is_active as unknown) === true || (p.is_active as unknown) === 1;
	}
	
	badgeClass(p: PriorityDto): string {
		return this.isActive(p) ? 'bg-success' : 'bg-secondary';
	}
	
	badgeText(p: PriorityDto): string {
		return this.isActive(p) ? 'Active' : 'Inactive';
	}
	
	confirmDelete(p: PriorityDto): void {
		const ok = window.confirm(
			`Delete priority "${p.code}"?\n\nIf it is used by projects, backend will SOFT delete (set inactive).`
		);
		if (!ok) return;
		
		this.api.deletePriority(p.id).subscribe({
			next: (res) => {
				this.toast.success(`Priority deleted (${res.mode}).`);
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete priority.');
			}
		});
	}
}
