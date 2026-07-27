import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { forkJoin, } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
	ApiPagedResponse,
	ApiResource,
	ApiService,
	ExternalPermitDto,
	ExternalRiskIssueDto,
	ExternalRiskIssueLinkDto,
	ExternalRiskIssueLinkPayload,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

type ExternalRiskIssueDetailTab =
| 'overview'
| 'links'
| 'payload';

@Component({
	standalone: true,
	selector: 'app-external-risk-issue-detail',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './external-risk-issue-detail.html',
	styleUrls: ['./external-risk-issue-detail.scss'],
})
export class ExternalRiskIssueDetailComponent implements OnInit {
	activeTab:
	ExternalRiskIssueDetailTab =
	'overview';
	
	loading = true;
	loadingLinkLookups = true;
	loadingProjectTargets = false;
	linking = false;
	
	error: string | null = null;
	linkError: string | null = null;
	
	id = 0;
	row: ExternalRiskIssueDto | null = null;
	
	canWrite = false;
	
	projects: ProjectDto[] = [];
	tasks: ProjectTaskGanttDto[] = [];
	milestones: ProjectMilestoneDto[] = [];
	permits: ExternalPermitDto[] = [];
	
	permitSearch = '';
	
	linkForm: {
		project_id: number | null;
		task_id: number | null;
		milestone_id: number | null;
		permit_id: number | null;
		notes: string;
		} = {
		project_id: null,
		task_id: null,
		milestone_id: null,
		permit_id: null,
		notes: '',
	};
	
	unlinkingId: number | null = null;
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		const parsedId = Number(
			this.route.snapshot.paramMap.get('id')
		);
		
		if (
			!Number.isInteger(parsedId) ||
			parsedId <= 0
			) {
			this.error =
			'Invalid external risk issue ID.';
			this.loading = false;
			return;
		}
		
		this.id = parsedId;
		
		this.loadWriteAccess();
		this.loadLinkLookups();
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
	
	private loadLinkLookups(): void {
		this.loadingLinkLookups = true;
		
		forkJoin({
			projects: this.api.getProjects({
				per_page: 100,
			}),
			permits:
			this.api.getExternalPermits({
				per_page: 100,
				page: 1,
			}),
		})
		.pipe(
			finalize(() => {
				this.loadingLinkLookups = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.projects =
				result.projects.data ?? [];
				this.permits =
				result.permits.data ?? [];
			},
			error: err => {
				console.error(err);
				this.linkError =
				'Some link selection data could not be loaded.';
			},
		});
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getExternalRiskIssue(
			this.id,
			true
		)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiResource<ExternalRiskIssueDto>
				) => {
				this.row = res.data;
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 404) {
					this.error =
					'External risk issue was not found.';
					return;
				}
				
