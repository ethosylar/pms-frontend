import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';

import {
	ApiService,
	ApiResource,
	ApiCollection,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	StoredFileDto,
	ProjectBudgetLineDto,
	ProjectBudgetLineType,
	ProjectBudgetLineUpsertPayload,
	ProjectBudgetAllocationDto,
	ProjectBudgetAllocationUpsertPayload,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';
import { ProjectGanttNgxEmbedComponent } from '../project-gantt-ngx-embed/project-gantt-ngx-embed';

type TaskVm = ProjectTaskGanttDto & {
	leftPct: number;
	widthPct: number;
	startLabel: string;
	endLabel: string;
};

type TaskFilesVm = {
	taskId: number;
	taskName: string;
	files: StoredFileDto[];
};

type GanttResp = {
	project_id: number;
	tasks: any; // supports array OR {data:[]}
};

@Component({
	standalone: true,
	selector: 'app-project-detail',
	imports: [CommonModule, RouterModule, FormsModule, ProjectGanttNgxEmbedComponent],
	templateUrl: './project-detail.html',
	styleUrls: ['./project-detail.scss'],
})
export class ProjectDetailComponent implements OnInit {
	//@Input() projectId!: number;
	loading = true;
	error: string | null = null;
	
	projectId!: number;
	row: ProjectDto | null = null;
	
	ganttLoading = true;
	ganttError: string | null = null;
	ganttRangeLabel = '';
	tasks: TaskVm[] = [];
	ganttTasks: TaskVm[] = [];
	
	projectFiles: StoredFileDto[] = [];
	projectFilesLoading = false;
	projectFilesError: string | null = null;
	uploadingProjectFile = false;
	
	taskFileGroups: TaskFilesVm[] = [];
	taskFilesLoading = false;
	taskFilesError: string | null = null;
	
	// ✅ Milestones module state
	milestonesLoading = false;
	milestonesError: string | null = null;
	milestones: ProjectMilestoneDto[] = [];
	milestoneMeta = { current_page: 1, last_page: 1, per_page: 5, total: 0 };
	
	budgetLines: ProjectBudgetLineDto[] = [];
	budgetLinesLoading = false;
	budgetLinesError: string | null = null;
	
	budgetLineForm: ProjectBudgetLineUpsertPayload = this.emptyBudgetLine();
	editingBudgetLineId: number | null = null;
	savingBudgetLine = false;
	budgetLineError: string | null = null;
	
	budgetAllocations: ProjectBudgetAllocationDto[] = [];
	
	budgetLoading = false;
	budgetError: string | null = null;
	
	taskOptions: Array<{ id: number; name: string }> = [];
	
	editingAllocationId: number | null = null;
	savingAllocation = false;
	
	allocationForm: ProjectBudgetAllocationUpsertPayload = this.emptyAllocation();
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.projectId = Number(this.route.snapshot.paramMap.get('id'));
		
		this.loading = true;
		this.ganttLoading = true;
		this.error = null;
		
		this.projectId = Number(this.route.snapshot.paramMap.get('id'));
		
		this.loading = true;
		this.error = null;
		
		this.api.getProject(this.projectId)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.loadMilestones(1);
				this.loadProjectFiles();
				this.loadTaskFilesSummary();
				this.cdr.markForCheck();
				this.loadBudgetLines();
				this.loadBudgetModule();
			})
		)
		.subscribe({
			next: (project: ApiResource<ProjectDto>) => {
				this.row = project.data;
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load project.';
			},
		});
	}
	
	back(): void {
		this.router.navigateByUrl('/projects');
	}
	
	edit(): void {
		this.router.navigate(['/projects', this.projectId, 'edit']);
	}
	
	openGantt(): void {
		this.router.navigate(['/projects', this.projectId, 'gantt']);
	}
	
	// -----------------------------
	// ✅ Milestones module actions
	// -----------------------------
	loadMilestones(page = 1): void {
		if (!this.projectId) return;
		
		this.milestonesLoading = true;
		this.milestonesError = null;
		
		this.api.getProjectMilestones(this.projectId, {
			page,
			per_page: this.milestoneMeta.per_page,
		})
		.pipe(finalize(() => {
			this.milestonesLoading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiCollection<ProjectMilestoneDto>) => {
				this.milestones = res.data ?? [];
				const m = res.meta ?? {};
				this.milestoneMeta = {
					current_page: m.current_page ?? page,
					last_page: m.last_page ?? 1,
					per_page: m.per_page ?? this.milestoneMeta.per_page,
					total: m.total ?? this.milestones.length,
				};
			},
			error: (err) => {
				console.error(err);
				this.milestonesError = 'Failed to load milestones.';
			}
		});
	}
	
	manageMilestones(): void {
		this.router.navigate(['/projects', this.projectId, 'milestones']);
	}
	
	addMilestone(): void {
		this.router.navigate(['/projects', this.projectId, 'milestones', 'new']);
	}
	
	editMilestone(m: ProjectMilestoneDto): void {
		this.router.navigate(['/projects', this.projectId, 'milestones', m.id]);
	}
	
	deleteMilestone(m: ProjectMilestoneDto): void {
		if (!confirm(`Delete milestone "${m.name}"?`)) return;
		
		this.api.deleteProjectMilestone(this.projectId, m.id)
		.pipe(finalize(() => this.cdr.detectChanges()))
		.subscribe({
			next: () => {
				this.toast.success('Milestone deleted.');
				this.loadMilestones(this.milestoneMeta.current_page);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to delete milestone.');
			}
		});
	}
	
	badgeClass(status: string): string {
		const s = (status || '').toUpperCase();
		if (s === 'DONE' || s === 'COMPLETED') return 'bg-success';
		if (s === 'CANCELLED') return 'bg-secondary';
		return 'bg-warning text-dark'; // PENDING / default
	}
	
	// ---------- inline gantt helpers ----------
	private buildVm(raw: ProjectTaskGanttDto[]): TaskVm[] {
		const today = this.toDay(new Date());
		
		const starts = raw
		.map((t) => this.parseDate(t.start_date) ?? this.parseDate(t.end_date) ?? today)
		.map((d) => d.getTime());
		
		const ends = raw
		.map((t) => this.parseDate(t.end_date) ?? this.parseDate(t.start_date) ?? today)
		.map((d) => d.getTime());
		
		const minT = starts.length ? Math.min(...starts) : today.getTime();
		const maxT = ends.length ? Math.max(...ends) : today.getTime();
		
		const rangeStart = new Date(minT);
		const rangeEnd = new Date(maxT);
		if (rangeEnd.getTime() <= rangeStart.getTime()) rangeEnd.setDate(rangeEnd.getDate() + 1);
		
		const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
		this.ganttRangeLabel = `${this.fmt(rangeStart)} → ${this.fmt(rangeEnd)}`;
		
		return raw.map((t) => {
			const s = this.parseDate(t.start_date) ?? this.parseDate(t.end_date) ?? today;
			const e = this.parseDate(t.end_date) ?? this.parseDate(t.start_date) ?? today;
			
			const left = ((s.getTime() - rangeStart.getTime()) / rangeMs) * 100;
			const width = Math.max(2, ((e.getTime() - s.getTime()) / rangeMs) * 100 + 2);
			
			return {
				...t,
				leftPct: this.clamp(left, 0, 100),
				widthPct: this.clamp(width, 2, 100),
				startLabel: this.fmt(s),
				endLabel: this.fmt(e),
			};
		});
	}
	
	private parseDate(v?: string | null): Date | null {
		if (!v) return null;
		const d = new Date(`${v}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : this.toDay(d);
	}
	
	private toDay(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
	
	private fmt(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}
	
	private clamp(n: number, a: number, b: number): number {
		return Math.max(a, Math.min(b, n));
	}
	
	statusBadgeClass(t: ProjectTaskGanttDto): string {
		const code = (t.status_code ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return 'bg-success';
		if (code === 'CANCELLED') return 'bg-secondary';
		if (code === 'IN_PROGRESS') return 'bg-primary';
		return 'bg-warning text-dark';
	}
	
	loadProjectFiles(): void {
		if (!this.projectId) return;
		
		this.projectFilesLoading = true;
		this.projectFilesError = null;
		
		this.api.getProjectFiles(this.projectId, { per_page: 100 })
		.pipe(finalize(() => {
			this.projectFilesLoading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => {
				this.projectFiles = res.data ?? [];
			},
			error: (err) => {
				console.error(err);
				this.projectFilesError = 'Failed to load project files.';
			}
		});
	}
	
	onProjectFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		
		this.uploadingProjectFile = true;
		this.projectFilesError = null;
		
		this.api.uploadProjectFile(this.projectId, file)
		.pipe(finalize(() => {
			this.uploadingProjectFile = false;
			input.value = '';
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success('Project file uploaded.');
				this.loadProjectFiles();
			},
			error: (err) => {
				console.error(err);
				this.projectFilesError = 'Failed to upload project file.';
			}
		});
	}
	
	downloadProjectFile(file: StoredFileDto): void {
		this.api.downloadProjectFile(this.projectId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = file.original_name || `project-file-${file.id}`;
				a.click();
				window.URL.revokeObjectURL(url);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to download project file.');
			}
		});
	}
	
	removeProjectFile(file: StoredFileDto): void {
		if (!confirm(`Remove file "${file.original_name}"?`)) return;
		
		this.api.detachProjectFile(this.projectId, file.id).subscribe({
			next: () => {
				this.toast.success('Project file removed.');
				this.loadProjectFiles();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to remove project file.');
			}
		});
	}
	
	formatBytes(size?: number | null): string {
		const bytes = Number(size ?? 0);
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
	
	loadTaskFilesSummary(): void {
		if (!this.projectId) return;
		
		this.taskFilesLoading = true;
		this.taskFilesError = null;
		
		this.api.getProjectGantt(this.projectId).pipe(
			finalize(() => {
				this.taskFilesLoading = false;
				this.cdr.detectChanges();
			})
			).subscribe({
				next: (res) => {
					const tasks = Array.isArray(res?.tasks) ? res.tasks : [];
					
					if (!tasks.length) {
						this.taskFileGroups = [];
						return;
					}
					
					forkJoin(
						tasks.map(task =>
							this.api.getTaskFiles(task.id, { per_page: 100 }).pipe(
								finalize(() => {}),
								// keep page stable even if one task fails
								catchError((err) => {
									console.error(err);
									return of({ data: [] as StoredFileDto[] });
								})
							)
						)
						).subscribe({
							next: (allResults) => {
								this.taskFileGroups = tasks
								.map((task, idx) => ({
									taskId: task.id,
									taskName: task.name,
									files: allResults[idx]?.data ?? []
								}))
								.filter(group => group.files.length > 0);
								
								this.cdr.detectChanges();
							},
							error: (err) => {
								console.error(err);
								this.taskFilesError = 'Failed to load task files.';
							}
						});
				},
				error: (err) => {
					console.error(err);
					this.taskFilesError = 'Failed to load task files.';
				}
			});
	}
	
	previewProjectFile(projectId: number,file: StoredFileDto): void {
		this.api.downloadProjectFile(projectId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				window.open(url, '_blank', 'noopener,noreferrer');
				setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to open project file.');
			}
		});
	}
	
	previewTaskFileFromProject(taskId: number, file: StoredFileDto): void {
		this.api.downloadTaskFile(taskId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				window.open(url, '_blank', 'noopener,noreferrer');
				setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to open task file.');
			}
		});
	}
	
	downloadTaskFileFromProject(taskId: number, file: StoredFileDto): void {
		this.api.downloadTaskFile(taskId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = file.original_name || `task-file-${file.id}`;
				a.click();
				window.URL.revokeObjectURL(url);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to download task file.');
			}
		});
	}
	
	canPreviewFile(file: StoredFileDto): boolean {
		const mime = (file.mime_type || '').toLowerCase();
		return (
			mime.startsWith('image/') ||
			mime === 'application/pdf' ||
			mime.startsWith('text/')
		);
	}
	
	loadBudgetLines(): void {
		if (!this.projectId) return;
		
		this.budgetLinesLoading = true;
		this.budgetLinesError = null;
		
		this.api.getProjectBudgetLines(this.projectId, { per_page: 100 })
		.pipe(finalize(() => {
			this.budgetLinesLoading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => this.budgetLines = res.data ?? [],
			error: (err) => {
				console.error(err);
				this.budgetLinesError = 'Failed to load budget lines.';
			}
		});
	}
	
	emptyBudgetLine(type: ProjectBudgetLineType = 'COST'): ProjectBudgetLineUpsertPayload {
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
	
	newBudgetLine(type: ProjectBudgetLineType = 'COST'): void {
		this.editingBudgetLineId = null;
		this.budgetLineError = null;
		this.budgetLineForm = this.emptyBudgetLine(type);
	}
	
	editBudgetLine(line: ProjectBudgetLineDto): void {
		this.editingBudgetLineId = line.id;
		this.budgetLineError = null;
		
		this.budgetLineForm = {
			line_type: line.line_type,
			code: line.code,
			name: line.name,
			planned_amount: line.planned_amount,
			actual_amount: line.actual_amount,
			committed_amount: line.committed_amount,
			sort_order: line.sort_order,
			is_active: line.is_active,
			notes: line.notes ?? null,
		};
	}
	
	saveBudgetLine(): void {
		this.budgetLineError = null;
		
		const code = String(this.budgetLineForm.code ?? '').trim();
		const name = String(this.budgetLineForm.name ?? '').trim();
		
		if (!code || !name) {
			this.budgetLineError = 'Budget line code and name are required.';
			return;
		}
		
		const payload: ProjectBudgetLineUpsertPayload = {
			line_type: this.budgetLineForm.line_type ?? 'COST',
			code: code.toUpperCase(),
			name,
			planned_amount: this.money(this.budgetLineForm.planned_amount),
			actual_amount: this.money(this.budgetLineForm.actual_amount),
			committed_amount: this.money(this.budgetLineForm.committed_amount),
			sort_order: Number(this.budgetLineForm.sort_order ?? 0),
			is_active: this.budgetLineForm.is_active ?? true,
			notes: this.budgetLineForm.notes || null,
		};
		
		this.savingBudgetLine = true;
		
		const request$ = this.editingBudgetLineId
		? this.api.updateProjectBudgetLine(
			this.projectId,
			this.editingBudgetLineId,
			payload
		)
		: this.api.createProjectBudgetLine(this.projectId, payload);
		
		request$
		.pipe(
			finalize(() => {
				this.savingBudgetLine = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (response) => {
				this.toast.success(
					this.editingBudgetLineId
					? 'Budget line updated.'
					: 'Budget line created.'
				);
				
				const createdLine =
				'data' in response ? response.data : null;
				
				if (createdLine) {
					// Immediately make the new line selectable.
					this.budgetLines = [
						...this.budgetLines.filter(x => x.id !== createdLine.id),
						createdLine
					];
					
					this.allocationForm = {
						...this.allocationForm,
						budget_line_id: createdLine.id
					};
				}
				
				this.newBudgetLine(payload.line_type ?? 'COST');
				this.loadBudgetModule();
			},
			error: (err) => {
				console.error(err);
				
				if (err?.status === 409) {
					this.budgetLineError =
					'This budget-line code already exists for the selected type.';
					} else {
					this.budgetLineError = 'Failed to save budget line.';
				}
				
				this.cdr.detectChanges();
			}
		});
	}
	
	deleteBudgetLine(line: ProjectBudgetLineDto): void {
		if (!confirm(`Delete budget line "${line.code} - ${line.name}"?`)) {
			return;
		}
		
		this.api.deleteProjectBudgetLine(this.projectId, line.id)
		.subscribe({
			next: () => {
				this.toast.success('Budget line deleted.');
				
				if (this.allocationForm.budget_line_id === line.id) {
					this.allocationForm = {
						...this.allocationForm,
						budget_line_id: null
					};
				}
				
				this.loadBudgetModule();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to delete budget line.');
			}
		});
	}
	
	budgetLinesByType(type: ProjectBudgetLineType): ProjectBudgetLineDto[] {
		return this.budgetLines.filter(x => x.line_type === type);
	}
	
	budgetTotal(type: ProjectBudgetLineType, field: 'planned_amount' | 'actual_amount' | 'committed_amount'): number {
		return this.budgetLinesByType(type).reduce((sum, x) => sum + Number(x[field] ?? 0), 0);
	}
	
	moneyLabel(value?: number | null): string {
		const currency = this.row?.currency_code || 'MYR';
		return `${currency} ${Number(value ?? 0).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
		})}`;
	}
	
	private money(value: unknown): number {
		const n = Number(value);
		return Number.isFinite(n) && n >= 0 ? n : 0;
	}
	
	private emptyAllocation(): ProjectBudgetAllocationUpsertPayload {
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
	
	loadBudgetModule(): void {
		if (!this.projectId) return;
		
		this.budgetLoading = true;
		this.budgetError = null;
		
		forkJoin({
			lines: this.api.getProjectBudgetLines(this.projectId, { per_page: 100 }),
			allocations: this.api.getProjectBudgetAllocations(this.projectId, { per_page: 100 }),
			gantt: this.api.getProjectGantt(this.projectId),
		})
		.pipe(finalize(() => {
			this.budgetLoading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: ({ lines, allocations, gantt }) => {
				this.budgetLines = lines.data ?? [];
				this.budgetAllocations = allocations.data ?? [];
				
				const tasks = Array.isArray(gantt?.tasks) ? gantt.tasks : [];
				this.taskOptions = tasks.map(t => ({ id: t.id, name: t.name }));
			},
			error: (err) => {
				console.error(err);
				this.budgetError = 'Failed to load budget module.';
			}
		});
	}
	
	newAllocation(): void {
		this.editingAllocationId = null;
		this.allocationForm = this.emptyAllocation();
	}
	
	editAllocation(a: ProjectBudgetAllocationDto): void {
		this.editingAllocationId = a.id;
		this.allocationForm = {
			budget_line_id: a.budget_line_id,
			task_id: a.task_id ?? null,
			milestone_id: a.milestone_id ?? null,
			planned_amount: a.planned_amount ?? 0,
			actual_amount: a.actual_amount ?? 0,
			committed_amount: a.committed_amount ?? 0,
			sort_order: a.sort_order ?? 0,
			is_active: a.is_active,
			notes: a.notes ?? null,
		};
	}
	
	saveAllocation(): void {
		if (
			!this.allocationForm.task_id &&
			!this.allocationForm.milestone_id
			) {
			this.toast.error('Select either a task or milestone.');
			return;
		}
		
		const payload: ProjectBudgetAllocationUpsertPayload = {
			budget_line_id: Number(this.allocationForm.budget_line_id),
			task_id: this.allocationForm.task_id ? Number(this.allocationForm.task_id) : null,
			milestone_id: this.allocationForm.milestone_id ? Number(this.allocationForm.milestone_id) : null,
			planned_amount: this.money(this.allocationForm.planned_amount),
			actual_amount: this.money(this.allocationForm.actual_amount),
			committed_amount: this.money(this.allocationForm.committed_amount),
			sort_order: Number(this.allocationForm.sort_order ?? 0),
			is_active: this.allocationForm.is_active ?? true,
			notes: this.allocationForm.notes || null,
		};
		
		this.savingAllocation = true;
		
		const req$ = this.editingAllocationId
		? this.api.updateProjectBudgetAllocation(this.projectId, this.editingAllocationId, payload)
		: this.api.createProjectBudgetAllocation(this.projectId, payload);
		
		req$
		.pipe(finalize(() => {
			this.savingAllocation = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.editingAllocationId ? 'Budget allocation updated.' : 'Budget allocation created.');
				this.newAllocation();
				this.loadBudgetModule();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to save budget allocation.');
			}
		});
	}
	
	deleteAllocation(a: ProjectBudgetAllocationDto): void {
		if (!confirm('Delete this budget allocation?')) return;
		
		this.api.deleteProjectBudgetAllocation(this.projectId, a.id).subscribe({
			next: () => {
				this.toast.success('Budget allocation deleted.');
				this.loadBudgetModule();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to delete budget allocation.');
			}
		});
	}
	
	budgetLineLabel(id?: number | null): string {
		const line = this.budgetLines.find(x => x.id === Number(id));
		return line ? `${line.line_type} • ${line.code} - ${line.name}` : '—';
	}
	
	allocationTargetLabel(a: ProjectBudgetAllocationDto): string {
		if (a.task_id) {
			const task = this.taskOptions.find(t => t.id === a.task_id);
			return `Task: ${task?.name ?? '#' + a.task_id}`;
		}
		
		if (a.milestone_id) {
			const milestone = this.milestones?.find(m => m.id === a.milestone_id);
			return `Milestone: ${milestone?.name ?? '#' + a.milestone_id}`;
		}
		
		return 'Project level';
	}
	
	budgetLineTotal(type: ProjectBudgetLineType, field: 'planned_amount' | 'actual_amount' | 'committed_amount'): number {
		return this.budgetLinesByType(type).reduce((sum, x) => sum + Number(x[field] ?? 0), 0);
	}
	
	allocationTotal(field: 'planned_amount' | 'actual_amount' | 'committed_amount'): number {
		return this.budgetAllocations.reduce((sum, x) => sum + Number(x[field] ?? 0), 0);
	}
	
	onAllocationTaskChange(): void {
		if (this.allocationForm.task_id) {
			this.allocationForm = {
				...this.allocationForm,
				milestone_id: null
			};
		}
	}
	
	onAllocationMilestoneChange(): void {
		if (this.allocationForm.milestone_id) {
			this.allocationForm = {
				...this.allocationForm,
				task_id: null
			};
		}
	}
	
	allocationLineType(a: ProjectBudgetAllocationDto): 'COST' | 'FUND' | null {
		if (a.budget_line?.line_type === 'COST' || a.budget_line?.line_type === 'FUND') {
			return a.budget_line.line_type;
		}
		
		const line = this.budgetLines.find(x => x.id === a.budget_line_id);
		return line?.line_type ?? null;
	}
	
	allocationTotalByType(
		type: 'COST' | 'FUND',
		field: 'planned_amount' | 'actual_amount' | 'committed_amount'
		): number {
		return this.budgetAllocations
		.filter(a => this.allocationLineType(a) === type)
		.reduce((sum, a) => sum + Number(a[field] ?? 0), 0);
	}
	
	allocationVariance(field: 'planned_amount' | 'actual_amount' | 'committed_amount'): number {
		const funding = this.allocationTotalByType('FUND', field);
		const cost = this.allocationTotalByType('COST', field);
		return funding - cost;
	}
	
	varianceClass(value: number | null | undefined): string {
		if ((value ?? 0) < 0) return 'text-danger fw-semibold';
		if ((value ?? 0) > 0) return 'text-success fw-semibold';
		return 'fw-semibold';
	}
	
	
}
