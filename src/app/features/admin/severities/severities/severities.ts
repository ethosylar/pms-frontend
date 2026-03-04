import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, SeverityDto, ApiCollection } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-severities',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './severities.html',
	styleUrls: ['./severities.scss'],
})
export class SeveritiesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: SeverityDto[] = [];
	
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
		
		this.api.getSeverities({
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
			next: (res: ApiCollection<SeverityDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load severities.';
				this.cdr.detectChanges();
			},
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
	
	activeText(v: unknown): string {
		return (v as any) === true || (v as any) === 1 ? 'Active' : 'Inactive';
	}
	
	onActiveFilterChange(val: string) {
		this.isActiveFilter = val as any;
		this.page = 1;
		this.fetch();
	}
	
	deleteRow(row: SeverityDto): void {
		if (this.deletingId) return;
		
		const ok = window.confirm(`Delete severity "${row.code} - ${row.name}"?`);
		if (!ok) return;
		
		this.deletingId = row.id;
		this.api.deleteSeverity(row.id)
		.pipe(finalize(() => {
			this.deletingId = null;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => {
				const mode = res?.mode ?? 'SOFT';
				this.toast.success(`Severity deleted (${mode}).`);
				// refresh list
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete severity.');
				this.cdr.detectChanges();
			}
		});
	}
}
