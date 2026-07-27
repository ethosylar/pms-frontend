import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, } from '@angular/router';
import { forkJoin, } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
	ApiCollection,
	ApiService,
	ExternalPermitDto,
	ExternalRiskIssueDto,
	ExternalSourceDto,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	RiskIssueStatusDto,
	RiskIssueTypeDto,
	SeverityDto,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-external-risk-issues',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './external-risk-issues.html',
	styleUrls: ['./external-risk-issues.scss'],
})
export class ExternalRiskIssuesComponent implements OnInit {
	loading = true;
	loadingLookups = true;
	loadingProjectLinks = false;
	
	error: string | null = null;
	
	rows: ExternalRiskIssueDto[] = [];
	
	page = 1;
	perPage = 10;
	total = 0;
	lastPage = 1;
	
	search = '';
	
	projectId: number | null = null;
	taskId: number | null = null;
	milestoneId: number | null = null;
	permitId: number | null = null;
	
	externalSourceId: number | null = null;
	typeId: number | null = null;
	severityId: number | null = null;
	statusId: number | null = null;
	
	sourceUpdatedFrom = '';
	sourceUpdatedTo = '';
	
	sources: ExternalSourceDto[] = [];
	types: RiskIssueTypeDto[] = [];
	severities: SeverityDto[] = [];
	statuses: RiskIssueStatusDto[] = [];
	projects: ProjectDto[] = [];
	
	projectTasks: ProjectTaskGanttDto[] = [];
	projectMilestones: ProjectMilestoneDto[] = [];
	projectPermits: ExternalPermitDto[] = [];
	
