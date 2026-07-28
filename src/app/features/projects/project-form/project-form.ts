import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, } from '@angular/forms';
import { forkJoin, of, } from 'rxjs';
import { catchError, finalize, map, switchMap, } from 'rxjs/operators';

import {
	ApiCollection,
	ApiResource,
	ApiService,
	DepartmentDto,
	PriorityDto,
	ProjectBudgetAllocationDto,
	ProjectBudgetAllocationUpsertPayload,
	ProjectBudgetLineDto,
	ProjectBudgetLineType,
	ProjectBudgetLineUpsertPayload,
	ProjectCategoryDto,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectStatusDto,
	ProjectTaskGanttDto,
	ProjectUpsertPayload,
	UserDto,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

type ProjectFormTab =
| 'project'
| 'budget-lines'
| 'budget-allocations';

@Component({
	standalone: true,
	selector: 'app-project-form',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
	],
	templateUrl: './project-form.html',
	styleUrls: ['./project-form.scss'],
})
export class ProjectFormComponent implements OnInit {
	activeTab: ProjectFormTab = 'project';
	
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	projectId: number | null = null;
	project: ProjectDto | null = null;
	
	form: FormGroup;
	
	departments: DepartmentDto[] = [];
	statuses: ProjectStatusDto[] = [];
	priorities: PriorityDto[] = [];
	owners: Array<{
		id: number;
		name: string;
	}> = [];
	categories: ProjectCategoryDto[] = [];
	
	budgetLines: ProjectBudgetLineDto[] = [];
	budgetAllocations: ProjectBudgetAllocationDto[] = [];
	taskOptions: Array<{
		id: number;
		name: string;
	}> = [];
	milestones: ProjectMilestoneDto[] = [];
	
	budgetLoading = false;
	budgetError: string | null = null;
	
	budgetLineForm:
	ProjectBudgetLineUpsertPayload =
	this.emptyBudgetLine();
	
	editingBudgetLineId:
	number | null = null;
	
	savingBudgetLine = false;
	budgetLineError:
	string | null = null;
	
	allocationForm:
	ProjectBudgetAllocationUpsertPayload =
	this.emptyAllocation();
	
	editingAllocationId:
	number | null = null;
	
