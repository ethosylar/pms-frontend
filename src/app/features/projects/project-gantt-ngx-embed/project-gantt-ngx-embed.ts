import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

import { NgxGanttModule, GanttItem, GanttViewType } from '@worktile/gantt';
import {
	ApiService,
	ProjectTaskGanttDto,
	ProjectMilestoneDto,
	ApiCollection
} from '../../../core/services/api.service';

type GanttVmItem = GanttItem & {
	color?: string;
	kind?: 'task' | 'milestone';
	_milestone?: string | null;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt-ngx-embed',
	imports: [CommonModule, NgxGanttModule],
	templateUrl: './project-gantt-ngx-embed.html',
	styleUrls: ['./project-gantt-ngx-embed.scss'],
})
export class ProjectGanttNgxEmbedComponent implements OnInit {
	@Input({ required: true }) projectId!: number;
	@Input() projectStartDate: string | null = null;
	@Input() projectEndDate: string | null = null;
	
	loading = true;
	error: string | null = null;
	
	viewType = GanttViewType.week;          // ✅ lock week
	items: GanttVmItem[] = [];
	
	// ✅ force viewport range so header always appears
	rangeStart: number | null = null;
	rangeEnd: number | null = null;
	private readonly DAY = 86400;
	
	constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}
	
	ngOnInit(): void {
		if (this.projectId > 0) {
			this.load();
		}
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['projectId'] && !changes['projectId'].firstChange && this.projectId > 0) {
			this.load();
		}
	}
	
	private load(): void {
		this.loading = true;
		this.error = null;
		
		forkJoin({
			gantt: this.api.getProjectGantt(this.projectId),
			milestones: this.api.getProjectMilestones(this.projectId, { per_page: 200 }),
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: ({ gantt, milestones }) => {
				const rawTasks: unknown = gantt?.tasks;
				const tasks: ProjectTaskGanttDto[] = Array.isArray(rawTasks)
					? (rawTasks as ProjectTaskGanttDto[])
					: (Array.isArray((rawTasks as { data?: unknown[] } | null)?.data)
						? ((rawTasks as { data: ProjectTaskGanttDto[] }).data ?? [])
						: []);
				
				const ms: ProjectMilestoneDto[] =
				(milestones as ApiCollection<ProjectMilestoneDto>)?.data ?? [];
				
				const taskItems = tasks
				.map((t) => this.toTaskItem(t))
				.filter((x): x is GanttVmItem => !!x);
				
				const milestoneItems = ms
				.map((m) => this.toMilestoneItem(m))
				.filter((x): x is GanttVmItem => !!x);
				
				this.items = [...milestoneItems, ...taskItems];
				
				const minItemStart = this.minEpoch(this.items.map(i => i.start));
				const maxItemEnd = this.maxEpoch(this.items.map(i => i.end));
				
				const ps = this.toEpochSec(this.projectStartDate) ?? minItemStart ?? this.todaySec();
				const pe = this.toEpochSec(this.projectEndDate) ?? maxItemEnd ?? (ps + 7 * this.DAY);
				
				this.rangeStart = ps;
				this.rangeEnd = pe <= ps ? (ps + this.DAY) : pe;
				
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load gantt data.';
				this.cdr.detectChanges();
			},
		});
	}
	
	private toEpochAny(v: number | Date | undefined): number | null {
		if (typeof v === 'number' && Number.isFinite(v)) return v;
		if (v instanceof Date && !Number.isNaN(v.getTime())) return Math.floor(v.getTime() / 1000);
		return null;
	}
	
	private minEpoch(values: Array<number | Date | undefined>): number | null {
		const nums = values
			.map(v => this.toEpochAny(v))
			.filter((n): n is number => n != null && Number.isFinite(n));
		return nums.length ? Math.min(...nums) : null;
	}
	
	private maxEpoch(values: Array<number | Date | undefined>): number | null {
		const nums = values
			.map(v => this.toEpochAny(v))
			.filter((n): n is number => n != null && Number.isFinite(n));
		return nums.length ? Math.max(...nums) : null;
	}
	
	private todaySec(): number {
		return Math.floor(Date.now() / 1000);
	}
	
	private toEpochSec(v: string | null | undefined): number | null {
		if (!v) return null;
		const d = new Date(`${v}T00:00:00`);
		if (Number.isNaN(d.getTime())) return null;
		return Math.floor(d.getTime() / 1000);
	}
	
	private toTaskItem(t: ProjectTaskGanttDto): GanttVmItem | null {
		const start = this.toEpochSec(t.start_date);
		const end = this.toEpochSec(t.end_date ?? t.start_date);
		if (start == null || end == null) return null;
		
		// ensure at least 1-day width for visibility
		const fixedEnd = end <= start ? (start + this.DAY) : end;
		
		return {
			id: String(t.id),
			title: t.name,
			start,
			end: fixedEnd,
			progress: Math.max(0, Math.min(100, Number(t.progress ?? 0))),
			color: (t.task_color ?? null) || this.colorByStatus(t.status_code),
			kind: 'task',
			_milestone: t.milestone?.name ?? null,
		};
	}
	
	private toMilestoneItem(m: ProjectMilestoneDto): GanttVmItem | null {
		const d = this.toEpochSec(m.milestone_date);
		if (d == null) return null;
		
		return {
			id: `MS_${m.id}`,
			title: `◇ ${m.name}`,
			start: d,
			end: d + this.DAY,
			progress: 0,
			color: '#0d6efd',
			kind: 'milestone',
		};
	}
	
	itemColor(item: unknown): string {
		const c = (item as any)?.color;
		return (typeof c === 'string' && c.trim() !== '') ? c : '#111827';
	}
	
	private colorByStatus(code?: string | null): string {
		const c = String(code ?? '').toUpperCase();
		if (c === 'DONE' || c === 'COMPLETED') return '#198754';
		if (c === 'CANCELLED') return '#6c757d';
		if (c === 'AT_RISK') return '#dc3545';
		if (c === 'DELAYED') return '#ffc107';
		if (c === 'IN_PROGRESS') return '#0d6efd';
		return '#0dcaf0';
	}
	
	get safeStart(): number { return this.rangeStart ?? this.todaySec(); }
	get safeEnd(): number {
		const start = this.safeStart;
		return this.rangeEnd ?? (start + 7 * this.DAY);
	}
	
	getMilestoneName(item: unknown): string | null {
		const m = (item as any)?._milestone;
		return (typeof m === 'string' && m.trim()) ? m : null;
	}
	
	toMs(v: unknown): number | null {
		if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
		if (typeof v === 'number' && Number.isFinite(v)) return v * 1000;
		return null;
	}
}
