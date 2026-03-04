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
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';
import { ProjectGanttNgxEmbedComponent } from '../project-gantt-ngx-embed/project-gantt-ngx-embed';

type TaskVm = ProjectTaskGanttDto & {
	leftPct: number;
	widthPct: number;
	startLabel: string;
	endLabel: string;
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
	
	// ✅ Milestones module state
	milestonesLoading = false;
	milestonesError: string | null = null;
	milestones: ProjectMilestoneDto[] = [];
	milestoneMeta = { current_page: 1, last_page: 1, per_page: 5, total: 0 };
	
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
		
		forkJoin({
			project: this.api.getProject(this.projectId),
			gantt: this.api.getProjectGantt(this.projectId).pipe(
				catchError((err) => {
					console.error(err);
					this.ganttError = 'Failed to load tasks.';
					return of({ project_id: this.projectId, tasks: [] as ProjectTaskGanttDto[] });
				})
			),
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.ganttLoading = false;
				this.cdr.detectChanges();
				this.loadMilestones(1);
			})
		)
		.subscribe({
			next: ({ project, gantt }: { project: ApiResource<ProjectDto>; gantt: any }) => {
				this.row = project.data;
				
				const rawTasks: ProjectTaskGanttDto[] = gantt?.tasks ?? [];
				const tasks = Array.isArray(gantt.tasks) ? gantt.tasks : (gantt.tasks?.data ?? []);
				this.tasks = tasks;
				this.ganttTasks = tasks;
				//this.tasks = this.buildVm(rawTasks);
				
				this.cdr.detectChanges();
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
	
}
