import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { finalize } from 'rxjs/operators';
import { DashboardOverviewResponse, DashboardOverviewData } from './dashboard.models';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
	standalone: true,
	selector: 'app-dashboard',
	imports: [CommonModule, RouterModule, BaseChartDirective],
	//imports: [CommonModule, RouterModule],
	templateUrl: './dashboard.html',
	styleUrls: ['./dashboard.scss'],
})
export class DashboardComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	data: DashboardOverviewData | null = null;
	now = new Date();
	
	projectsByStatusData: ChartData<'doughnut', number[], string> = {
		labels: [],
		datasets: [{ data: [] }],
	};
	projectsByStatusOptions: ChartOptions<'doughnut'> = { responsive: true };
	
	private mapDoughnut(items: { label: string; value: number }[]) {
		return {
			labels: items.map((i) => i.label),
			datasets: [{ data: items.map((i) => i.value) }],
		};
	}
	@ViewChild(BaseChartDirective) chart?: BaseChartDirective;
	constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}
	
	ngOnInit(): void {
		this.api
		.dashboardOverview()
		.pipe(finalize(() => (this.loading = false)))
		.subscribe({
			next: (res: DashboardOverviewResponse) => {
				console.log('Dashboard overview response:', res);
				this.data = res.data;
				this.projectsByStatusData = this.mapDoughnut(this.data.charts.projects_by_status);
				
				setTimeout(() => {
					this.chart?.update();
					this.cdr.detectChanges();
				}, 0);
			},
			error: (err) => {
				console.error('Dashboard overview error:', err);
				this.error = 'Failed to load dashboard overview';
			},
		});
	}
	
	get counts() {
		return this.data?.counts;
	}
}
