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
import {
	BaseChartDirective,
} from 'ng2-charts';
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
	
	projectsByStatusData =
    this.emptyDoughnut();
	
	tasksByStatusData =
    this.emptyDoughnut();
	
	milestonesByStatusData =
    this.emptyDoughnut();
	
	timelineHealthData =
    this.emptyDoughnut();
	
	budgetUtilizationData =
    this.emptyDoughnut();
	
	projectsByDepartmentData =
    this.emptyBar();
	
	projectsByPriorityData =
    this.emptyBar();
	
	progressDistributionData =
    this.emptyBar();
	
	financeSummaryData =
    this.emptyBar();
	
	financeByDepartmentData =
    this.emptyBar();
	
	deliveryForecastData: ChartData<
    'line',
    number[],
    string
	> = {
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
			error: (err) => {
				console.error('Dashboard overview error:', err);
				this.error = 'Failed to load dashboard overview.';
			},
		});
	}
	
	private buildCharts(data: DashboardOverviewData): void {
		this.projectsByStatusData =
		this.mapDoughnut(data.charts.projects_by_status);
		
		this.tasksByStatusData =
		this.mapDoughnut(data.charts.tasks_by_status);
		
		this.milestonesByStatusData =
		this.mapDoughnut(data.charts.milestones_by_status);
		
		this.timelineHealthData =
		this.mapDoughnut(data.charts.project_timeline_health);
		
		this.budgetUtilizationData =
		this.mapDoughnut(
			data.charts.budget_utilization_distribution
		);
		
		this.projectsByDepartmentData =
		this.mapBar(data.charts.projects_by_department);
		
		this.projectsByPriorityData =
		this.mapBar(data.charts.projects_by_priority);
		
		this.progressDistributionData =
		this.mapBar(data.charts.progress_distribution);
		
		this.financeSummaryData = {
			labels: ['Cost', 'Fund'],
			datasets: [
				{
					label: 'Planned',
					data: [
						data.finance?.planned_cost ?? 0,
						data.finance?.planned_funding ?? 0,
					],
				},
				{
					label: 'Actual',
					data: [
						data.finance?.actual_cost ?? 0,
						data.finance?.actual_funding ?? 0,
					],
				},
				{
					label: 'Committed',
					data: [
						data.finance?.committed_cost ?? 0,
						data.finance?.committed_funding ?? 0,
					],
				},
			],
		};
		
		this.financeByDepartmentData =
		this.mapDepartmentFinance(
			data.charts.finance_by_department
		);
		
		this.deliveryForecastData = {
			labels: data.charts.delivery_forecast
			.map(x => x.label),
			
			datasets: [
				{
					label: 'Projects Due',
					data: data.charts.delivery_forecast
					.map(x => x.projects_due),
					tension: 0.25,
				},
				{
					label: 'Milestones Due',
					data: data.charts.delivery_forecast
					.map(x => x.milestones_due),
					tension: 0.25,
				},
			],
		};
		
		this.refreshCharts();
	}
	
	private mapDoughnut(
		items: ChartItem[]
		): ChartData<'doughnut', number[], string> {
		return {
			labels: items.map(x => x.label),
			datasets: [
				{
					data: items.map(x => Number(x.value ?? 0)),
				},
			],
		};
	}
	
	private mapBar(
		items: ChartItem[]
		): ChartData<'bar', number[], string> {
		return {
			labels: items.map(x => x.label),
			datasets: [
				{
					label: 'Projects',
					data: items.map(x => Number(x.value ?? 0)),
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
				},
				{
					label: 'Spent Cost',
					data: items.map(x => x.spent_cost),
				},
				{
					label: 'Received Funding',
					data: items.map(x => x.received_funding),
				},
			],
		};
	}
	
	private emptyDoughnut():
    ChartData<'doughnut', number[], string> {
		return {
			labels: [],
			datasets: [{ data: [] }],
		};
	}
	
	private emptyBar():
    ChartData<'bar', number[], string> {
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
		const currency =
		this.data?.finance?.currency_code || 'MYR';
		
		return `${currency} ${Number(value ?? 0)
		.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
		})}`;
	}
	
	statusBadgeClass(code?: string | null): string {
		switch (String(code ?? '').toUpperCase()) {
			case 'COMPLETED':
			case 'DONE':
			return 'bg-success';
			
			case 'DELAYED':
			return 'bg-danger';
			
			case 'AT_RISK':
			return 'bg-warning text-dark';
			
			case 'IN_PROGRESS':
			return 'bg-primary';
			
			case 'ON_HOLD':
			return 'bg-secondary';
			
			case 'CANCELLED':
			return 'bg-dark';
			
			default:
			return 'bg-info text-dark';
		}
	}
}