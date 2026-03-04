import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { ProjectTaskGanttDto, ProjectMilestoneDto } from '../../../core/services/api.service';

type WeekCol = {
	index: number;          // 1..N
	start: Date;            // Monday
	end: Date;              // Sunday
	monthLabel: string;     // "February"
	label: string;          // "Week 1"
};

type MonthGroup = { label: string; span: number };

type TaskRowVm = ProjectTaskGanttDto & {
	startLabel: string;
	endLabel: string;
	durationCalc: number;
	color: string;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt-week-grid',
	imports: [CommonModule, RouterModule],
	templateUrl: './project-gantt-week-grid.html',
	styleUrls: ['./project-gantt-week-grid.scss'],
})
export class ProjectGanttWeekGridComponent implements OnChanges {
	@Input({ required: true }) projectId!: number;
	
	/** Project start (for clamp/marker). Prefer start_date or target_start_date */
	@Input() projectStartDate: string | null = null;
	
	/** from /projects/:id/gantt */
	@Input() tasks: ProjectTaskGanttDto[] = [];
	
	/** milestone dto array (NOT the paginated object) */
	@Input() milestones: ProjectMilestoneDto[] = [];
	
	weeks: WeekCol[] = [];
	monthGroups: MonthGroup[] = [];
	
	rows: TaskRowVm[] = [];
	
	// marker column index (0-based in weeks array), -1 if none
	projectStartWeekIdx = -1;
	
	constructor(
		private router: Router,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnChanges(changes: SimpleChanges): void {
		if (changes['tasks'] || changes['milestones'] || changes['projectStartDate']) {
			this.rebuild();
		}
	}
	
	private rebuild(): void {
		const minDate = this.computeMinDate();
		const maxDate = this.computeMaxDate();
		
		if (!minDate || !maxDate) {
			this.weeks = [];
			this.monthGroups = [];
			this.rows = [];
			this.projectStartWeekIdx = -1;
			this.cdr.detectChanges();
			return;
		}
		
		const rangeStart = this.startOfWeek(minDate); // Monday
		const rangeEnd = this.endOfWeek(maxDate);     // Sunday
		
		this.weeks = this.buildWeeks(rangeStart, rangeEnd);
		this.monthGroups = this.buildMonthGroups(this.weeks);
		
		this.projectStartWeekIdx = this.findWeekIndex(this.projectStartDate);
		
		this.rows = (this.tasks ?? [])
		.slice()
		.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
		.map(t => this.toRowVm(t));
		
		this.cdr.detectChanges();
	}
	
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
		return new Date(Math.min(...dates.map(d => d.getTime())));
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
		
		// if still empty, fallback to project start
		const ps = this.parseISO(this.projectStartDate);
		if (!dates.length && ps) dates.push(ps);
		
		if (!dates.length) return null;
		return new Date(Math.max(...dates.map(d => d.getTime())));
	}
	
	private buildWeeks(startMonday: Date, endSunday: Date): WeekCol[] {
		const out: WeekCol[] = [];
		let cur = new Date(startMonday);
		
		let idx = 1;
		while (cur.getTime() <= endSunday.getTime()) {
			const wStart = new Date(cur);
			const wEnd = new Date(cur);
			wEnd.setDate(wEnd.getDate() + 6);
			
			out.push({
				index: idx++,
				start: wStart,
				end: wEnd,
				monthLabel: wStart.toLocaleString(undefined, { month: 'long' }),
				label: `Week ${idx - 1}`,
			});
			
			cur.setDate(cur.getDate() + 7);
		}
		return out;
	}
	
	private buildMonthGroups(weeks: WeekCol[]): MonthGroup[] {
		const groups: MonthGroup[] = [];
		let curLabel = '';
		let span = 0;
		
		for (const w of weeks) {
			if (!curLabel) {
				curLabel = w.monthLabel;
				span = 1;
				continue;
			}
			if (w.monthLabel === curLabel) {
				span++;
				} else {
				groups.push({ label: curLabel, span });
				curLabel = w.monthLabel;
				span = 1;
			}
		}
		if (curLabel) groups.push({ label: curLabel, span });
		return groups;
	}
	
	private toRowVm(t: ProjectTaskGanttDto): TaskRowVm {
		const s = this.parseISO(t.start_date ?? t.actual_start_date);
		const e = this.parseISO(t.end_date ?? t.actual_end_date);
		
		const startLabel = t.start_date ?? t.actual_start_date ?? '—';
		const endLabel = t.end_date ?? t.actual_end_date ?? '—';
		
		const durationCalc = (s && e && e.getTime() >= s.getTime())
		? Math.floor((this.toDay(e).getTime() - this.toDay(s).getTime()) / (1000 * 60 * 60 * 24)) + 1
		: 0;
		
		const color = this.resolveTaskColor(t);
		
		return {
			...t,
			startLabel,
			endLabel,
			durationCalc,
			color,
		};
	}
	
	private resolveTaskColor(t: ProjectTaskGanttDto): string {
		if (t.task_color && t.task_color.trim()) return t.task_color.trim();
		
		const code = String(t.status_code ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return '#198754';
		if (code === 'CANCELLED') return '#6c757d';
		if (code === 'AT_RISK') return '#dc3545';
		if (code === 'DELAYED') return '#ffc107';
		if (code === 'IN_PROGRESS') return '#0d6efd';
		return '#0dcaf0';
	}
	
	// ---------- cell logic ----------
	taskCoversWeek(t: ProjectTaskGanttDto, w: WeekCol): boolean {
		const s = this.parseISO(t.start_date ?? t.actual_start_date);
		const e = this.parseISO(t.end_date ?? t.actual_end_date);
		if (!s && !e) return false;
		
		const start = s ?? e!;
		const end = e ?? s!;
		
		return !(end.getTime() < w.start.getTime() || start.getTime() > w.end.getTime());
	}
	
	milestoneInWeek(m: ProjectMilestoneDto, w: WeekCol): boolean {
		const d = this.parseISO(m.milestone_date);
		if (!d) return false;
		return d.getTime() >= w.start.getTime() && d.getTime() <= w.end.getTime();
	}
	
	milestoneClass(m: ProjectMilestoneDto): string {
		const st = String(m.status ?? '').toUpperCase();
		if (st === 'DONE') return 'ms-done';
		if (st === 'CANCELLED') return 'ms-cancelled';
		return 'ms-pending';
	}
	
	weekIsProjectStart(wIdx: number): boolean {
		return this.projectStartWeekIdx === wIdx;
	}
	
	// click-through (optional)
	openTask(t: ProjectTaskGanttDto): void {
		// if you have edit route: /projects/:id/tasks/:taskId
		this.router.navigate(['/projects', this.projectId, 'tasks', t.id]);
	}
	
	// ---------- helpers ----------
	private findWeekIndex(iso: string | null): number {
		const d = this.parseISO(iso);
		if (!d || !this.weeks.length) return -1;
		for (let i = 0; i < this.weeks.length; i++) {
			const w = this.weeks[i];
			if (d.getTime() >= w.start.getTime() && d.getTime() <= w.end.getTime()) return i;
		}
		return -1;
	}
	
	private parseISO(v?: string | null): Date | null {
		if (!v) return null;
		const d = new Date(`${v}T00:00:00`);
		return Number.isNaN(d.getTime()) ? null : this.toDay(d);
	}
	
	private toDay(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	}
	
	private startOfWeek(d: Date): Date {
		// Monday start
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
}