	canWrite = false;
	deletingId: number | null = null;
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private router: Router,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.loadWriteAccess();
		this.loadLookups();
		this.fetch();
	}
	
	private loadWriteAccess(): void {
		this.api.me().subscribe({
			next: (me: any) => {
				const roles =
				(me?.roles ??
					me?.data?.roles ??
				[]) as any[];
				
				const codes = roles
				.map(role =>
					String(
						role?.code ??
						role?.name ??
						role
					).toUpperCase()
				);
				
				this.canWrite =
				codes.includes('ADMIN') ||
				codes.includes('PMO') ||
				codes.includes('PM');
				
				this.cdr.detectChanges();
			},
			error: () => {
				this.canWrite = false;
			},
		});
	}
	
	private loadLookups(): void {
		this.loadingLookups = true;
		
		forkJoin({
			sources: this.api.getExternalSources({
				per_page: 100,
			}),
			types: this.api.getRiskIssueTypes({
				per_page: 100,
			}),
			severities: this.api.getSeverities({
				per_page: 100,
			}),
			statuses: this.api.getRiskIssueStatuses({
				per_page: 100,
			}),
			projects: this.api.getProjects({
				per_page: 100,
			}),
		})
		.pipe(
			finalize(() => {
				this.loadingLookups = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.sources =
				result.sources.data ?? [];
				this.types =
				result.types.data ?? [];
				this.severities =
				result.severities.data ?? [];
				this.statuses =
				result.statuses.data ?? [];
				this.projects =
				result.projects.data ?? [];
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Some external risk issue filters could not be loaded.'
				);
			},
		});
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getExternalRiskIssues({
			search:
			this.search.trim() ||
			undefined,
			
			project_id:
			this.projectId ??
			undefined,
			task_id:
			this.taskId ??
			undefined,
			milestone_id:
			this.milestoneId ??
			undefined,
			permit_id:
			this.permitId ??
			undefined,
			
			external_source_id:
			this.externalSourceId ??
			undefined,
			type_id:
			this.typeId ??
			undefined,
			severity_id:
			this.severityId ??
			undefined,
			risk_issue_status_id:
			this.statusId ??
			undefined,
			
			source_updated_from:
			this.sourceUpdatedFrom ||
			undefined,
			source_updated_to:
			this.sourceUpdatedTo ||
			undefined,
			
			include_links: true,
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
			next: (
				res: ApiCollection<ExternalRiskIssueDto>
				) => {
				this.rows = res.data ?? [];
				this.total =
				res.meta?.total ??
				this.rows.length;
				this.lastPage =
				res.meta?.last_page ??
				1;
			},
			error: (err: any) => {
				console.error(err);
				
				this.error =
				err?.error?.message ||
				'Failed to load external risk issues.';
			},
		});
	}
	
	onProjectFilterChange(): void {
		this.taskId = null;
		this.milestoneId = null;
		this.permitId = null;
		
		this.projectTasks = [];
		this.projectMilestones = [];
		this.projectPermits = [];
		
		if (!this.projectId) {
			this.applyFilters();
			return;
		}
		
		this.loadingProjectLinks = true;
		
		forkJoin({
			tasks: this.api.getProjectGantt(
				this.projectId
			),
			milestones:
			this.api.getProjectMilestones(
				this.projectId,
				{ per_page: 100 }
			),
			permits:
			this.api.getExternalPermits({
				project_id: this.projectId,
				per_page: 100,
				page: 1,
			}),
		})
		.pipe(
			finalize(() => {
				this.loadingProjectLinks = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.projectTasks =
				this.normalizeTasks(
					result.tasks.tasks
				);
				
				this.projectMilestones =
				result.milestones.data ??
				[];
				
				this.projectPermits =
				result.permits.data ??
				[];
				
				this.applyFilters();
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Failed to load project-related filters.'
				);
				this.applyFilters();
			},
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	clearFilters(): void {
		this.search = '';
		
		this.projectId = null;
		this.taskId = null;
		this.milestoneId = null;
		this.permitId = null;
		
		this.externalSourceId = null;
		this.typeId = null;
		this.severityId = null;
		this.statusId = null;
		
		this.sourceUpdatedFrom = '';
		this.sourceUpdatedTo = '';
		
		this.projectTasks = [];
		this.projectMilestones = [];
		this.projectPermits = [];
		
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (
			next < 1 ||
			next > this.lastPage
			) {
			return;
		}
		
		this.page = next;
		this.fetch();
	}
	
	view(issue: ExternalRiskIssueDto): void {
		this.router.navigate([
			'/external-risk-issues',
			issue.id,
		]);
	}
	
	deleteRow(
		issue: ExternalRiskIssueDto
		): void {
		if (!this.canWrite) {
			this.toast.warning(
				'You do not have permission to delete.'
			);
			return;
		}
		
		if (this.deletingId !== null) {
			return;
		}
		
		const confirmed = window.confirm(
			`Delete external risk issue "${issue.external_id} - ${issue.title}"?\n\n` +
			'This is a hard delete. Existing link and audit relationships should be reviewed first.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.deletingId = issue.id;
		
		this.api.deleteExternalRiskIssue(
			issue.id
		)
		.pipe(
			finalize(() => {
				this.deletingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'External risk issue deleted.'
				);
				
				if (
					this.rows.length === 1 &&
					this.page > 1
					) {
					this.page -= 1;
				}
				
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to delete external risk issue.'
				);
			},
		});
	}
	
	sourceLabel(
		issue: ExternalRiskIssueDto
		): string {
		return this.lookupLabel(
			issue.external_source_code,
			issue.external_source_name
		);
	}
	
	projectLabel(
		issue: ExternalRiskIssueDto
		): string {
		return this.lookupLabel(
			issue.project_code,
			issue.project_name
		);
	}
	
	typeLabel(
		issue: ExternalRiskIssueDto
		): string {
		return this.lookupLabel(
			issue.type_code,
			issue.type_name
		);
	}
	
	severityLabel(
		issue: ExternalRiskIssueDto
		): string {
		return this.lookupLabel(
			issue.severity_code,
			issue.severity_name
		);
	}
	
	statusLabel(
		issue: ExternalRiskIssueDto
		): string {
		return this.lookupLabel(
			issue.risk_issue_status_code,
			issue.risk_issue_status_name
		);
	}
	
	severityBadgeClass(
		code?: string | null
		): string {
		switch (
			String(code ?? '')
			.trim()
			.toUpperCase()
			) {
			case 'CRITICAL':
			case 'EXTREME':
			return 'bg-danger';
			
			case 'HIGH':
			return 'bg-warning text-dark';
			
			case 'MEDIUM':
			case 'MODERATE':
			return 'bg-info text-dark';
			
			case 'LOW':
			return 'bg-success';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	statusBadgeClass(
		code?: string | null
		): string {
		switch (
			String(code ?? '')
			.trim()
			.toUpperCase()
			) {
			case 'OPEN':
			case 'ACTIVE':
			case 'IN_PROGRESS':
			return 'bg-primary';
			
			case 'MITIGATED':
			case 'RESOLVED':
			case 'CLOSED':
			case 'COMPLETED':
			return 'bg-success';
			
			case 'ON_HOLD':
			case 'MONITORING':
			return 'bg-warning text-dark';
			
			case 'CANCELLED':
			case 'REJECTED':
			return 'bg-secondary';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	private lookupLabel(
		code?: string | null,
		name?: string | null
		): string {
		if (code && name) {
			return `${code} - ${name}`;
		}
		
		return code || name || '-';
	}
	
	private normalizeTasks(
		value: unknown
		): ProjectTaskGanttDto[] {
		if (Array.isArray(value)) {
			return value as ProjectTaskGanttDto[];
		}
		
		if (
			value &&
			typeof value === 'object' &&
			Array.isArray((value as any).data)
			) {
			return (value as any).data;
		}
		
		return [];
	}
}
