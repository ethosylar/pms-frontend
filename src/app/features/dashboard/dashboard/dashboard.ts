import {
	ChangeDetectorRef,
	Component,
	OnInit,
	QueryList,
	ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import {
	ChartData,
	ChartOptions,
} from 'chart.js';

import { ApiService } from '../../../core/services/api.service';
import {
	ChartItem,
	DashboardOverviewData,
	DashboardOverviewResponse,
	FinanceDepartmentChartItem,
} from './dashboard.models';

type DashboardViewMode = 'layman' | 'technical';

@Component({
	standalone: true,
	selector: 'app-dashboard',
	imports: [
		CommonModule,
		RouterModule,
		BaseChartDirective,
	],
	templateUrl: './dashboard.html',
	styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
	@ViewChildren(BaseChartDirective)
	charts?: QueryList<BaseChartDirective>;
	
	loading = true;
	error: string | null = null;
	data: DashboardOverviewData | null = null;
	now = new Date();
	
	viewMode: DashboardViewMode = 'layman';
	
	private readonly colors = {
		primary: '#0d6efd',
		info: '#0dcaf0',
		success: '#198754',
		warning: '#ffc107',
		danger: '#dc3545',
		secondary: '#6c757d',
		dark: '#212529',
		
		purple: '#6f42c1',
		teal: '#20c997',
		orange: '#fd7e14',
		
		lightGray: '#adb5bd',
		darkGray: '#495057',
		
		cancelled: '#dc3545',
		delayed: '#fd7e14',
		overdue: '#b02a37',
		blocked: '#212529',
		todo: '#adb5bd',
		
		budgetWarning: '#fd7e14',
		budgetDanger: '#b02a37',
	};
	
	readonly doughnutOptions: ChartOptions<'doughnut'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
			},
		},
	};
	
	readonly barOptions: ChartOptions<'bar'> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
			},
		},
		scales: {
			y: {
				beginAtZero: true,
			},
		},
	};
	
	readonly horizontalBarOptions: ChartOptions<'bar'> = {
		...this.barOptions,
		indexAxis: 'y',
	};
	
	readonly lineOptions: ChartOptions<'line'> = {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: 'index',
			intersect: false,
		},
		plugins: {
			legend: {
				position: 'bottom',
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				ticks: {
					precision: 0,
				},
			},
		},
	};
	
	projectsByStatusData = this.emptyDoughnut();
	tasksByStatusData = this.emptyDoughnut();
	milestonesByStatusData = this.emptyDoughnut();
	timelineHealthData = this.emptyDoughnut();
	budgetUtilizationData = this.emptyDoughnut();
	
	projectsByDepartmentData = this.emptyBar();
	projectsByPriorityData = this.emptyBar();
	progressDistributionData = this.emptyBar();
	financeSummaryData = this.emptyBar();
	financeByDepartmentData = this.emptyBar();
	
	deliveryForecastData: ChartData<'line', number[], string> = {
		labels: [],
		datasets: [],
	};
	
	constructor(
		private api: ApiService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.load();
	}
	
	setViewMode(mode: DashboardViewMode): void {
		this.viewMode = mode;
		this.refreshCharts();
	}
	
	private load(): void {
		this.loading = true;
		this.error = null;
		
		this.api.dashboardOverview()
		.pipe(
			finalize(() => {
				this.loading = false;
				this.refreshCharts();
			})
		)
		.subscribe({
			next: (res: DashboardOverviewResponse) => {
				this.data = res.data;
				this.buildCharts(res.data);
			},
			error: (err: any) => {
				console.error('Dashboard overview error:', err);
				this.error = 'Failed to load dashboard overview.';
			},
		});
	}
	
	private buildCharts(data: DashboardOverviewData): void {
		this.projectsByStatusData =
		this.mapDoughnut(data.charts.projects_by_status, 'status');
		
		this.tasksByStatusData =
		this.mapDoughnut(data.charts.tasks_by_status, 'status');
		
		this.milestonesByStatusData =
		this.mapDoughnut(data.charts.milestones_by_status, 'status');
		
		this.timelineHealthData =
		this.mapDoughnut(data.charts.project_timeline_health, 'health');
		
		this.budgetUtilizationData =
		this.mapDoughnut(
			data.charts.budget_utilization_distribution,
			'budget'
		);
		
		this.projectsByDepartmentData =
		this.mapBar(
			data.charts.projects_by_department,
			'Projects',
			'department'
		);
		
		this.projectsByPriorityData =
		this.mapBar(
			data.charts.projects_by_priority,
			'Projects',
			'priority'
		);
		
		this.progressDistributionData =
		this.mapBar(
			data.charts.progress_distribution,
			'Projects',
			'progress'
		);
		
		this.financeSummaryData = {
			labels: ['Cost', 'Funding'],
			datasets: [
				{
					label: 'Planned',
					data: [
						data.finance?.planned_cost ?? 0,
						data.finance?.planned_funding ?? 0,
					],
					backgroundColor: this.colors.primary,
					borderColor: this.colors.primary,
				},
				{
					label: 'Actual',
					data: [
						data.finance?.actual_cost ?? 0,
						data.finance?.actual_funding ?? 0,
					],
					backgroundColor: this.colors.success,
					borderColor: this.colors.success,
				},
				{
					label: 'Committed',
					data: [
						data.finance?.committed_cost ?? 0,
						data.finance?.committed_funding ?? 0,
					],
					backgroundColor: this.colors.warning,
					borderColor: this.colors.warning,
				},
			],
		};
		
		this.financeByDepartmentData =
		this.mapDepartmentFinance(
			data.charts.finance_by_department
		);
		
		this.deliveryForecastData = {
			labels: data.charts.delivery_forecast.map(x => x.label),
			datasets: [
				{
					label: 'Projects Due',
					data: data.charts.delivery_forecast.map(x => x.projects_due),
					tension: 0.25,
					borderColor: this.colors.primary,
					backgroundColor: this.colors.primary,
				},
				{
					label: 'Milestones Due',
					data: data.charts.delivery_forecast.map(x => x.milestones_due),
					tension: 0.25,
					borderColor: this.colors.purple,
					backgroundColor: this.colors.purple,
				},
			],
		};
		
		this.refreshCharts();
	}
	
	private mapDoughnut(
		items: ChartItem[],
		kind: 'status' | 'health' | 'budget' | 'priority' | 'progress' | 'department' = 'status'
		): ChartData<'doughnut', number[], string> {
		return {
			labels: items.map(x => x.label),
			datasets: [
				{
					data: items.map(x => Number(x.value ?? 0)),
					backgroundColor: items.map(x => this.colorForChartItem(x, kind)),
					borderColor: '#ffffff',
					borderWidth: 2,
				},
			],
		};
	}
	
	private mapBar(
		items: ChartItem[],
		label: string,
		kind: 'status' | 'health' | 'budget' | 'priority' | 'progress' | 'department' = 'department'
		): ChartData<'bar', number[], string> {
		return {
			labels: items.map(x => x.label),
			datasets: [
				{
					label,
					data: items.map(x => Number(x.value ?? 0)),
					backgroundColor: items.map(x => this.colorForChartItem(x, kind)),
					borderColor: items.map(x => this.colorForChartItem(x, kind)),
				},
			],
		};
	}
	
	private mapDepartmentFinance(
		items: FinanceDepartmentChartItem[]
		): ChartData<'bar', number[], string> {
		return {
			labels: items.map(x => x.label),
			datasets: [
				{
					label: 'Planned Cost',
					data: items.map(x => x.planned_cost),
					backgroundColor: this.colors.primary,
					borderColor: this.colors.primary,
				},
				{
					label: 'Spent Cost',
					data: items.map(x => x.spent_cost),
					backgroundColor: this.colors.danger,
					borderColor: this.colors.danger,
				},
				{
					label: 'Received Funding',
					data: items.map(x => x.received_funding),
					backgroundColor: this.colors.success,
					borderColor: this.colors.success,
				},
			],
		};
	}
	
	private colorForChartItem(
		item: ChartItem,
		kind: 'status' | 'health' | 'budget' | 'priority' | 'progress' | 'department'
		): string {
		const code = this.normalizeCode(item.key || item.label);
		
		if (kind === 'priority') {
			return this.priorityColor(code);
		}
		
		if (kind === 'budget') {
			return this.budgetColor(code);
		}
		
		if (kind === 'progress') {
			return this.progressColor(code);
		}
		
		if (kind === 'health') {
			return this.healthColor(code);
		}
		
		if (kind === 'department') {
			return this.colors.primary;
		}
		
		return this.statusColor(code);
	}
	
	private statusColor(code: string): string {
		switch (code) {
			case 'COMPLETED':
			case 'COMPLETE':
			case 'DONE':
			return this.colors.success;
			
			case 'IN_PROGRESS':
			case 'INPROGRESS':
			case 'ONGOING':
			return this.colors.primary;
			
			case 'PLANNED':
			case 'PENDING':
			case 'NOT_STARTED':
			case 'NOTSTARTED':
			return this.colors.info;
			
			case 'AT_RISK':
			case 'RISK':
			return this.colors.warning;
			
			case 'DELAYED':
			case 'LATE':
			return this.colors.delayed;
			
			case 'OVERDUE':
			return this.colors.overdue;
			
			case 'CANCELLED':
			case 'CANCELED':
			case 'CANCEL':
			return this.colors.cancelled;
			
			case 'ON_HOLD':
			case 'ONHOLD':
			case 'HOLD':
			return this.colors.secondary;
			
			case 'TO_DO':
			case 'TODO':
			return this.colors.todo;
			
			case 'BLOCKED':
			return this.colors.blocked;
			
			default:
			return this.colors.secondary;
		}
	}
	
	private priorityColor(code: string): string {
		switch (code) {
			case 'LOW':
			return this.colors.success;
			
			case 'MEDIUM':
			return this.colors.info;
			
			case 'HIGH':
			return this.colors.warning;
			
			case 'CRITICAL':
			case 'URGENT':
			return this.colors.danger;
			
			default:
			return this.colors.secondary;
		}
	}
	
	private budgetColor(code: string): string {
		if (
			code.includes('OVER_100') ||
			code.includes('OVER100') ||
			code.includes('OVER')
			) {
			return this.colors.budgetDanger;
		}
		
		if (
			code.includes('81_100') ||
			code.includes('80_100') ||
			code.includes('81_TO_100')
			) {
			return this.colors.budgetWarning;
		}
		
		if (
			code.includes('51_80') ||
			code.includes('50_80') ||
			code.includes('51_TO_80')
			) {
			return this.colors.warning;
		}
		
		if (
			code.includes('0_50') ||
			code.includes('0_TO_50')
			) {
			return this.colors.info;
		}
		
		if (
			code.includes('NO_COST_BUDGET') ||
			code.includes('NO_BUDGET') ||
			code.includes('NONE')
			) {
			return this.colors.secondary;
		}
		
		return this.colors.primary;
	}
	
	private progressColor(code: string): string {
		if (
			code.includes('81_100') ||
			code.includes('80_100') ||
			code.includes('81_TO_100')
			) {
			return this.colors.success;
		}
		
		if (
			code.includes('61_80') ||
			code.includes('61_TO_80')
			) {
			return this.colors.purple;
		}
		
		if (
			code.includes('41_60') ||
			code.includes('41_TO_60')
			) {
			return this.colors.primary;
		}
		
		if (
			code.includes('21_40') ||
			code.includes('21_TO_40')
			) {
			return this.colors.info;
		}
		
		if (
			code.includes('0_20') ||
			code.includes('0_TO_20')
			) {
			return this.colors.lightGray;
		}
		
		return this.stableBucketColor(code);
	}
	
	private stableBucketColor(code: string): string {
		const palette = [
			'#0d6efd',
			'#198754',
			'#6f42c1',
			'#20c997',
			'#fd7e14',
			'#0dcaf0',
			'#6610f2',
			'#d63384',
		];
		
		let hash = 0;
		
		for (let i = 0; i < code.length; i++) {
			hash = code.charCodeAt(i) + ((hash << 5) - hash);
		}
		
		return palette[Math.abs(hash) % palette.length];
	}
	
	private healthColor(code: string): string {
		if (
			code.includes('OVERDUE') ||
			code.includes('DELAYED') ||
			code.includes('LATE')
			) {
			return this.colors.overdue;
		}
		
		if (
			code.includes('DUE_SOON') ||
			code.includes('DUE_SOON_7D') ||
			code.includes('WARNING') ||
			code.includes('RISK')
			) {
			return this.colors.warning;
		}
		
		if (
			code.includes('ON_TRACK') ||
			code.includes('ONTRACK') ||
			code.includes('GOOD') ||
			code.includes('HEALTHY')
			) {
			return this.colors.success;
		}
		
		return this.colors.secondary;
	}
	
	private normalizeCode(value?: string | null): string {
		return String(value ?? '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	}
	
	private emptyDoughnut(): ChartData<'doughnut', number[], string> {
		return {
			labels: [],
			datasets: [{ data: [] }],
		};
	}
	
	private emptyBar(): ChartData<'bar', number[], string> {
		return {
			labels: [],
			datasets: [{ data: [] }],
		};
	}
	
	private refreshCharts(): void {
		this.cdr.detectChanges();
		
		setTimeout(() => {
			this.charts?.forEach(chart => chart.update());
		}, 0);
	}
	
	money(value?: number | null): string {
		const currency = this.data?.finance?.currency_code || 'MYR';
		
		return `${currency} ${Number(value ?? 0).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
		})}`;
	}
	
	statusBadgeClass(code?: string | null): string {
		const normalized = this.normalizeCode(code);
		
		switch (normalized) {
			case 'COMPLETED':
			case 'DONE':
			return 'badge-status-completed';
			
			case 'IN_PROGRESS':
			case 'INPROGRESS':
			return 'badge-status-progress';
			
			case 'PLANNED':
			case 'PENDING':
			case 'NOT_STARTED':
			return 'badge-status-planned';
			
			case 'AT_RISK':
			return 'badge-status-risk';
			
			case 'DELAYED':
			case 'LATE':
			return 'badge-status-delayed';
			
			case 'OVERDUE':
			return 'badge-status-overdue';
			
			case 'CANCELLED':
			case 'CANCELED':
			case 'CANCEL':
			return 'badge-status-cancelled';
			
			case 'ON_HOLD':
			case 'ONHOLD':
			return 'badge-status-hold';
			
			case 'BLOCKED':
			return 'badge-status-blocked';
			
			case 'TO_DO':
			case 'TODO':
			return 'badge-status-todo';
			
			default:
			return 'badge-status-default';
		}
	}
	
	laymanHealthLabel(): string {
		if (!this.data) return 'Unknown';
		
		const dangerScore =
		this.data.counts.overdue_projects +
		this.data.task_counts.overdue +
		this.data.counts.delayed_count;
		
		if (dangerScore > 0) return 'Needs Attention';
		
		if (
			this.data.counts.at_risk > 0 ||
			this.data.task_counts.due_in_7_days > 0 ||
			this.data.counts.due_in_7_days > 0
			) {
			return 'Watch Closely';
		}
		
		return 'Healthy';
	}
	
	laymanHealthClass(): string {
		const label = this.laymanHealthLabel();
		
		if (label === 'Needs Attention') return 'layman-danger';
		if (label === 'Watch Closely') return 'layman-warning';
		
		return 'layman-success';
	}
	
	laymanHealthIcon(): string {
		const label = this.laymanHealthLabel();
		
		if (label === 'Needs Attention') return 'bi-exclamation-triangle-fill';
		if (label === 'Watch Closely') return 'bi-eye-fill';
		
		return 'bi-check-circle-fill';
	}
	
	laymanHealthMessage(): string {
		if (!this.data) return '-';
		
		if (this.laymanHealthLabel() === 'Needs Attention') {
			return 'Some projects or tasks are late. Please review the attention list below.';
		}
		
		if (this.laymanHealthLabel() === 'Watch Closely') {
			return 'Most work is moving, but some items are approaching deadlines or risk.';
		}
		
		return 'Overall project delivery looks stable at the moment.';
	}
	
	laymanMoneyLabel(): string {
		const finance = this.data?.finance;
		
		if (!finance) return 'No Financial Data';
		
		if (finance.variance < 0) {
			return 'Funding Gap';
		}
		
		if ((finance.cost_utilization_pct ?? 0) > 100) {
			return 'Over Budget';
		}
		
		return 'Within Budget';
	}
	
	laymanMoneyClass(): string {
		const finance = this.data?.finance;
		
		if (!finance) return 'layman-neutral';
		
		if (finance.variance < 0 || (finance.cost_utilization_pct ?? 0) > 100) {
			return 'layman-danger';
		}
		
		if ((finance.cost_utilization_pct ?? 0) >= 80) {
			return 'layman-warning';
		}
		
		return 'layman-success';
	}
	
	laymanMoneyMessage(): string {
		const finance = this.data?.finance;
		
		if (!finance) return 'No financial information has been recorded yet.';
		
		if (finance.variance < 0) {
			return `There is a negative funding position of ${this.money(finance.variance)}.`;
		}
		
		if ((finance.cost_utilization_pct ?? 0) > 100) {
			return 'Spending is higher than the planned cost.';
		}
		
		return `Spending is currently at ${finance.cost_utilization_pct ?? 0}% of planned cost.`;
	}
	
	laymanDeliveryLabel(): string {
		if (!this.data) return 'Unknown';
		
		if (this.data.task_counts.overdue > 0) {
			return 'Late Tasks Exist';
		}
		
		if (this.data.task_counts.due_in_7_days > 0) {
			return 'Tasks Due Soon';
		}
		
		return 'No Immediate Deadline Issue';
	}
	
	laymanCompletionPercent(): number {
		if (!this.data || this.data.task_counts.total === 0) {
			return 0;
		}
		
		return Math.round(
			(this.data.task_counts.completed / this.data.task_counts.total) * 100
		);
	}
	
	laymanAttentionCount(): number {
		if (!this.data) return 0;
		
		return this.data.counts.overdue_projects +
		this.data.task_counts.overdue +
		this.data.over_budget_projects.length;
	}
}