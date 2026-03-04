import { CommonModule } from '@angular/common';
import {
	Component,
	Input,
	OnChanges,
	SimpleChanges,
	ChangeDetectorRef,
	ElementRef,
	ViewChild,
	AfterViewInit,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ProjectTaskGanttDto, ProjectMilestoneDto } from '../../../core/services/api.service';

type WeekCol = {
	start: Date;          // Monday
	end: Date;            // Sunday
	monthLabel: string;   // February
	weekLabel: string;    // Week 4
};

type MonthSpan = { label: string; span: number };

type TaskVm = ProjectTaskGanttDto & {
	startLabel: string;
	endLabel: string;
	durationDays: number;
	leftPx: number;
	widthPx: number;
	color: string;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt-week-timeline',
	imports: [CommonModule, RouterModule],
	templateUrl: './project-gantt-week-timeline.html',
	styleUrls: ['./project-gantt-week-timeline.scss'],
})
export class ProjectGanttWeekTimelineComponent implements OnChanges, AfterViewInit {
	@Input({ required: true }) projectId!: number;
	@Input() projectStartDate: string | null = null;     // YYYY-MM-DD
	@Input() tasks: ProjectTaskGanttDto[] = [];          // from /projects/:id/gantt
	@Input() milestones: ProjectMilestoneDto[] = [];     // res.data from milestones API
	
	@ViewChild('timelineScroll', { static: true }) timelineScroll!: ElementRef<HTMLDivElement>;
	
	// layout constants
	readonly colWidth = 120;          // one week column width
	readonly rowHeight = 44;          // each task row height
	readonly headerH = 72;            // header total height
	get dayWidth() { return this.colWidth / 7; }
	
	weeks: WeekCol[] = [];
	months: MonthSpan[] = [];
	rows: TaskVm[] = [];
	
	rangeLabel = '';
	loadingEmpty = false;
	
	// clamp so user can’t scroll earlier than project start
	private minScrollLeftPx = 0;
	
	constructor(
		private router: Router,
		private cdr: ChangeDetectorRef
	) {}
	
	ngAfterViewInit(): void {
		this.attachScrollClamp();
	}
	
	ngOnChanges(changes: SimpleChanges): void {
		if (changes['tasks'] || changes['milestones'] || changes['projectStartDate']) {
			this.rebuild();
		}
	}
	
	openFullView() {
		this.router.navigate(['/projects', this.projectId, 'gantt']);
	}
	
	// ---------------- rebuild ----------------
	private rebuild(): void {
		const min = this.computeMinDate();
		const max = this.computeMaxDate();
		
		if (!min || !max) {
			this.weeks = [];
			this.months = [];
			this.rows = [];
			this.rangeLabel = '';
			this.loadingEmpty = true;
			this.cdr.detectChanges();
			return;
		}
		
		const rangeStart = this.startOfWeek(min);
		const rangeEnd = this.endOfWeek(max);
		
		this.rangeLabel = `${this.fmt(rangeStart)} → ${this.fmt(rangeEnd)}`;
		
		// weeks
		this.weeks = this.buildWeeks(rangeStart, rangeEnd);
		this.months = this.buildMonthSpans(this.weeks);
		
		// clamp boundary
		this.minScrollLeftPx = this.computeProjectStartScrollLeft(rangeStart);
		
		// task rows
		this.rows = (this.tasks ?? [])
		.slice()
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
		.map(t => this.toVm(t, rangeStart));
		
		this.loadingEmpty = false;
		
		// after DOM paints, apply clamp
		queueMicrotask(() => {
			this.clampNow();
			this.cdr.detectChanges();
		});
	}
	
	private toVm(t: ProjectTaskGanttDto, rangeStart: Date): TaskVm {
		const s = this.parseISO(t.start_date ?? t.actual_start_date ?? t.end_date ?? t.actual_end_date);
		const e0 = this.parseISO(t.end_date ?? t.actual_end_date ?? t.start_date ?? t.actual_start_date ?? null);
		
		let start = s ?? new Date(rangeStart);
		let end = e0 ?? new Date(start);
		
		// inclusive days (same-day still show 1 day)
		if (end.getTime() < start.getTime()) [end, start] = [start, end];
		const durationDays = this.diffDays(start, end) + 1;
		
		const leftDays = this.diffDays(rangeStart, start);
		const leftPx = leftDays * this.dayWidth;
		const widthPx = Math.max(this.dayWidth, durationDays * this.dayWidth);
		
		const color = this.resolveColor(t);
		
		return {
			...t,
			startLabel: t.start_date ?? t.actual_start_date ?? '—',
			endLabel: t.end_date ?? t.actual_end_date ?? '—',
			durationDays,
			leftPx,
			widthPx,
			color,
		};
	}
	
