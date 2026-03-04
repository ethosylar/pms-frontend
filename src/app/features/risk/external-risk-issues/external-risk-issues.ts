import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import {
	ApiService,
	ApiCollection,
	ExternalRiskIssueDto,
	ExternalSourceDto,
	RiskIssueTypeDto,
	SeverityDto,
	RiskIssueStatusDto,
	ProjectDto, // if you have it. If not, remove project dropdown and use numeric input.
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-external-risk-issues',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './external-risk-issues.html',
	styleUrls: ['./external-risk-issues.scss'],
})
export class ExternalRiskIssuesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: ExternalRiskIssueDto[] = [];
	
	page = 1;
	perPage = 10;
	total = 0;
	lastPage = 1;
	
	// filters
	search = '';
	projectId?: number | null;
	externalSourceId?: number | null;
	typeId?: number | null;
	severityId?: number | null;
	statusId?: number | null;
	sourceUpdatedFrom?: string | null;
	sourceUpdatedTo?: string | null;
	
	// lookups for filter dropdowns (optional but recommended)
	sources: ExternalSourceDto[] = [];
	types: RiskIssueTypeDto[] = [];
	severities: SeverityDto[] = [];
	statuses: RiskIssueStatusDto[] = [];
	projects: ProjectDto[] = []; // optional
	
	// permissions (best-effort)
	canWrite = false;
	
	deletingId: number | null = null;
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private router: Router,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		// best-effort: determine canWrite from /me (adjust extraction based on your API)
		this.api.me().subscribe({
			next: (me: any) => {
				const roles = (me?.roles ?? me?.data?.roles ?? []) as any[];
				const codes = roles.map((r: any) => String(r?.code ?? r?.name ?? r)).map(s => s.toUpperCase());
				this.canWrite = codes.includes('ADMIN') || codes.includes('PMO') || codes.includes('PM');
				this.cdr.detectChanges();
			},
			error: () => {
				this.canWrite = false;
			}
		});
		
		// load filter lookups (skip ones you don't have)
		this.api.getExternalSources({ per_page: 100 }).subscribe(r => this.sources = r.data ?? []);
		this.api.getRiskIssueTypes({ per_page: 100 }).subscribe(r => this.types = r.data ?? []);
		this.api.getSeverities?.({ per_page: 100 })?.subscribe?.((r: any) => this.severities = r.data ?? []);
		this.api.getRiskIssueStatuses?.({ per_page: 100 })?.subscribe?.((r: any) => this.statuses = r.data ?? []);
		this.api.getProjects?.({ per_page: 100 })?.subscribe?.((r: any) => this.projects = r.data ?? []);
		
		this.fetch();
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getExternalRiskIssues({
			search: this.search || undefined,
			project_id: this.projectId ?? undefined,
			external_source_id: this.externalSourceId ?? undefined,
			type_id: this.typeId ?? undefined,
			severity_id: this.severityId ?? undefined,
			risk_issue_status_id: this.statusId ?? undefined,
			source_updated_from: this.sourceUpdatedFrom || undefined,
			source_updated_to: this.sourceUpdatedTo || undefined,
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiCollection<ExternalRiskIssueDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load external risk issues.';
				this.cdr.detectChanges();
			}
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	clearFilters(): void {
		this.search = '';
		this.projectId = null;
		this.externalSourceId = null;
		this.typeId = null;
		this.severityId = null;
		this.statusId = null;
		this.sourceUpdatedFrom = null;
		this.sourceUpdatedTo = null;
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number) {
		if (next < 1 || next > this.lastPage) return;
		this.page = next;
		this.fetch();
	}
	
	deleteRow(r: ExternalRiskIssueDto): void {
		if (!this.canWrite) {
			this.toast.warning('You do not have permission to delete.');
			return;
		}
		if (this.deletingId) return;
		
		const ok = window.confirm(`Delete issue "${r.external_id} - ${r.title}"?`);
		if (!ok) return;
		
		this.deletingId = r.id;
		
		this.api.deleteExternalRiskIssue(r.id)
		.pipe(finalize(() => {
			this.deletingId = null;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success('External risk issue deleted.');
				this.fetch();
			},
			error: (err: unknown) => {
				console.error(err);
				this.toast.error('Failed to delete external risk issue.');
				this.cdr.detectChanges();
			}
		});
	}
	
	view(r: ExternalRiskIssueDto) {
		this.router.navigate(['/external-risk-issues', r.id]);
	}
}
