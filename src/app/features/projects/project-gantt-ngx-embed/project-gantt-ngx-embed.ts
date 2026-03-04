import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
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
		console.log('Gantt Embed Inputs:', {
			projectId: this.projectId,
			projectStart: this.projectStartDate,
			projectEnd: this.projectEndDate,
			typeofStart: typeof this.projectStartDate,
			typeofEnd: typeof this.projectEndDate
		});
		this.load();
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
				
				// const minItemStart = this.minEpoch(this.items.map(i => i.start));
				// const maxItemEnd = this.maxEpoch(this.items.map(i => i.end));
				
				// const ps = this.toEpochMs(this.projectStartDate) ?? minItemStart ?? this.nowMs();
				// const pe = this.toEpochMs(this.projectEndDate) ?? maxItemEnd ?? (ps + 7 * this.DAY * 1000);
				
				// this.rangeStart = ps;
				// this.rangeEnd = pe <= ps ? (ps + this.DAY * 1000) : pe;
				
				const minItem = this.minEpoch(this.items.map(i => i.start));
				const maxItem = this.maxEpoch(this.items.map(i => i.end));
				
				// Prefer project dates, but fall back intelligently
				let rangeStart = this.toEpochMs(this.projectStartDate);
				let rangeEnd   = this.toEpochMs(this.projectEndDate);
				
				if (rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) {
					// Project dates missing or invalid → use items + some padding
					rangeStart = minItem ?? this.nowMs();
					rangeEnd   = maxItem ?? (rangeStart + 14 * this.DAY * 1000); // at least 2 weeks
					
					// Add some padding so items aren't glued to edges
					const duration = rangeEnd - rangeStart;
					rangeStart -= duration * 0.1;  // 10% left padding
					rangeEnd   += duration * 0.1;  // 10% right padding
				}
				
				this.rangeStart = rangeStart;
				this.rangeEnd   = rangeEnd;
				
				console.log('Final visible range:', {
					start: new Date(rangeStart).toISOString(),
					end:   new Date(rangeEnd).toISOString()
				});
				
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
		if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
		if (typeof v === 'number' && Number.isFinite(v)) return v;    // ← assume ms
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
	
	private nowMs(): number {
		return Date.now();
	}
	
	private toEpochMs(v: string | null | undefined): number | null {
		if (!v) return null;
		const d = new Date(`${v}T00:00:00`);
		if (Number.isNaN(d.getTime())) return null;
		return d.getTime();           // ← already ms
	}
	
	private toTaskItem(t: ProjectTaskGanttDto): GanttVmItem | null {
		const start = this.toEpochMs(t.start_date);
		let   end   = this.toEpochMs(t.end_date);
		
		if (start == null) return null;
		if (end == null || end <= start) {
			end = start + 86400 * 1000; // 1 day
		}
		
		return {
			id: String(t.id),
			title: t.name || "Unnamed",
			start,
			end,
			progress: Number(t.progress ?? 0),
			color: this.colorByStatus(t.status_code) || '#0d6efd',
			kind: 'task',
			_milestone: t.milestone?.name ?? null,
		};
	}
	
	private toMilestoneItem(m: ProjectMilestoneDto): GanttVmItem | null {
		const d = this.toEpochMs(m.milestone_date);
		if (d == null) return null;
		
		return {
			id: `MS_${m.id}`,
			title: `◇ ${m.name}`,
			start: d,
			end: d + this.DAY * 1000,
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
	
	get safeStart(): number { return this.rangeStart ?? this.nowMs(); }
	get safeEnd(): number {
		const start = this.safeStart;
		return this.rangeEnd ?? (start + 7 * this.DAY * 1000);
	}
	
	getMilestoneName(item: unknown): string | null {
		const m = (item as any)?._milestone;
		return (typeof m === 'string' && m.trim()) ? m : null;
	}
	
	toMs(v: unknown): number | null {
		if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getTime();
		if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
		return null;
	}
	
	private dateToIso(value: number | Date | undefined): string {
		if (value == null) return '—';
		const d = value instanceof Date ? value : new Date(value);
		return Number.isNaN(d.getTime()) ? 'Invalid' : d.toISOString().split('T')[0];
	}
}