	private resolveColor(t: ProjectTaskGanttDto): string {
		if (t.task_color && t.task_color.trim()) return t.task_color.trim();
		
		const code = String(t.status_code ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return '#198754';
		if (code === 'CANCELLED') return '#6c757d';
		if (code === 'AT_RISK') return '#dc3545';
		if (code === 'DELAYED') return '#ffc107';
		if (code === 'IN_PROGRESS') return '#0d6efd';
		return '#0dcaf0';
	}
	
	// ---------------- timeline helpers ----------------
	timelineWidthPx(): number {
		return this.weeks.length * this.colWidth;
	}
	
	projectStartLineLeftPx(): number | null {
		if (!this.projectStartDate || !this.weeks.length) return null;
		const rs = this.weeks[0].start;
		const d = this.parseISO(this.projectStartDate);
		if (!d) return null;
		const leftDays = this.diffDays(rs, d);
		return leftDays * this.dayWidth;
	}
	
	todayLineLeftPx(): number | null {
		if (!this.weeks.length) return null;
		const rs = this.weeks[0].start;
		const d = this.toDay(new Date());
		const leftDays = this.diffDays(rs, d);
		return leftDays * this.dayWidth;
	}
	
	milestoneLeftPx(m: ProjectMilestoneDto): number | null {
		if (!this.weeks.length || !m.milestone_date) return null;
		const rs = this.weeks[0].start;
		const d = this.parseISO(m.milestone_date);
		if (!d) return null;
		const leftDays = this.diffDays(rs, d);
		return leftDays * this.dayWidth;
	}
	
	// ---------------- scroll clamp ----------------
	private attachScrollClamp() {
		const el = this.timelineScroll?.nativeElement;
		if (!el) return;
		
		el.addEventListener('scroll', () => this.clampNow(), { passive: true });
		
		el.addEventListener('wheel', (e: WheelEvent) => {
			// clamp both horizontal wheel + shift+wheel
			const dx = e.deltaX + (e.shiftKey ? e.deltaY : 0);
			if (!dx) return;
			
			const next = el.scrollLeft + dx;
			if (next < this.minScrollLeftPx) {
				el.scrollLeft = this.minScrollLeftPx;
				e.preventDefault();
				e.stopPropagation();
			}
		}, { passive: false });
	}
	
	private clampNow() {
		const el = this.timelineScroll?.nativeElement;
		if (!el) return;
		if (el.scrollLeft < this.minScrollLeftPx) el.scrollLeft = this.minScrollLeftPx;
	}
	
	private computeProjectStartScrollLeft(rangeStart: Date): number {
		const d = this.parseISO(this.projectStartDate);
		if (!d) return 0;
		const leftDays = this.diffDays(rangeStart, d);
		return Math.max(0, leftDays * this.dayWidth);
	}
	
	// ---------------- date helpers ----------------
	private computeMinDate(): Date | null {
		const dates: Date[] = [];
		const ps = this.parseISO(this.projectStartDate);
		if (ps) dates.push(ps);
		
		for (const t of (this.tasks ?? [])) {
			const s = this.parseISO(t.start_date ?? t.actual_start_date);
			const e = this.parseISO(t.end_date ?? t.actual_end_date);
			if (s) dates.push(s);
			if (e) dates.push(e);
		}
		
		for (const m of (this.milestones ?? [])) {
			const d = this.parseISO(m.milestone_date);
			if (d) dates.push(d);
		}
		
		if (!dates.length) return null;
		return new Date(Math.min(...dates.map(x => x.getTime())));
	}
	
	private computeMaxDate(): Date | null {
		const dates: Date[] = [];
		
		for (const t of (this.tasks ?? [])) {
			const s = this.parseISO(t.start_date ?? t.actual_start_date);
			const e = this.parseISO(t.end_date ?? t.actual_end_date);
			if (s) dates.push(s);
			if (e) dates.push(e);
		}
		
		for (const m of (this.milestones ?? [])) {
			const d = this.parseISO(m.milestone_date);
			if (d) dates.push(d);
		}
		
		const ps = this.parseISO(this.projectStartDate);
		if (!dates.length && ps) dates.push(ps);
		
		if (!dates.length) return null;
		return new Date(Math.max(...dates.map(x => x.getTime())));
	}
	
	private buildWeeks(startMonday: Date, endSunday: Date): WeekCol[] {
		const out: WeekCol[] = [];
		let cur = new Date(startMonday);
		let w = 1;
		
		while (cur.getTime() <= endSunday.getTime()) {
			const ws = new Date(cur);
			const we = new Date(cur); we.setDate(we.getDate() + 6);
			
			out.push({
				start: ws,
				end: we,
				monthLabel: ws.toLocaleString(undefined, { month: 'long' }),
				weekLabel: `Week ${w++}`,
			});
			
			cur.setDate(cur.getDate() + 7);
		}
		return out;
	}
	
	private buildMonthSpans(weeks: WeekCol[]): MonthSpan[] {
		const out: MonthSpan[] = [];
		let cur = '';
		let span = 0;
		
		for (const wk of weeks) {
			if (!cur) { cur = wk.monthLabel; span = 1; continue; }
			if (wk.monthLabel === cur) span++;
			else { out.push({ label: cur, span }); cur = wk.monthLabel; span = 1; }
		}
		if (cur) out.push({ label: cur, span });
		return out;
	}
	
	private startOfWeek(d: Date): Date {
		const x = this.toDay(d);
		const day = x.getDay(); // 0 Sun..6 Sat
		const diff = (day === 0 ? -6 : 1 - day);
		x.setDate(x.getDate() + diff);
		return x;
	}
	private endOfWeek(d: Date): Date {
		const s = this.startOfWeek(d);
		const e = new Date(s);
		e.setDate(e.getDate() + 6);
		return e;
	}
	
	private parseISO(v?: string | null): Date | null {
		if (!v) return null;
		const d = new Date(`${v}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : this.toDay(d);
	}
	private toDay(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
	private diffDays(a: Date, b: Date): number {
		const A = this.toDay(a).getTime();
		const B = this.toDay(b).getTime();
		return Math.floor((B - A) / (1000 * 60 * 60 * 24));
	}
	private fmt(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${dd}`;
	}
}
