import { CommonModule } from '@angular/common';
import {
	Component,
	Input,
	OnChanges,
	SimpleChanges,
	ChangeDetectorRef,
	ViewChild,
	ElementRef
} from '@angular/core';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import {
	GanttItem,
	GanttViewType,
	NgxGanttComponent,
	NgxGanttTableComponent,
	NgxGanttTableColumnComponent
} from '@worktile/gantt';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
	ApiCollection,
	ApiService,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	ProjectBudgetSummaryDto,
} from '../../../core/services/api.service';

type GanttProjectItem = GanttItem & {
	kind: 'task' | 'milestone';
	statusCode?: string | null;
	assignedToName?: string | null;
	milestoneName?: string | null;
	delayed?: boolean;
	raw?: ProjectTaskGanttDto | ProjectMilestoneDto;
	budget?: ProjectBudgetSummaryDto;
};

@Component({
	standalone: true,
	selector: 'app-project-gantt-ngx-embed',
	imports: [
		CommonModule,
		NgxGanttComponent,
		NgxGanttTableComponent,
		NgxGanttTableColumnComponent
	],
	templateUrl: './project-gantt-ngx-embed.html',
	styleUrls: ['./project-gantt-ngx-embed.scss'],
})
export class ProjectGanttNgxEmbedComponent implements OnChanges {
	@Input({ required: true }) projectId!: number;
	@Input() projectStartDate: string | null = null;
	@Input() projectEndDate: string | null = null;
	
	@ViewChild(NgxGanttComponent) gantt?: NgxGanttComponent;
	@ViewChild('ganttExportArea') ganttExportArea?: ElementRef<HTMLElement>;
	
	loading = false;
	exporting = false;
	error: string | null = null;
	
	viewType = GanttViewType.week;
	
	items: GanttProjectItem[] = [];
	visibleStart?: number;
	visibleEnd?: number;
	
	selectedItem: GanttProjectItem | null = null;
	showDetailModal = false;
	
	readonly toolbarOptions = {
		viewTypes: [
			GanttViewType.day,
			GanttViewType.week,
			GanttViewType.month,
			GanttViewType.quarter,
		]
	};
	
	readonly linkOptions = {
		showArrow: true
	};
	
	constructor(
		private api: ApiService,
		private cdr: ChangeDetectorRef,
		private router: Router
	) {}
	
