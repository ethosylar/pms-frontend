import { CommonModule } from '@angular/common';
import {
	Component,
	Input,
	ViewChild,
	ElementRef,
	AfterViewInit,
	OnDestroy,
	OnChanges,
	SimpleChanges,
	ChangeDetectorRef,
} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';


import {
	ApiService,
	ProjectTaskGanttDto,
	ProjectMilestoneDto,
	ApiCollection,
} from '../../../core/services/api.service';

type GanttTask = {
	id: string;
	name: string;
	start: string;
	end: string;
	progress: number;
	dependencies?: string;
	custom_class?: string;
	_pmsColor?: string | null;
	_pmsStatus?: string | null;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt-embed',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './project-gantt-embed.html',
	styleUrls: ['./project-gantt-embed.scss'],
})
export class ProjectGanttEmbedComponent implements AfterViewInit, OnDestroy, OnChanges {
	@Input({ required: true }) projectId!: number;
	
	// used for dashed “project start/end” markers + clamp
	@Input() projectStartDate: string | null = null;
	@Input() projectEndDate: string | null = null;
	
	// parent loads these already
	@Input() milestones: ProjectMilestoneDto[] = [];
	
	@ViewChild('ganttHost', { static: true }) ganttHost!: ElementRef<HTMLDivElement>;
	
	loading = true;
	error: string | null = null;
	
	lockWeek = true;
	showOptions = false;
	
	// “Play around” options:
	private defaultOptions: any = {
		view_mode: 'Week',
		date_format: 'YYYY-MM-DD',
		readonly: true,
		popup_trigger: 'hover',
		infinite_padding: false,
		today_button: true,
		column_width: 64,
		bar_height: 28,
		padding: 18,
	};
	
	options: any = { ...this.defaultOptions };
	optionsJson = JSON.stringify(this.options, null, 2);
	
	private gantt: any = null;
	private tasksRaw: ProjectTaskGanttDto[] = [];
	private milestonesRaw: ProjectMilestoneDto[] = [];
	
	private scrollEl: HTMLElement | null = null;
	private onScrollBound?: () => void;
	
	constructor(
		private api: ApiService,
		private router: Router,
		private cdr: ChangeDetectorRef
	) {}
	
	ngAfterViewInit(): void {
		this.load();
	}
	
	ngOnChanges(changes: SimpleChanges): void {
		// if milestones arrive later, re-decorate without rebuilding everything
		if (changes['milestones'] && !changes['milestones'].firstChange) {
			this.milestonesRaw = this.milestones ?? [];
			this.renderMarkers(); // redraw milestone lines if needed
		}
	}
	
	ngOnDestroy(): void {
		try {
			this.scrollEl?.removeEventListener('scroll', this.onScrollBound as any);
		} catch {}
		try {
			this.ganttHost.nativeElement.innerHTML = '';
		} catch {}
		this.gantt = null;
	}
	
	openFullView() {
		this.router.navigate(['/projects', this.projectId, 'gantt']);
	}
	
	resetOptions() {
		this.options = { ...this.defaultOptions };
		this.optionsJson = JSON.stringify(this.options, null, 2);
		this.rebuild();
	}
	
	applyOptions() {
		try {
			const next = JSON.parse(this.optionsJson || '{}');
			this.options = { ...this.defaultOptions, ...next };
			
			if (this.lockWeek) this.options.view_mode = 'Week';
			
			// safest: rebuild (works across versions)
			this.rebuild();
			} catch {
			alert('Invalid JSON');
		}
	}
	
