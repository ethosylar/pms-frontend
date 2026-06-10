import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';

import {
	ApiService,
	ApiResource,
	ApiCollection,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	StoredFileDto,
	ProjectBudgetLineDto,
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
	imports: [CommonModule, RouterModule, ProjectGanttNgxEmbedComponent],
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
	
	emptyBudgetLine(): ProjectBudgetLineUpsertPayload {
		return {
			line_type: 'COST',
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
		this.budgetLineForm = { ...this.emptyBudgetLine(), line_type: type };
	}
	
	editBudgetLine(line: ProjectBudgetLineDto): void {
		this.editingBudgetLineId = line.id;
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
		if (!this.budgetLineForm.code || !this.budgetLineForm.name) {
			this.toast.error('Code and name are required.');
			return;
		}
		
		const payload: ProjectBudgetLineUpsertPayload = {
			...this.budgetLineForm,
			code: String(this.budgetLineForm.code).trim().toUpperCase(),
			name: String(this.budgetLineForm.name).trim(),
			planned_amount: this.money(this.budgetLineForm.planned_amount),
			actual_amount: this.money(this.budgetLineForm.actual_amount),
			committed_amount: this.money(this.budgetLineForm.committed_amount),
			sort_order: Number(this.budgetLineForm.sort_order ?? 0),
			is_active: this.budgetLineForm.is_active ?? true,
			notes: this.budgetLineForm.notes || null,
		};
		
		this.savingBudgetLine = true;
		
		const req$ = this.editingBudgetLineId
		? this.api.updateProjectBudgetLine(this.projectId, this.editingBudgetLineId, payload)
		: this.api.createProjectBudgetLine(this.projectId, payload);
		
		req$
		.pipe(finalize(() => {
			this.savingBudgetLine = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.editingBudgetLineId ? 'Budget line updated.' : 'Budget line created.');
				this.newBudgetLine(payload.line_type ?? 'COST');
				this.loadBudgetLines();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to save budget line.');
			}
		});
	}
	
	deleteBudgetLine(line: ProjectBudgetLineDto): void {
		if (!confirm(`Delete budget line "${line.code} - ${line.name}"?`)) return;
		
		this.api.deleteProjectBudgetLine(this.projectId, line.id).subscribe({
			next: () => {
				this.toast.success('Budget line deleted.');
				this.loadBudgetLines();
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
}
