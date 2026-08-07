import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { catchError, finalize, } from 'rxjs/operators';
import { forkJoin, of, } from 'rxjs';

import {
	ApiCollection,
	ApiResource,
	ApiService,
	ProjectBudgetAllocationDto,
	ProjectBudgetLineDto,
	ProjectBudgetLineType,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	StoredFileDto,
	AgreementDto,
	ExternalPermitDto,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';
import { ProjectGanttNgxEmbedComponent, } from '../project-gantt-ngx-embed/project-gantt-ngx-embed';

type ProjectDetailTab =
| 'overview'
| 'tasks'
| 'financials'
| 'project-files'
| 'milestones'
| 'task-files'
| 'agreements'
| 'permits';

type TaskFilesVm = {
	taskId: number;
	taskName: string;
	files: StoredFileDto[];
};

@Component({
	standalone: true,
	selector: 'app-project-detail',
	imports: [
		CommonModule,
		RouterModule,
		ProjectGanttNgxEmbedComponent,
	],
	templateUrl: './project-detail.html',
	styleUrls: ['./project-detail.scss'],
})
export class ProjectDetailComponent implements OnInit {
	activeTab: ProjectDetailTab = 'overview';
	
	loading = true;
	error: string | null = null;
	
	projectId = 0;
	row: ProjectDto | null = null;
	
	tasksLoading = false;
	tasksError: string | null = null;
	projectTasks: ProjectTaskGanttDto[] = [];
	
	milestonesLoading = false;
	milestonesError: string | null = null;
	milestones: ProjectMilestoneDto[] = [];
	
	projectFiles: StoredFileDto[] = [];
	projectFilesLoading = false;
	projectFilesError: string | null = null;
	uploadingProjectFile = false;
	removingProjectFileId: number | null = null;
	
	taskFileGroups: TaskFilesVm[] = [];
	taskFilesLoading = false;
	taskFilesError: string | null = null;
	
	budgetLines: ProjectBudgetLineDto[] = [];
	budgetAllocations: ProjectBudgetAllocationDto[] = [];
	budgetLoading = false;
	budgetError: string | null = null;
	
	linkedAgreements: AgreementDto[] = [];
	agreementsLoading = false;
	agreementsError: string | null = null;
	
	linkedPermits: ExternalPermitDto[] = [];
	permitsLoading = false;
	permitsError: string | null = null;
	
	taskOptions: Array<{
		id: number;
		name: string;
	}> = [];
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		const id = Number(
			this.route.snapshot.paramMap.get('id')
		);
		
		if (
			!Number.isInteger(id) ||
			id <= 0
			) {
			this.error = 'Invalid project ID.';
			this.loading = false;
			return;
		}
		
		this.projectId = id;
		this.loadProject();
	}
	
	setTab(tab: ProjectDetailTab): void {
		this.activeTab = tab;
	}
	
	loadProject(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getProject(this.projectId)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				response: ApiResource<ProjectDto>
				) => {
				this.row = response.data;
				this.loadRelatedData();
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 404) {
					this.error = 'Project was not found.';
					return;
				}
				
				this.error =
				err?.error?.message ||
				'Failed to load project.';
			},
		});
	}
	
	private loadRelatedData(): void {
		this.loadTasks();
		this.loadMilestones();
		this.loadProjectFiles();
		this.loadFinancials();
		this.loadLinkedAgreements();
		this.loadLinkedPermits();
	}
	
	back(): void {
		this.router.navigateByUrl('/projects');
	}
	
	edit(
		tab:
		| 'project'
		| 'budget-lines'
		| 'budget-allocations' =
		'project'
		): void {
		this.router.navigate(
			[
				'/projects',
				this.projectId,
				'edit',
			],
			{
				queryParams: {
					tab,
				},
			}
		);
	}
	
	openGantt(): void {
		this.router.navigate([
			'/projects',
			this.projectId,
			'gantt',
		]);
	}
	
	loadMilestones(): void {
		this.milestonesLoading = true;
		this.milestonesError = null;
		
		this.api.getProjectMilestones(
			this.projectId,
			{
				page: 1,
				per_page: 100,
			}
		)
		.pipe(
			finalize(() => {
				this.milestonesLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiCollection<ProjectMilestoneDto>
				) => {
				this.milestones =
				res.data ?? [];
			},
			error: err => {
				console.error(err);
				this.milestonesError =
				'Failed to load milestones.';
			},
		});
	}
	
	manageMilestones(): void {
		this.router.navigate([
			'/projects',
			this.projectId,
			'milestones',
		]);
	}
	
	addMilestone(): void {
		this.router.navigate([
			'/projects',
			this.projectId,
			'milestones',
			'new',
		]);
	}
	
	badgeClass(status?: string | null): string {
		switch (
			String(status ?? '')
			.trim()
			.toUpperCase()
			) {
			case 'DONE':
			case 'COMPLETED':
			return 'bg-success';
			
			case 'CANCELLED':
			return 'bg-secondary';
			
			case 'IN_PROGRESS':
			return 'bg-primary';
			
			default:
			return 'bg-warning text-dark';
		}
	}
	
	loadProjectFiles(): void {
		this.projectFilesLoading = true;
		this.projectFilesError = null;
		
		this.api.getProjectFiles(
			this.projectId,
			{ per_page: 100 }
		)
		.pipe(
			finalize(() => {
				this.projectFilesLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: res => {
				this.projectFiles =
				res.data ?? [];
			},
			error: err => {
				console.error(err);
				this.projectFilesError =
				'Failed to load project files.';
			},
		});
	}
	
	onProjectFileSelected(event: Event): void {
		const input =
		event.target as HTMLInputElement;
		
		const file =
		input.files?.[0];
		
		if (!file) {
			return;
		}
		
		this.uploadingProjectFile = true;
		this.projectFilesError = null;
		
		this.api.uploadProjectFile(
			this.projectId,
			file
		)
		.pipe(
			finalize(() => {
				this.uploadingProjectFile = false;
				input.value = '';
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Project file uploaded.'
				);
				this.loadProjectFiles();
			},
			error: (err: any) => {
				console.error(err);
				this.projectFilesError =
				err?.error?.message ||
				'Failed to upload project file.';
			},
		});
	}
	
	previewProjectFile(
		file: StoredFileDto
		): void {
		if (!this.canPreviewFile(file)) {
			this.downloadProjectFile(file);
			return;
		}
		
		this.api.downloadProjectFile(
			this.projectId,
			file.id
		)
		.subscribe({
			next: blob => {
				const url =
				window.URL.createObjectURL(blob);
				
				window.open(
					url,
					'_blank',
					'noopener,noreferrer'
				);
				
				setTimeout(
					() =>
					window.URL.revokeObjectURL(
						url
					),
					60_000
				);
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Failed to open project file.'
				);
			},
		});
	}
	
	downloadProjectFile(
		file: StoredFileDto
		): void {
		this.api.downloadProjectFile(
			this.projectId,
			file.id
		)
		.subscribe({
			next: blob => {
				this.downloadBlob(
					blob,
					file.original_name ||
					`project-file-${file.id}`
				);
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Failed to download project file.'
				);
			},
		});
	}
	
	removeProjectFile(
		file: StoredFileDto
		): void {
		const confirmed = window.confirm(
			`Remove project file "${file.original_name}"?\n\n` +
			'This detaches the file from the project.'
		);
		
		if (!confirmed) {
			return;
		}
		
		if (
			this.removingProjectFileId !== null
			) {
			return;
		}
		
		this.removingProjectFileId = file.id;
		
		this.api.detachProjectFile(
			this.projectId,
			file.id
		)
		.pipe(
			finalize(() => {
				this.removingProjectFileId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Project file removed.'
				);
				this.loadProjectFiles();
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					err?.error?.message ||
					'Failed to remove project file.'
				);
			},
		});
	}
	
	loadFinancials(): void {
		this.budgetLoading = true;
		this.budgetError = null;
		
		forkJoin({
			lines:
			this.api.getProjectBudgetLines(
				this.projectId,
				{ per_page: 100 }
			),
			allocations:
			this.api.getProjectBudgetAllocations(
				this.projectId,
				{ per_page: 100 }
			),
		})
		.pipe(
			finalize(() => {
				this.budgetLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.budgetLines =
				result.lines.data ?? [];
				
				this.budgetAllocations =
				result.allocations.data ?? [];
			},
			error: err => {
				console.error(err);
				this.budgetError =
				'Failed to load financial details.';
			},
		});
	}
	
	
	loadTasks(): void {
		this.tasksLoading = true;
		this.tasksError = null;
		
		this.api.getProjectGantt(
			this.projectId
		)
		.pipe(
			finalize(() => {
				this.tasksLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: gantt => {
				this.projectTasks =
				this.normalizeTasks(
					gantt.tasks
				);
				
				this.taskOptions =
				this.projectTasks.map(task => ({
					id: task.id,
					name: task.name,
				}));
				
				this.loadTaskFilesForTasks(
					this.projectTasks
				);
			},
			error: err => {
				console.error(err);
				this.projectTasks = [];
				this.taskOptions = [];
				this.tasksError =
				'Failed to load project tasks.';
				this.taskFilesError =
				'Task files cannot be loaded because the task list is unavailable.';
			},
		});
	}
	
	private loadTaskFilesForTasks(tasks: ProjectTaskGanttDto[]): void {
		this.taskFilesLoading = true;
		this.taskFilesError = null;
		
		if (!tasks.length) {
			this.taskFileGroups = [];
			this.taskFilesLoading = false;
			this.cdr.detectChanges();
			return;
		}
		
		forkJoin(
			tasks.map(task =>
				this.api.getTaskFiles(
					task.id,
					{ per_page: 100 }
				)
				.pipe(
					catchError(err => {
						console.error(err);
						return of({
							data:
							[] as StoredFileDto[],
						});
					})
				)
			)
		)
		.pipe(
			finalize(() => {
				this.taskFilesLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: results => {
				this.taskFileGroups =
				tasks
				.map((task, index) => ({
					taskId:
					task.id,
					taskName:
					task.name,
					files:
					results[index]
					?.data ??
					[],
				}))
				.filter(group =>
					group.files.length > 0
				);
			},
			error: err => {
				console.error(err);
				this.taskFilesError =
				'Failed to load task files.';
			},
		});
	}
	
	taskStatusLabel(task: ProjectTaskGanttDto): string {
		return (
			task.status_name ||
			task.status_code ||
			'—'
		);
	}
	
	taskActualStatusLabel(task: ProjectTaskGanttDto): string {
		return (
			task.actual_status_name ||
			task.actual_status_code ||
			'—'
		);
	}
	
	taskBadgeClass(task: ProjectTaskGanttDto, actual = false): string {
		const code = String(
			actual
			? (
				task.actual_status_code ||
				task.actual_status_name ||
				''
			)
			: (
				task.status_code ||
				task.status_name ||
				''
			)
		)
		.trim()
		.toUpperCase();
		
		switch (code) {
			case 'DONE':
			case 'COMPLETED':
			return 'bg-success';
			
			case 'IN_PROGRESS':
			return 'bg-primary';
			
			case 'CANCELLED':
			return 'bg-secondary';
			
			case 'DELAYED':
			case 'OVERDUE':
			return 'bg-danger';
			
			case 'ON_HOLD':
			case 'PENDING':
			return 'bg-warning text-dark';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	taskMilestoneLabel(task: ProjectTaskGanttDto): string {
		return (task.milestone?.name ||
			(
				task.milestone_id
				? `Milestone #${task.milestone_id}`
				: '—'
			)
		);
	}
	
	taskAssigneeLabel(task: ProjectTaskGanttDto): string {
		return (
			task.assigned_to_name ||
			(
				task.assigned_to_user_id
				? `User #${task.assigned_to_user_id}`
				: '—'
			)
		);
	}
	
	parentTaskLabel(task: ProjectTaskGanttDto): string {
		if (!task.parent_task_id) {
			return '—';
		}
		
		const parent = this.projectTasks.find(
			item =>
			item.id ===
			task.parent_task_id
		);
		
		return parent
		? `#${parent.id} - ${parent.name}`
		: `Task #${task.parent_task_id}`;
	}
	
	dependencyTaskLabel(task: ProjectTaskGanttDto): string {
		if (!task.depends_on_task_id) {
			return '—';
		}
		
		const dependency = this.projectTasks.find(
			item =>
			item.id ===
			task.depends_on_task_id
		);
		
		return dependency
		? `#${dependency.id} - ${dependency.name}`
		: `Task #${task.depends_on_task_id}`;
	}
	
	completedTaskCount(): number {
		return this.projectTasks.filter(
			task =>
			this.isCompletedTask(task)
		).length;
	}
	
	inProgressTaskCount(): number {
		return this.projectTasks.filter(
			task =>
			this.taskEffectiveStatus(task) ===
			'IN_PROGRESS'
		).length;
	}
	
	overdueTaskCount(): number {
		return this.projectTasks.filter(
			task =>
			this.isTaskOverdue(task)
		).length;
	}
	
	isTaskOverdue(task: ProjectTaskGanttDto): boolean {
		if (!task.end_date || this.isTerminalTask(task)) {
			return false;
		}
		const rawEndDate = String(task.end_date);
		const endDate = new Date(rawEndDate.includes('T') ? rawEndDate : `${rawEndDate}T23:59:59`);
		if (Number.isNaN(endDate.getTime())) {
			return false;
		}
		
		return endDate.getTime() <
		Date.now();
	}
	
	private isCompletedTask(task: ProjectTaskGanttDto): boolean {
		const code = this.taskEffectiveStatus(task);
		
		return (
			code === 'DONE' ||
			code === 'COMPLETED'
		);
	}
	
	private isTerminalTask(task: ProjectTaskGanttDto): boolean {
		const code = this.taskEffectiveStatus(task);
		
		return (
			code === 'DONE' ||
			code === 'COMPLETED' ||
			code === 'CANCELLED'
		);
	}
	
	private taskEffectiveStatus(task: ProjectTaskGanttDto): string {
		return String(task.actual_status_code || task.status_code || '').trim().toUpperCase();
	}
	
	previewTaskFile(taskId: number, file: StoredFileDto): void {
		if (!this.canPreviewFile(file)) {
			this.downloadTaskFile(taskId, file);
			return;
		}
		
		this.api.downloadTaskFile(taskId, file.id)
		.subscribe({
			next: blob => {
				const url =
				window.URL.createObjectURL(blob);
				
				window.open(
					url,
					'_blank',
					'noopener,noreferrer'
				);
				
				setTimeout(
					() =>
					window.URL.revokeObjectURL(
						url
					),
					60_000
				);
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Failed to open task file.'
				);
			},
		});
	}
	
	downloadTaskFile(taskId: number, file: StoredFileDto): void {
		this.api.downloadTaskFile(taskId, file.id)
		.subscribe({
			next: blob => {
				this.downloadBlob(
					blob,
					file.original_name ||
					`task-file-${file.id}`
				);
			},
			error: err => {
				console.error(err);
				this.toast.error(
					'Failed to download task file.'
				);
			},
		});
	}
	
	canPreviewFile(file: StoredFileDto): boolean {
		const mime = (file.mime_type || '').toLowerCase();
		return (mime.startsWith('image/') || mime === 'application/pdf' || mime.startsWith('text/'));
	}
	
	formatBytes(size?: number | null): string {
		const bytes = Number(size ?? 0);
		
		if (bytes < 1024) {
			return `${bytes} B`;
		}
		
		if (bytes < 1024 * 1024) {
			return `${( bytes / 1024 ).toFixed(1)} KB`;
		}
		
		if (bytes < 1024 * 1024 * 1024) {
			return `${( bytes / (1024 * 1024)).toFixed(1)} MB`;
		}
		
		return `${( bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
	
	moneyLabel(value?: number | null): string {
		const currency = this.row?.currency_code || 'MYR';
		
		return `${currency} ${Number(
		value ?? 0
		).toLocaleString(
		'en-US',
		{
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		}
		)}`;
	}
	
	budgetLineLabel(id?: number | null): string {
		const line = this.budgetLines.find(item => item.id === Number(id));
		
		return line ? `${line.line_type} • ${line.code} - ${line.name}` : '—';
	}
	
	allocationTargetLabel(allocation: ProjectBudgetAllocationDto): string {
		if (allocation.task_id) {
			const task = this.taskOptions.find(
				item =>
				item.id ===
				allocation.task_id
			);
			
			return `Task: ${
			task?.name ??
			'#' +
			allocation.task_id
			}`;
		}
		
		if (allocation.milestone_id) {
			const milestone =
			this.milestones.find(
				item =>
				item.id ===
				allocation.milestone_id
			);
			
			return `Milestone: ${
			milestone?.name ??
			'#' +
			allocation.milestone_id
			}`;
		}
		
		return 'Project level';
	}
	
	allocationTotalByType(type: ProjectBudgetLineType, field:
		| 'planned_amount'
		| 'actual_amount'
		| 'committed_amount'
		): number {
		return this.budgetAllocations.filter(allocation => this.allocationLineType(allocation) === type)
		.reduce((sum, allocation) =>
			sum + Number(allocation[field] ?? 0), 0
		);
	}
	
	allocationVariance(field: | 'planned_amount'| 'actual_amount'| 'committed_amount'): number {
		return (
			this.allocationTotalByType('FUND', field) -
			this.allocationTotalByType('COST', field)
		);
	}
	
	varianceClass(value: number): string {
		if (value < 0) {
			return 'text-danger fw-semibold';
		}
		
		if (value > 0) {
			return 'text-success fw-semibold';
		}
		
		return 'fw-semibold';
	}
	
	private allocationLineType(allocation: ProjectBudgetAllocationDto): ProjectBudgetLineType | null {
		const nestedType = allocation.budget_line?.line_type;
		
		if (nestedType === 'COST' || nestedType === 'FUND') {
			return nestedType;
		}
		return (this.budgetLines.find(line => line.id === allocation.budget_line_id)?.line_type ?? null);
	}
	
	private normalizeTasks(value: unknown): ProjectTaskGanttDto[] {
		if (Array.isArray(value)) {
			return value as ProjectTaskGanttDto[];
		}
		
		if (value && typeof value === 'object' && Array.isArray((value as any).data)) {
			return (value as any).data;
		}
		return [];
	}
	
	private downloadBlob(blob: Blob, fileName: string): void {
		const url = window.URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = fileName;
		anchor.click();
		window.URL.revokeObjectURL(url);
	}
	
	loadLinkedAgreements(): void {
		this.agreementsLoading = true;
		this.agreementsError = null;
		
		this.api.getProjectAgreements(this.projectId)
		.pipe(finalize(() => {
			this.agreementsLoading = false;
			this.ensureDynamicTabExists();
			
			this.cdr.detectChanges();
		})
		)
		.subscribe({
			next: response => {
				this.linkedAgreements = response.data ?? [];
			},
			error: (err: any) => {
				console.error(err);
				this.linkedAgreements = [];
				/*
					* 403 means this user can see the
					* Project but does not have Agreement
					* visibility.
					*
					* Do not show the Agreement tab.
				*/
				if (err?.status === 403) {
					return;
				}
				this.agreementsError = err?.error ?.message || 'Failed to load linked agreements.';
			},
		});
	}
	
	loadLinkedPermits(): void {
		this.permitsLoading = true;
		this.permitsError = null;
		this.api.getProjectPermits(this.projectId)
		.pipe(finalize(() => {
			this.permitsLoading = false;
			this.ensureDynamicTabExists();
			this.cdr.detectChanges();
		})
		)
		.subscribe({next: response => {
			this.linkedPermits = response.data ?? [];
		},
		error: (err: any) => {
			console.error(err);
			this.linkedPermits = [];
			if (err?.status === 403) {
				return;
			}
			this.permitsError = err?.error?.message || 'Failed to load linked ePTW permits.';
		},
		});
	}
	
	private ensureDynamicTabExists(): void {
		if (this.activeTab === 'agreements' && this.linkedAgreements.length === 0) {
			this.activeTab = 'overview';
		}
		
		if (this.activeTab === 'permits' && this.linkedPermits.length === 0) {
			this.activeTab = 'overview';
		}
	}
	
	agreementStatusBadgeClass(agreement: AgreementDto): string {
		const code = String(agreement.status?.code ?? '').trim().toUpperCase();
		switch (code) {
			case 'ACTIVE':
			return 'bg-success';
			
			case 'APPROVED':
			return 'bg-info text-dark';
			
			case 'UNDER_REVIEW':
			case 'PENDING_APPROVAL':
			return 'bg-primary';
			
			case 'EXPIRING_SOON':
			return 'bg-warning text-dark';
			
			case 'EXPIRED':
			case 'TERMINATED':
			return 'bg-danger';
			
			case 'ARCHIVED':
			case 'CANCELLED':
			case 'RENEWED':
			return 'bg-secondary';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	permitStatusBadgeClass(permit: ExternalPermitDto): string {
		if (permit.is_source_deleted) {
			return 'bg-dark';
		}
		
		switch (String(permit.normalized_status ?? '').trim().toUpperCase()) {
			case 'ACTIVE':
			return 'bg-success';
			
			case 'PENDING':
			return 'bg-warning text-dark';
			
			case 'SUSPENDED':
			return 'bg-danger';
			
			case 'COMPLETED':
			return 'bg-primary';
			
			case 'CANCELLED':
			case 'CANCELED':
			return 'bg-secondary';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	permitStatusLabel(permit: ExternalPermitDto): string {
		if (permit.is_source_deleted) {
			return 'SOURCE DELETED';
		}
		
		return (permit.normalized_status || 'UNKNOWN');
	}
	
	permitWorkPeriod(permit: ExternalPermitDto): string {
		const start = permit.work_start_date || '—';
		const end = permit.work_end_date || '—';
		return (`${start} to ${end}`);
	}
	
	permitLinkedTaskNames(permit: ExternalPermitDto): string {
		const names = (
		permit.links ?? [])
		.filter(link =>
			link.project_id === this.projectId && !!link.task
		).map(link => link.task!.name);
		
		if (!names.length) {
			return 'Project level';
		}
		
		return names.join(', ');
	}
	
	agreementLifecycleLabel(agreement: AgreementDto): string {
		const lifecycle = agreement.lifecycle;
		if (!lifecycle) {
			return '—';
		}
		
		let label = lifecycle.type || 'ORIGINAL';
		if (lifecycle.revision_no > 0) {
			label += ` • Revision ${lifecycle.revision_no}`;
		}
		
		if (lifecycle.renewal_sequence > 0) {
			label += ` • Renewal ${lifecycle.renewal_sequence}`;
		}
		return label;
	}
	
	
	agreementMoneyLabel(agreement: AgreementDto): string {
		if (agreement.contract_value === null || agreement.contract_value === undefined) {
			return '—';
		}
		
		return (`${agreement.currency_code || 'MYR'} ` + Number(agreement.contract_value)
			.toLocaleString('en-US',{
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}
			)
		);
	}
	
	
}