				this.error =
				err?.error?.message ||
				'Failed to load external risk issue.';
			},
		});
	}
	
	setTab(
		tab: ExternalRiskIssueDetailTab
		): void {
		this.activeTab = tab;
	}
	
	onLinkProjectChange(): void {
		this.linkForm.task_id = null;
		this.linkForm.milestone_id = null;
		this.linkForm.permit_id = null;
		
		this.tasks = [];
		this.milestones = [];
		this.permits = [];
		
		if (!this.linkForm.project_id) {
			this.loadPermits();
			return;
		}
		
		const projectId =
		this.linkForm.project_id;
		
		this.loadingProjectTargets = true;
		
		forkJoin({
			tasks:
			this.api.getProjectGantt(
				projectId
			),
			milestones:
			this.api.getProjectMilestones(
				projectId,
				{ per_page: 100 }
			),
			permits:
			this.api.getExternalPermits({
				project_id: projectId,
				per_page: 100,
				page: 1,
			}),
		})
		.pipe(
			finalize(() => {
				this.loadingProjectTargets = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.tasks =
				this.normalizeTasks(
					result.tasks.tasks
				);
				
				this.milestones =
				result.milestones.data ?? [];
				
				this.permits =
				result.permits.data ?? [];
			},
			error: err => {
				console.error(err);
				this.linkError =
				'Failed to load tasks, milestones or permits for the selected project.';
			},
		});
	}
	
	loadPermits(): void {
		this.loadingProjectTargets = true;
		this.linkError = null;
		
		this.api.getExternalPermits({
			search:
			this.permitSearch.trim() ||
			undefined,
			project_id:
			this.linkForm.project_id ??
			undefined,
			per_page: 100,
			page: 1,
		})
		.pipe(
			finalize(() => {
				this.loadingProjectTargets = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiPagedResponse<ExternalPermitDto>
				) => {
				this.permits =
				res.data ?? [];
			},
			error: err => {
				console.error(err);
				this.linkError =
				'Failed to search ePTW permits.';
			},
		});
	}
	
	addLink(): void {
		if (!this.canWrite) {
			this.toast.warning(
				'You do not have permission to link this issue.'
			);
			return;
		}
		
		this.linkError = null;
		
		if (
			!this.linkForm.project_id &&
			!this.linkForm.task_id &&
			!this.linkForm.milestone_id &&
			!this.linkForm.permit_id
			) {
			this.linkError =
			'Select at least one Project, Task, Milestone or ePTW Permit.';
			return;
		}
		
		const payload:
		ExternalRiskIssueLinkPayload = {
			project_id:
			this.linkForm.project_id,
			task_id:
			this.linkForm.task_id,
			milestone_id:
			this.linkForm.milestone_id,
			permit_id:
			this.linkForm.permit_id,
			notes:
			this.linkForm.notes.trim() ||
			null,
			is_active: true,
		};
		
		this.linking = true;
		
		this.api.linkExternalRiskIssue(
			this.id,
			payload
		)
		.pipe(
			finalize(() => {
				this.linking = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiResource<ExternalRiskIssueDto>
				) => {
				this.row = res.data;
				
				this.toast.success(
					'External risk issue link created.'
				);
				
				this.resetLinkForm();
			},
			error: (err: any) => {
				console.error(err);
				
				this.linkError =
				this.apiErrorMessage(
					err,
					'Failed to create external risk issue link.'
				);
			},
		});
	}
	
	unlink(
		link: ExternalRiskIssueLinkDto
		): void {
		if (!this.canWrite) {
			this.toast.warning(
				'You do not have permission to unlink this issue.'
			);
			return;
		}
		
		if (
			this.unlinkingId !== null
			) {
			return;
		}
		
		const confirmed = window.confirm(
			'Remove this active relationship from the external risk issue?'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.unlinkingId = link.id;
		
		this.api.unlinkExternalRiskIssue(
			this.id,
			link.id
		)
		.pipe(
			finalize(() => {
				this.unlinkingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'External risk issue link removed.'
				);
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to unlink external risk issue.'
				);
			},
		});
	}
	
	resetLinkForm(): void {
		this.linkForm = {
			project_id: null,
			task_id: null,
			milestone_id: null,
			permit_id: null,
			notes: '',
		};
		
		this.tasks = [];
		this.milestones = [];
		this.permitSearch = '';
		
		this.loadPermits();
	}
	
	activeLinks():
	ExternalRiskIssueLinkDto[] {
		return this.row?.active_links ?? [];
	}
	
	linkProjectLabel(
		link: ExternalRiskIssueLinkDto
		): string {
		return this.lookupLabel(
			link.project_code,
			link.project_name
		);
	}
	
	linkTaskLabel(
		link: ExternalRiskIssueLinkDto
		): string {
		return (
			link.task_name ||
			link.task_title ||
			(
				link.task_id
				? `Task #${link.task_id}`
				: '-'
			)
		);
	}
	
	linkMilestoneLabel(
		link: ExternalRiskIssueLinkDto
		): string {
		return (
			link.milestone_name ||
			(
				link.milestone_id
				? `Milestone #${link.milestone_id}`
				: '-'
			)
		);
	}
	
	linkPermitLabel(
		link: ExternalRiskIssueLinkDto
		): string {
		if (
			link.permit_external_form_id &&
			link.permit_external_permit_id
			) {
			return (
				`${link.permit_external_form_id} ` +
				`(${link.permit_external_permit_id})`
			);
		}
		
		return (
			link.permit_external_form_id ||
			link.permit_external_permit_id ||
			(
				link.permit_id
				? `Permit #${link.permit_id}`
				: '-'
			)
		);
	}
	
	sourceLabel(): string {
		return this.lookupLabel(
			this.row?.external_source_code,
			this.row?.external_source_name
		);
	}
	
	projectLabel(): string {
		return this.lookupLabel(
			this.row?.project_code,
			this.row?.project_name
		);
	}
	
	typeLabel(): string {
		return this.lookupLabel(
			this.row?.type_code,
			this.row?.type_name
		);
	}
	
	severityLabel(): string {
		return this.lookupLabel(
			this.row?.severity_code,
			this.row?.severity_name
		);
	}
	
	statusLabel(): string {
		return this.lookupLabel(
			this.row?.risk_issue_status_code,
			this.row?.risk_issue_status_name
		);
	}
	
	payloadText(): string {
		const value =
		this.row?.raw_payload;
		
		if (
			value === null ||
			value === undefined ||
			value === ''
			) {
			return 'No raw payload was stored.';
		}
		
		if (typeof value === 'string') {
			try {
				return JSON.stringify(
					JSON.parse(value),
					null,
					2
				);
				} catch {
				return value;
			}
		}
		
		return JSON.stringify(
			value,
			null,
			2
		);
	}
	
	back(): void {
		this.router.navigateByUrl(
			'/external-risk-issues'
		);
	}
	
	edit(): void {
		if (!this.canWrite) {
			this.toast.warning(
				'You do not have permission to edit.'
			);
			return;
		}
		
		this.router.navigate([
			'/external-risk-issues',
			this.id,
			'edit',
		]);
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
	
	private apiErrorMessage(
		err: any,
		fallback: string
		): string {
		if (err?.status === 409) {
			return (
				err?.error?.message ||
				'This external risk issue link already exists.'
			);
		}
		
		if (err?.status === 422) {
			const errors =
			err?.error?.errors;
			
			if (errors) {
				const firstKey =
				Object.keys(errors)[0];
				
				return (
					errors[firstKey]?.[0] ||
					err?.error?.message ||
					'Validation failed.'
				);
			}
			
			return (
				err?.error?.message ||
				'Validation failed.'
			);
		}
		
		return (
			err?.error?.message ||
			fallback
		);
	}
}
