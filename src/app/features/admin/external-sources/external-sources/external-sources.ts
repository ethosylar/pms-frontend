import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, ExternalSourceDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-external-sources',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './external-sources.html',
	styleUrls: ['./external-sources.scss'],
})
export class ExternalSourcesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: ExternalSourceDto[] = [];
	
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
		
		this.api.getExternalSources({
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
			next: (res: ApiCollection<ExternalSourceDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load external sources.';
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
	
	isActive(row: ExternalSourceDto): boolean {
		return (row.is_active as unknown) === true || (row.is_active as unknown) === 1;
	}
	
	badgeClass(row: ExternalSourceDto): string {
		return this.isActive(row) ? 'bg-success' : 'bg-secondary';
	}
	
	badgeText(row: ExternalSourceDto): string {
		return this.isActive(row) ? 'Active' : 'Inactive';
	}
	
	confirmDelete(row: ExternalSourceDto): void {
		const ok = window.confirm(
			`Disable "${row.code}"?\n\nThis will SOFT delete by setting is_active = false.`
		);
		if (!ok) return;
		
		this.api.deleteExternalSource(row.id).subscribe({
			next: () => {
				this.toast.success('External source disabled (SOFT).');
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete external source.');
			}
		});
	}
}