	private load() {
		this.loading = true;
		this.error = null;
		
		forkJoin({
			gantt: this.api.getProjectGantt(this.projectId),
			milestones: this.api.getProjectMilestones(this.projectId, { per_page: 200 }).pipe(
				catchError(() => of({ data: [] } as unknown as ApiCollection<ProjectMilestoneDto>))
			),
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res) => {
				this.tasksRaw = res.gantt?.tasks ?? [];
				this.milestonesRaw = (res.milestones as ApiCollection<ProjectMilestoneDto>)?.data ?? this.milestones ?? [];
				this.rebuild();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load Gantt tasks.';
				this.cdr.detectChanges();
			},
		});
	}
	
	private rebuild() {
		const host = this.ganttHost?.nativeElement;
		if (!host) return;
		
		// build tasks + milestone tasks + (optional) “range task” to force timeline
		const tasks: GanttTask[] = [];
		
		const rangeStart = this.projectStartDate ?? this.minTaskStart() ?? this.today();
		const rangeEnd = this.projectEndDate ?? this.maxTaskEnd() ?? rangeStart;
		
		// invisible range task to force the chart to include project bounds
		tasks.push({
			id: '__range__',
			name: '',
			start: rangeStart,
			end: rangeEnd,
			progress: 0,
			custom_class: 'pms-range',
		});
		
		// normal tasks
		for (const t of this.tasksRaw) {
			if (!t.start_date) continue;
			tasks.push(this.toFrappeTask(t));
		}
		
		// milestone “tasks” (so they render inside gantt)
		for (const m of this.milestonesRaw ?? []) {
			if (!m.milestone_date) continue;
			tasks.push({
				id: `ms_${m.id}`,
				name: `◇ ${m.name}`,
				start: m.milestone_date,
				end: m.milestone_date,
				progress: 0,
				custom_class: 'pms-milestone',
			});
		}
		
		host.innerHTML = '';
		
		const opts = {
			...this.options,
			view_mode: this.lockWeek ? 'Week' : this.options.view_mode,
			readonly: true, // hard lock (no dragging/progress edits)
			on_view_change: () => {
				this.renderMarkers();
				this.clampScroll();
			},
		};
		
		
		
		// scroll container
		this.scrollEl = host.querySelector('.gantt-container') as HTMLElement | null;
		
		this.applyTaskColors();
		this.renderMarkers();
		this.attachClampListener();
		this.clampScroll(); // also sets initial clamp
		
		this.cdr.detectChanges();
	}
	
	private toFrappeTask(t: ProjectTaskGanttDto): GanttTask {
		const start = String(t.start_date);
		const end = t.end_date ? String(t.end_date) : start;
		
		const deps = t.depends_on_task_id ? String(t.depends_on_task_id) : '';
		
		return {
			id: String(t.id),
			name: t.name,
			start,
			end,
			progress: Math.max(0, Math.min(100, Number(t.progress ?? 0))),
			dependencies: deps,
			_pmsColor: t.task_color ?? null,
			_pmsStatus: t.status_code ?? null,
		};
	}
	
	private popupHtml(task: any) {
		if (task.id === '__range__') return '';
		return `
		<div class="details-container">
        <div><b>${task.name}</b></div>
        <div>${task.start} → ${task.end}</div>
        <div>Progress: ${task.progress ?? 0}%</div>
		</div>
		`;
	}
	
	private applyTaskColors() {
		const host = this.ganttHost?.nativeElement;
		if (!host) return;
		
		const wrappers = host.querySelectorAll<HTMLElement>('.bar-wrapper');
		wrappers.forEach((w) => {
			const id = w.getAttribute('data-id');
			if (!id || id === '__range__') {
				// hide the range bar completely
				if (id === '__range__') w.style.display = 'none';
				return;
			}
			
			const raw = this.tasksRaw.find((x) => String(x.id) === id);
			const bar = w.querySelector<SVGElement>('.bar');
			const prog = w.querySelector<SVGElement>('.bar-progress');
			
			// Milestone “tasks” styled by CSS class, no need to recolor
			if (id.startsWith('ms_')) return;
			
			const color = raw?.task_color?.trim() || this.colorByStatus(raw?.status_code);
			if (bar) bar.setAttribute('fill', color);
			if (prog) prog.setAttribute('fill', this.darken(color, 0.15));
		});
	}
	
	private renderMarkers() {
		// Draw dashed lines inside the SVG so they scroll correctly with the chart
		const host = this.ganttHost?.nativeElement;
		const svg = host?.querySelector('svg') as SVGSVGElement | null;
		if (!svg) return;
		
		// Remove previous markers
		const old = svg.querySelector('.pms-markers');
		if (old) old.remove();
		
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('class', 'pms-markers');
		svg.appendChild(g);
		
		const start = this.projectStartDate;
		const end = this.projectEndDate;
		
		// Project start line
		if (start) this.addDateLine(g, start, 'pms-marker-line');
		
		// Project end line
		if (end) this.addDateLine(g, end, 'pms-marker-line');
		
		// Today line
		this.addDateLine(g, this.today(), 'pms-today-line');
		
		// Milestone lines (dashed)
		for (const m of this.milestonesRaw ?? []) {
			if (!m.milestone_date) continue;
			this.addDateLine(g, m.milestone_date, 'pms-marker-line');
		}
	}
	
	private addDateLine(group: SVGGElement, dateStr: string, cssClass: string) {
		const x = this.xForDate(dateStr);
		if (x == null) return;
		
		const y1 = 0;
		const y2 = 2000; // long enough; SVG will clip automatically
		
		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', String(x));
		line.setAttribute('x2', String(x));
		line.setAttribute('y1', String(y1));
		line.setAttribute('y2', String(y2));
		line.setAttribute('class', cssClass);
		
		group.appendChild(line);
	}
	
	private xForDate(dateStr: string): number | null {
		// Prefer frappe internal method if present
		const d = new Date(`${dateStr}T00:00:00`);
		if (Number.isNaN(d.getTime())) return null;
		
		if (this.gantt && typeof this.gantt.get_x_by_date === 'function') {
			return this.gantt.get_x_by_date(d);
		}
		
		// fallback approximation (Week view)
		const chartStart: Date = this.gantt?.gantt_start ?? new Date(`${this.minTaskStart() ?? this.today()}T00:00:00`);
		const days = Math.floor((d.getTime() - chartStart.getTime()) / 86400000);
		const colW = Number(this.options.column_width ?? 64);
		const dayW = colW / 7;
		return Math.max(0, days * dayW);
	}
	
	private attachClampListener() {
		const sc = this.scrollEl;
		if (!sc) return;
		
		if (this.onScrollBound) sc.removeEventListener('scroll', this.onScrollBound as any);
		
		this.onScrollBound = () => this.clampScroll();
		sc.addEventListener('scroll', this.onScrollBound, { passive: true });
	}
	
	private clampScroll() {
		const sc = this.scrollEl;
		if (!sc || !this.projectStartDate) return;
		
		const minLeft = this.xForDate(this.projectStartDate);
		if (minLeft == null) return;
		
		if (sc.scrollLeft < minLeft) sc.scrollLeft = minLeft;
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
	
	private darken(hex: string, amt: number): string {
		const h = hex.startsWith('#') ? hex.slice(1) : hex;
		if (h.length !== 6) return hex;
		const n = parseInt(h, 16);
		const r = Math.max(0, Math.min(255, Math.floor(((n >> 16) & 255) * (1 - amt))));
		const g = Math.max(0, Math.min(255, Math.floor(((n >> 8) & 255) * (1 - amt))));
		const b = Math.max(0, Math.min(255, Math.floor((n & 255) * (1 - amt))));
		return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
	}
	
	private today(): string {
		const d = new Date();
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}
	
	private minTaskStart(): string | null {
		const dates = (this.tasksRaw ?? []).map((t) => t.start_date).filter(Boolean) as string[];
		return dates.length ? dates.sort()[0] : null;
	}
	
	private maxTaskEnd(): string | null {
		const dates = (this.tasksRaw ?? []).map((t) => t.end_date ?? t.start_date).filter(Boolean) as string[];
		return dates.length ? dates.sort()[dates.length - 1] : null;
	}
}
