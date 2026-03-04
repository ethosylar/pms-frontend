import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiCollection, RiskIssueStatusDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-risk-issue-statuses',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './risk-issue-statuses.html',
	styleUrls: ['./risk-issue-statuses.scss'],
})
export class RiskIssueStatusesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: RiskIssueStatusDto[] = [];
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	search = '';
	isActive: '' | '1' | '0' = '';
	
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
		this.cdr.detectChanges();
		
		const is_active =
		this.isActive === '' ? undefined : Number(this.isActive);
		
		this.api
		.getRiskIssueStatuses({
			search: this.search || undefined,
			is_active,
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
			next: (res: ApiCollection<RiskIssueStatusDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load risk issue statuses.';
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
		const isActive = v === true || v === 1 || v === '1';
		return isActive ? 'Active' : 'Inactive';
	}
	
	activeBadgeClass(v: unknown): string {
		const isActive = v === true || v === 1 || v === '1';
		return isActive ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary';
	}
	
	confirmDelete(row: RiskIssueStatusDto): void {
		const ok = window.confirm(`Delete status "${row.code} - ${row.name}"?`);
		if (!ok) return;
		
		this.loading = true;
		this.cdr.detectChanges();
		
		this.api.deleteRiskIssueStatus(row.id)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: { ok: boolean; mode: 'SOFT' | 'HARD' }) => {
				const mode = res?.mode ?? 'SOFT';
				this.toast.success(mode === 'SOFT' ? 'Status disabled (soft delete).' : 'Status deleted.');
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete status.');
				this.cdr.detectChanges();
			}
		});
	}
}