	savingAllocation = false;
	allocationError:
	string | null = null;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		this.form = this.fb.group({
			code: [
				'',
				[Validators.required],
			],
			name: [
				'',
				[Validators.required],
			],
			description: [null],
			sponsor: [''],
			
			department_id: [null],
			project_status_id: [null],
			priority_id: [null],
			owner_user_id: [null],
			project_category_id: [null],
			
			planned_progress: [0],
			progress: [0],
			
			start_date: [null],
			actual_start_date: [null],
			target_end_date: [null],
			actual_end_date: [null],
			
			notes: [null],
			
			currency_code: ['MYR'],
			planned_cost_total: [0],
			actual_cost_total: [0],
			committed_cost_total: [0],
			planned_funding_total: [0],
			actual_funding_total: [0],
			budget_notes: [null],
			budget_updated_at: [null],
		});
	}
	
	ngOnInit(): void {
		const idParam =
		this.route.snapshot.paramMap.get('id');
		
		this.isCreate =
		!idParam ||
		idParam === 'new';
		
		if (!this.isCreate) {
			const id = Number(idParam);
			
			if (
				!Number.isInteger(id) ||
				id <= 0
				) {
				this.error =
				'Invalid project ID.';
				this.loading = false;
				return;
			}
			
			this.projectId = id;
		}
		
		this.setInitialTab();
		this.loadForm();
	}
	
	private setInitialTab(): void {
		const requested =
		this.route.snapshot.queryParamMap
		.get('tab');
		
		if (
			!this.isCreate &&
			(
				requested ===
				'budget-lines' ||
				requested ===
				'budget-allocations'
			)
			) {
			this.activeTab = requested;
			return;
		}
		
		this.activeTab = 'project';
	}
	
	setTab(tab: ProjectFormTab): void {
		if (
			this.isCreate &&
			tab !== 'project'
			) {
			return;
		}
		
		this.activeTab = tab;
		
		this.router.navigate(
			[],
			{
				relativeTo: this.route,
				queryParams: {
					tab:
					tab === 'project'
					? null
					: tab,
				},
				queryParamsHandling: 'merge',
				replaceUrl: true,
			}
		);
	}
	
	private loadForm(): void {
		this.loading = true;
		
		forkJoin({
			departments:
			this.api.getDepartments({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as any)
				)
			),
			
			statuses:
			this.api.getProjectStatuses({
				per_page: 100,
				is_active: 1,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as any)
				)
			),
			
			priorities:
			this.api.getPriorities({
				per_page: 100,
				is_active: 1,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as any)
				)
			),
			
			categories:
			this.api.getProjectCategories({
				per_page: 100,
				is_active: 1,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as any)
				)
			),
			
			owners:
			this.api.getUsers({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as any)
				)
			),
		})
		.pipe(
			switchMap(lookups => {
				this.departments =
				(
					lookups.departments as
					ApiCollection<DepartmentDto>
				).data ??
				[];
				
				this.statuses =
				(
					lookups.statuses as
					ApiCollection<ProjectStatusDto>
				).data ??
				[];
				
				this.priorities =
				(
					lookups.priorities as
					ApiCollection<PriorityDto>
				).data ??
				[];
				
				this.categories =
				(
					lookups.categories as
					ApiCollection<ProjectCategoryDto>
				).data ??
				[];
				
				const users =
				(
					lookups.owners as
					ApiCollection<UserDto>
				).data ??
				[];
				
				this.owners =
				users.map(user => ({
					id: user.id,
					name: user.name,
				}));
				
				if (this.isCreate) {
					return of(null);
				}
				
				return this.api.getProject(
					this.projectId!
				);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				response:
				| ApiResource<ProjectDto>
				| null
				) => {
				if (!response) {
					return;
				}
				
				this.project =
				response.data;
				
				this.patchProject(
					response.data
				);
				
				this.loadBudgetEditor();
			},
			error: (err: any) => {
				console.error(err);
				this.error =
				err?.error?.message ||
				'Failed to load project.';
			},
		});
	}
	
	private patchProject(
		project: ProjectDto
		): void {
		this.form.patchValue({
			code: project.code,
			name: project.name,
			description:
			project.description ??
			null,
			
			department_id:
			project.department?.id ??
			project.department_id ??
			null,
			owner_user_id:
			project.owner?.id ??
			project.owner_user_id ??
			null,
			project_status_id:
			project.status?.id ??
			project.project_status_id ??
			null,
			priority_id:
			project.priority?.id ??
			project.priority_id ??
			null,
			project_category_id:
			project.project_category_id ??
			null,
			
			sponsor:
			project.sponsor ??
			null,
			
			planned_progress:
			project.planned_progress ??
			0,
			progress:
			project.progress ??
			0,
			
			start_date:
			this.toDateInput(
				project.start_date
			),
			actual_start_date:
			this.toDateInput(
				project.actual_start_date
			),
			target_end_date:
			this.toDateInput(
				project.target_end_date
			),
			actual_end_date:
			this.toDateInput(
				project.actual_end_date
			),
			
			notes:
			project.notes ??
			null,
			
			currency_code:
			project.currency_code ??
			'MYR',
			planned_cost_total:
			project.planned_cost_total ??
			0,
			actual_cost_total:
			project.actual_cost_total ??
			0,
			committed_cost_total:
			project.committed_cost_total ??
			0,
			planned_funding_total:
			project.planned_funding_total ??
			0,
			actual_funding_total:
			project.actual_funding_total ??
			0,
			budget_notes:
			project.budget_notes ??
			null,
			budget_updated_at:
			this.toDateInput(
				project.budget_updated_at
			),
		});
	}
	
	saveProject(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const value =
		this.form.value;
		
		const payload:
		ProjectUpsertPayload = {
			code:
			String(
				value.code ??
				''
			).trim(),
			
			name:
			String(
				value.name ??
				''
			).trim(),
			
			description:
			value.description ||
			null,
			
			department_id:
			value.department_id ??
			null,
			owner_user_id:
			value.owner_user_id ??
			null,
			project_status_id:
			value.project_status_id ??
			null,
			priority_id:
			value.priority_id ??
			null,
			project_category_id:
			value.project_category_id ??
			null,
			
			sponsor:
			value.sponsor ||
			null,
			
			planned_progress:
			this.percent(
				value.planned_progress
			),
			progress:
			this.percent(
				value.progress
			),
			
			start_date:
			value.start_date ||
			null,
			actual_start_date:
			value.actual_start_date ||
			null,
			target_end_date:
			value.target_end_date ||
			null,
			actual_end_date:
			value.actual_end_date ||
			null,
			
			notes:
			value.notes ||
			null,
			
			currency_code:
			String(
				value.currency_code ||
				'MYR'
			)
			.trim()
			.toUpperCase(),
			
			planned_cost_total:
			this.money(
				value.planned_cost_total
			),
			actual_cost_total:
			this.money(
				value.actual_cost_total
			),
			committed_cost_total:
			this.money(
				value.committed_cost_total
			),
			planned_funding_total:
			this.money(
				value.planned_funding_total
			),
			actual_funding_total:
			this.money(
				value.actual_funding_total
			),
			
			budget_notes:
			value.budget_notes ||
			null,
			budget_updated_at:
			value.budget_updated_at ||
			null,
		};
		
		this.saving = true;
		
		const id$ =
		this.isCreate
		? this.api
		.createProject(payload)
		.pipe(
			map(response =>
				response.id
			)
		)
		: this.api
		.updateProject(
			this.projectId!,
			payload
		)
		.pipe(
			map(() =>
				this.projectId!
			)
		);
		
		id$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: id => {
				this.toast.success(
					this.isCreate
					? 'Project created.'
					: 'Project updated.'
				);
				
				this.router.navigate([
					'/projects',
					id,
				]);
			},
			error: (err: any) => {
				console.error(err);
				
				this.error =
				err?.error?.message ||
				(
					this.isCreate
					? 'Failed to create project.'
					: 'Failed to update project.'
				);
			},
		});
	}
	
	cancel(): void {
		if (this.projectId) {
			this.router.navigate([
				'/projects',
				this.projectId,
			]);
			return;
		}
		
		this.router.navigateByUrl(
			'/projects'
		);
	}
	
	loadBudgetEditor(): void {
		if (!this.projectId) {
			return;
		}
		
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
			
			gantt:
			this.api.getProjectGantt(
				this.projectId
			),
			
			milestones:
			this.api.getProjectMilestones(
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
				
				this.taskOptions =
				this.normalizeTasks(
					result.gantt.tasks
				)
				.map(task => ({
					id: task.id,
					name: task.name,
				}));
				
				this.milestones =
				result.milestones.data ??
				[];
			},
			error: err => {
				console.error(err);
				this.budgetError =
				'Failed to load budget editor.';
			},
		});
	}
	
	emptyBudgetLine(
		type:
		ProjectBudgetLineType =
		'COST'
		): ProjectBudgetLineUpsertPayload {
		return {
			line_type: type,
			code: '',
			name: '',
			planned_amount: 0,
			actual_amount: 0,
			committed_amount: 0,
			sort_order: 0,
			is_active: true,
			notes: null,
		};
	}
	
	newBudgetLine(
		type:
		ProjectBudgetLineType =
		'COST'
		): void {
		this.editingBudgetLineId =
		null;
		this.budgetLineError =
		null;
		this.budgetLineForm =
		this.emptyBudgetLine(type);
	}
	
	editBudgetLine(
		line: ProjectBudgetLineDto
		): void {
		this.editingBudgetLineId =
		line.id;
		
		this.budgetLineError =
		null;
		
		this.budgetLineForm = {
			line_type:
			line.line_type,
			code:
			line.code,
			name:
			line.name,
			planned_amount:
			line.planned_amount,
			actual_amount:
			line.actual_amount,
			committed_amount:
			line.committed_amount,
			sort_order:
			line.sort_order,
			is_active:
			line.is_active,
			notes:
			line.notes ??
			null,
		};
	}
	
	saveBudgetLine(): void {
		if (!this.projectId) {
			return;
		}
		
		this.budgetLineError = null;
		
		const code =
		String(
			this.budgetLineForm.code ??
			''
		).trim();
		
		const name =
		String(
			this.budgetLineForm.name ??
			''
		).trim();
		
		if (!code || !name) {
			this.budgetLineError =
			'Budget line code and name are required.';
			return;
		}
		
		const payload:
		ProjectBudgetLineUpsertPayload = {
			line_type:
			this.budgetLineForm
			.line_type ??
			'COST',
			
			code:
			code.toUpperCase(),
			
			name,
			
			planned_amount:
			this.money(
				this.budgetLineForm
				.planned_amount
			),
			
			actual_amount:
			this.money(
				this.budgetLineForm
				.actual_amount
			),
			
			committed_amount:
			this.money(
				this.budgetLineForm
				.committed_amount
			),
			
			sort_order:
			Number(
				this.budgetLineForm
				.sort_order ??
				0
			),
			
			is_active:
			this.budgetLineForm
			.is_active ??
			true,
			
			notes:
			this.budgetLineForm
			.notes ||
			null,
		};
		
		this.savingBudgetLine = true;
		
		const request$ =
		this.editingBudgetLineId
		? this.api
		.updateProjectBudgetLine(
			this.projectId,
			this.editingBudgetLineId,
			payload
		)
		: this.api
		.createProjectBudgetLine(
			this.projectId,
			payload
		);
		
		request$
		.pipe(
			finalize(() => {
				this.savingBudgetLine = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					this.editingBudgetLineId
					? 'Budget line updated.'
					: 'Budget line created.'
				);
				
				this.newBudgetLine(
					payload.line_type ??
					'COST'
				);
				
				this.loadBudgetEditor();
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 409) {
					this.budgetLineError =
					'This budget line code already exists for the selected type.';
					return;
				}
				
				this.budgetLineError =
				err?.error?.message ||
				'Failed to save budget line.';
			},
		});
	}
	
	deleteBudgetLine(
		line: ProjectBudgetLineDto
		): void {
		if (!this.projectId) {
			return;
		}
		
		const confirmed =
		window.confirm(
			`Delete budget line "${line.code} - ${line.name}"?\n\n` +
			'Allocations linked to this budget line may prevent deletion.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.api.deleteProjectBudgetLine(
			this.projectId,
			line.id
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Budget line deleted.'
				);
				
				if (
					this.allocationForm
					.budget_line_id ===
					line.id
					) {
					this.allocationForm = {
						...this.allocationForm,
						budget_line_id:
						null,
					};
				}
				
				this.loadBudgetEditor();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to delete budget line.'
				);
			},
		});
	}
	
	private emptyAllocation():
	ProjectBudgetAllocationUpsertPayload {
		return {
			budget_line_id: null,
			task_id: null,
			milestone_id: null,
			planned_amount: 0,
			actual_amount: 0,
			committed_amount: 0,
			sort_order: 0,
			is_active: true,
			notes: null,
		};
	}
	
	newAllocation(): void {
		this.editingAllocationId =
		null;
		this.allocationError =
		null;
		this.allocationForm =
		this.emptyAllocation();
	}
	
	editAllocation(
		allocation:
		ProjectBudgetAllocationDto
		): void {
		this.editingAllocationId =
		allocation.id;
		
		this.allocationError =
		null;
		
		this.allocationForm = {
			budget_line_id:
			allocation.budget_line_id,
			task_id:
			allocation.task_id ??
			null,
			milestone_id:
			allocation.milestone_id ??
			null,
			planned_amount:
			allocation.planned_amount ??
			0,
			actual_amount:
			allocation.actual_amount ??
			0,
			committed_amount:
			allocation.committed_amount ??
			0,
			sort_order:
			allocation.sort_order ??
			0,
			is_active:
			allocation.is_active,
			notes:
			allocation.notes ??
			null,
		};
	}
	
	saveAllocation(): void {
		if (!this.projectId) {
			return;
		}
		
		this.allocationError = null;
		
		if (
			!this.allocationForm
			.budget_line_id
			) {
			this.allocationError =
			'Select a budget line.';
			return;
		}
		
		const payload:
		ProjectBudgetAllocationUpsertPayload = {
			budget_line_id:
			Number(
				this.allocationForm
				.budget_line_id
			),
			
			task_id:
			this.allocationForm
			.task_id
			? Number(
				this.allocationForm
				.task_id
			)
			: null,
			
			milestone_id:
			this.allocationForm
			.milestone_id
			? Number(
				this.allocationForm
				.milestone_id
			)
			: null,
			
			planned_amount:
			this.money(
				this.allocationForm
				.planned_amount
			),
			
			actual_amount:
			this.money(
				this.allocationForm
				.actual_amount
			),
			
			committed_amount:
			this.money(
				this.allocationForm
				.committed_amount
			),
			
			sort_order:
			Number(
				this.allocationForm
				.sort_order ??
				0
			),
			
			is_active:
			this.allocationForm
			.is_active ??
			true,
			
			notes:
			this.allocationForm
			.notes ||
			null,
		};
		
		this.savingAllocation = true;
		
		const request$ =
		this.editingAllocationId
		? this.api
		.updateProjectBudgetAllocation(
			this.projectId,
			this.editingAllocationId,
			payload
		)
		: this.api
		.createProjectBudgetAllocation(
			this.projectId,
			payload
		);
		
		request$
		.pipe(
			finalize(() => {
				this.savingAllocation = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					this.editingAllocationId
					? 'Budget allocation updated.'
					: 'Budget allocation created.'
				);
				
				this.newAllocation();
				this.loadBudgetEditor();
			},
			error: (err: any) => {
				console.error(err);
				
				this.allocationError =
				err?.error?.message ||
				'Failed to save budget allocation.';
			},
		});
	}
	
	deleteAllocation(
		allocation:
		ProjectBudgetAllocationDto
		): void {
		if (!this.projectId) {
			return;
		}
		
		if (
			!window.confirm(
				'Delete this budget allocation?'
			)
			) {
			return;
		}
		
		this.api.deleteProjectBudgetAllocation(
			this.projectId,
			allocation.id
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Budget allocation deleted.'
				);
				this.loadBudgetEditor();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to delete budget allocation.'
				);
			},
		});
	}
	
	onAllocationTaskChange(): void {
		if (
			this.allocationForm.task_id
			) {
			this.allocationForm = {
				...this.allocationForm,
				milestone_id: null,
			};
		}
	}
	
	onAllocationMilestoneChange(): void {
		if (
			this.allocationForm.milestone_id
			) {
			this.allocationForm = {
				...this.allocationForm,
				task_id: null,
			};
		}
	}
	
	budgetLineLabel(
		id?: number | null
		): string {
		const line =
		this.budgetLines.find(
			item =>
			item.id ===
			Number(id)
		);
		
		return line
		? `${line.line_type} • ${line.code} - ${line.name}`
		: '—';
	}
	
	allocationTargetLabel(
		allocation:
		ProjectBudgetAllocationDto
		): string {
		if (allocation.task_id) {
			const task =
			this.taskOptions.find(
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
	
	moneyLabel(
		value?: number | null
		): string {
		const currency =
		this.form.get(
			'currency_code'
		)?.value ||
		this.project?.currency_code ||
		'MYR';
		
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
	
	private normalizeTasks(
		value: unknown
		): ProjectTaskGanttDto[] {
		if (Array.isArray(value)) {
			return value as ProjectTaskGanttDto[];
		}
		
		if (
			value &&
			typeof value === 'object' &&
			Array.isArray(
				(value as any).data
			)
			) {
			return (value as any).data;
		}
		
		return [];
	}
	
	private toDateInput(
		value?: string | null
		): string | null {
		if (!value) {
			return null;
		}
		
		if (
			/^\d{4}-\d{2}-\d{2}$/
			.test(value)
			) {
			return value;
		}
		
		const date =
		new Date(value);
		
		if (
			Number.isNaN(
				date.getTime()
			)
			) {
			return null;
		}
		
		const year =
		date.getFullYear();
		
		const month =
		String(
			date.getMonth() + 1
		).padStart(2, '0');
		
		const day =
		String(
			date.getDate()
		).padStart(2, '0');
		
		return `${year}-${month}-${day}`;
	}
	
	private money(
		value: unknown
		): number {
		const number =
		Number(value);
		
		return (
			Number.isFinite(number) &&
			number >= 0
		)
		? number
		: 0;
	}
	
	private percent(
		value: unknown
		): number {
		const number =
		Number(value);
		
		if (!Number.isFinite(number)) {
			return 0;
		}
		
		return Math.max(
			0,
			Math.min(
				100,
				number
			)
		);
	}
}