	ngOnChanges(changes: SimpleChanges): void {
		if ((changes['projectId'] || changes['projectStartDate'] || changes['projectEndDate']) && this.projectId) {
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
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: ({ gantt, milestones }) => {
				const rawTasks: ProjectTaskGanttDto[] = Array.isArray(gantt?.tasks)
				? gantt.tasks
				: Array.isArray((gantt as any)?.tasks?.data)
				? (gantt as any).tasks.data
				: [];
				
				const rawMilestones: ProjectMilestoneDto[] =
				(milestones as ApiCollection<ProjectMilestoneDto>)?.data ?? [];
				
				const milestoneItems = rawMilestones
				.map((m) => this.toMilestoneItem(m))
				.filter((x): x is GanttProjectItem => x !== null);
				
				const taskItems = this.buildTaskItems(rawTasks);
				
				this.items = [...milestoneItems, ...taskItems];
				this.computeVisibleRange(this.items);
				
				this.cdr.detectChanges();
				
				setTimeout(() => {
					this.gantt?.rerenderView?.();
				}, 0);
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load gantt data.';
				this.items = [];
				this.cdr.detectChanges();
			}
		});
	}
	
	private buildTaskItems(tasks: ProjectTaskGanttDto[]): GanttProjectItem[] {
		const mapped = new Map<string, GanttProjectItem>();
		
		for (const task of tasks) {
			const item = this.toTaskItem(task);
			if (item) {
				mapped.set(item.id, item);
			}
		}
		
		// predecessor -> current
		for (const task of tasks) {
			if (task.depends_on_task_id == null) continue;
			
			const predecessor = mapped.get(String(task.depends_on_task_id));
			const current = mapped.get(String(task.id));
			
			if (predecessor && current) {
				predecessor.links = [...(predecessor.links ?? []), current.id];
			}
		}
		
		return Array.from(mapped.values());
	}
	
	private toTaskItem(task: ProjectTaskGanttDto): GanttProjectItem | null {
		const start = this.parseDateToUnix(task.start_date);
		let end = this.parseDateToUnix(task.end_date);
		
		if (start == null) return null;
		if (end == null || end <= start) {
			end = start + 86400;
		}
		
		const delayed = this.isDelayed(task);
		
		return {
			id: String(task.id),
			title: task.name || 'Unnamed task',
			start,
			end,
			progress: Number(task.progress ?? 0),
			color: delayed ? '#dc3545' : this.pickTaskColor(task),
			kind: 'task',
			statusCode: task.status_code ?? null,
			assignedToName: task.assigned_to_name ?? null,
			milestoneName: task.milestone?.name ?? null,
			delayed,
			raw: task,
			budget: task.budget,
		};
	}
	
	private toMilestoneItem(milestone: ProjectMilestoneDto): GanttProjectItem | null {
		const start = this.parseDateToUnix(milestone.milestone_date);
		if (start == null) return null;
		
		return {
			id: `MS_${milestone.id}`,
			title: milestone.name,
			start,
			end: start + 86400,
			type: 'custom' as any,
			color: this.pickMilestoneColor(milestone.status),
			kind: 'milestone',
			statusCode: milestone.status ?? null,
			raw: milestone,
		};
	}
	
	private computeVisibleRange(items: GanttProjectItem[]): void {
		const projectStart = this.parseDateToUnix(this.projectStartDate);
		const projectEnd = this.parseDateToUnix(this.projectEndDate);
		
		if (projectStart != null && projectEnd != null && projectEnd > projectStart) {
			this.visibleStart = projectStart - 7 * 86400;
			this.visibleEnd = projectEnd + 7 * 86400;
			return;
		}
		
		const starts = items.map(i => i.start).filter((v): v is number => typeof v === 'number');
		const ends = items.map(i => i.end).filter((v): v is number => typeof v === 'number');
		
		if (!starts.length || !ends.length) {
			this.visibleStart = undefined;
			this.visibleEnd = undefined;
			return;
		}
		
		this.visibleStart = Math.min(...starts) - 7 * 86400;
		this.visibleEnd = Math.max(...ends) + 7 * 86400;
	}
	
	private parseDateToUnix(value?: string | null): number | null {
		if (!value) return null;
		const d = new Date(`${value}T00:00:00`);
		if (Number.isNaN(d.getTime())) return null;
		return Math.floor(d.getTime() / 1000);
	}
	
	private isDelayed(task: ProjectTaskGanttDto): boolean {
		const status = String(task.status_code ?? '').toUpperCase();
		if (status === 'DONE' || status === 'COMPLETED' || status === 'CANCELLED') {
			return false;
		}
		
		const today = Math.floor(Date.now() / 1000);
		const end = this.parseDateToUnix(task.end_date);
		return end != null && end < today;
	}
	
	private pickTaskColor(task: ProjectTaskGanttDto): string {
		if (task.task_color?.trim()) return task.task_color.trim();
		
		const code = String(task.status_code ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return '#198754';
		if (code === 'CANCELLED') return '#6c757d';
		if (code === 'AT_RISK') return '#dc3545';
		if (code === 'DELAYED') return '#ffc107';
		if (code === 'IN_PROGRESS') return '#0d6efd';
		return '#0dcaf0';
	}
	
	private pickMilestoneColor(status?: string | null): string {
		const code = String(status ?? '').toUpperCase();
		if (code === 'DONE' || code === 'COMPLETED') return '#198754';
		if (code === 'CANCELLED') return '#6c757d';
		return '#7c3aed';
	}
	
	isMilestone(item: GanttProjectItem): boolean {
		return item.kind === 'milestone';
	}
	
	displayDate(value: number | Date | undefined): string {
		if (!value) return '—';
		const ms = value instanceof Date ? value.getTime() : value * 1000;
		const d = new Date(ms);
		return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
	}
	
	progressLabel(item: GanttProjectItem): string {
		return item.kind === 'milestone' ? '—' : `${Number(item.progress ?? 0)}%`;
	}
	
	goToTaskList(): void {
		this.router.navigate(['/projects', this.projectId, 'gantt']);
	}
	
	goToNewTask(): void {
		this.router.navigate(['/projects', this.projectId, 'tasks', 'new']);
	}
	
	onBarClick(event: any): void {
		const clicked = event?.item ?? event?.source ?? event ?? null;
		if (!clicked) return;
		
		const found = this.items.find(i => i.id === String(clicked.id));
		if (!found) return;
		
		this.selectedItem = found;
		this.showDetailModal = true;
		this.cdr.detectChanges();
	}
	
	closeModal(): void {
		this.showDetailModal = false;
		this.selectedItem = null;
	}
	
	editSelectedTask(): void {
		if (!this.selectedItem || this.selectedItem.kind !== 'task') return;
		this.router.navigate(['/projects', this.projectId, 'tasks', this.selectedItem.id]);
	}
	
	async exportToPng(): Promise<void> {
		if (!this.ganttExportArea?.nativeElement) return;
		
		try {
			this.exporting = true;
			this.cdr.detectChanges();
			
			const canvas = await html2canvas(this.ganttExportArea.nativeElement, {
				backgroundColor: '#ffffff',
				scale: 2,
				useCORS: true
			});
			
			const dataUrl = canvas.toDataURL('image/png');
			const a = document.createElement('a');
			a.href = dataUrl;
			a.download = `project-${this.projectId}-gantt.png`;
			a.click();
			} catch (err) {
			console.error(err);
			} finally {
			this.exporting = false;
			this.cdr.detectChanges();
		}
	}
	
	moneyLabel(value?: number | null): string {
		return `MYR ${Number(value ?? 0).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
		})}`;
	}
	
}