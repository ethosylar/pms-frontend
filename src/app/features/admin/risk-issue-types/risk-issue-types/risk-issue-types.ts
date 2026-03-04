import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, RiskIssueTypeDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-risk-issue-types',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './risk-issue-types.html',
	styleUrls: ['./risk-issue-types.scss'],
})
export class RiskIssueTypesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: RiskIssueTypeDto[] = [];
	
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
		
		this.api.getRiskIssueTypes({
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
			next: (res: ApiCollection<RiskIssueTypeDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load risk/issue types.';
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
	
	isActive(row: RiskIssueTypeDto): boolean {
		return (row.is_active as unknown) === true || (row.is_active as unknown) === 1;
	}
	
	badgeClass(row: RiskIssueTypeDto): string {
		return this.isActive(row) ? 'bg-success' : 'bg-secondary';
	}
	
	badgeText(row: RiskIssueTypeDto): string {
		return this.isActive(row) ? 'Active' : 'Inactive';
	}
	
	confirmDelete(row: RiskIssueTypeDto): void {
		const ok = window.confirm(
			`Disable "${row.code}"?\n\nBackend does SOFT delete (set inactive).`
		);
		if (!ok) return;
		
		this.api.deleteRiskIssueType(row.id).subscribe({
			next: () => {
				this.toast.success('Risk/Issue type disabled (SOFT).');
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete risk/issue type.');
			}
		});
	}
}
