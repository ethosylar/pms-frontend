import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiService, ProjectDto, ApiResource, ProjectTaskGanttDto } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

type TaskVm = ProjectTaskGanttDto & {
	leftPct: number;
	widthPct: number;
	startLabel: string;
	endLabel: string;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt',
	imports: [CommonModule, RouterModule],
	templateUrl: './project-gantt.html',
	styleUrls: ['./project-gantt.scss'],
})
export class ProjectGanttComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	projectId!: number;
	project: ProjectDto | null = null;
	
	tasks: TaskVm[] = [];
	rangeLabel = '';
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.projectId = Number(this.route.snapshot.paramMap.get('id'));
		this.load();
	}
	
	back(): void {
		this.router.navigate(['/projects', this.projectId]);
	}
	
	add(): void {
		this.router.navigate(['/projects', this.projectId, 'tasks', 'new']);
	}
	
	edit(t: ProjectTaskGanttDto): void {
		this.router.navigate(['/projects', this.projectId, 'tasks', t.id]);
	}
	
	delete(t: ProjectTaskGanttDto): void {
		if (!confirm(`Delete task "${t.name}"?`)) return;
		
		this.api.deleteProjectTask(t.id).subscribe({
			next: () => {
				this.toast.success('Task deleted.');
				this.load();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to delete task.');
			}
		});
	}
	
	private load(): void {
		this.loading = true;
		this.error = null;
		
		// load project header + gantt data
		let projLoaded = false;
		let ganttLoaded = false;
		
		const done = () => {
			if (projLoaded && ganttLoaded) {
				this.loading = false;
				this.cdr.detectChanges();
			}
		};
		
		this.api.getProject(this.projectId)
		.pipe(finalize(() => { projLoaded = true; done(); }))
		.subscribe({
			next: (res: ApiResource<ProjectDto>) => { this.project = res.data; },
			error: (err) => { console.error(err); this.error = 'Failed to load project.'; }
		});
		
		this.api.getProjectGantt(this.projectId)
		.pipe(finalize(() => { ganttLoaded = true; done(); }))
		.subscribe({
			next: (res) => {
				const raw = res.tasks ?? [];
				this.tasks = this.buildVm(raw);
			},
			error: (err) => { console.error(err); this.error = 'Failed to load tasks.'; }
		});
	}
	
	private buildVm(raw: ProjectTaskGanttDto[]): TaskVm[] {
		const today = this.toDay(new Date());
		
		const starts = raw
		.map(t => this.parseDate(t.start_date) ?? this.parseDate(t.end_date) ?? today)
		.map(d => d.getTime());
		
		const ends = raw
		.map(t => this.parseDate(t.end_date) ?? this.parseDate(t.start_date) ?? today)
		.map(d => d.getTime());
		
		const minT = starts.length ? Math.min(...starts) : today.getTime();
		const maxT = ends.length ? Math.max(...ends) : today.getTime();
		
		// ensure non-zero range
		const rangeStart = new Date(minT);
		const rangeEnd = new Date(maxT);
		if (rangeEnd.getTime() <= rangeStart.getTime()) {
			rangeEnd.setDate(rangeEnd.getDate() + 1);
		}
		
		const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
		
		this.rangeLabel = `${this.fmt(rangeStart)} → ${this.fmt(rangeEnd)}`;
		
		return raw.map(t => {
			const s = this.parseDate(t.start_date) ?? this.parseDate(t.end_date) ?? today;
			const e = this.parseDate(t.end_date) ?? this.parseDate(t.start_date) ?? today;
			
			const left = ((s.getTime() - rangeStart.getTime()) / rangeMs) * 100;
			const width = Math.max(2, ((e.getTime() - s.getTime()) / rangeMs) * 100 + 2); // +2 for visibility
			
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
		// treat API date as yyyy-mm-dd
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
	
	statusBadge(t: ProjectTaskGanttDto): string {
		// const code = (t.status?.code ?? '').toUpperCase();
		const code = (t.status_code ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return 'bg-success';
		if (code === 'CANCELLED') return 'bg-secondary';
		if (code === 'IN_PROGRESS') return 'bg-primary';
		return 'bg-warning text-dark';
	}
}
