export interface DashboardOverviewResponse {
	data: DashboardOverviewData;
}

export interface DashboardOverviewData {
	counts: DashboardProjectCounts;
	task_counts: DashboardTaskCounts;
	milestone_counts: DashboardMilestoneCounts;
	
	finance: DashboardFinanceOverview | null;
	
	delayed_projects: DelayedProject[];
	overdue_tasks: OverdueTask[];
	upcoming_milestones: UpcomingMilestone[];
	over_budget_projects: OverBudgetProject[];
	
	charts: DashboardCharts;
}

export interface DashboardProjectCounts {
	total: number;
	in_progress: number;
	at_risk: number;
	delayed_count: number;
	on_hold: number;
	completed: number;
	due_in_7_days: number;
	overdue_projects: number;
	avg_progress_in_progress: number | null;
}

export interface DashboardTaskCounts {
	total: number;
	in_progress: number;
	completed: number;
	delayed: number;
	overdue: number;
	due_in_7_days: number;
	avg_progress: number | null;
}

export interface DashboardMilestoneCounts {
	total: number;
	completed: number;
	pending: number;
	overdue: number;
	due_in_14_days: number;
}

export interface DashboardFinanceOverview {
	currency_code: string;
	
	planned_cost: number;
	actual_cost: number;
	committed_cost: number;
	spent_cost: number;
	
	planned_funding: number;
	actual_funding: number;
	committed_funding: number;
	received_funding: number;
	
	variance: number;
	cost_utilization_pct: number | null;
	funding_coverage_pct: number | null;
}

export interface DelayedProject {
	id: number;
	code: string;
	name: string;
	target_end_date: string | null;
	progress: number;
	status_code: string;
}

export interface OverdueTask {
	id: number;
	project_id: number;
	project_code: string;
	project_name: string;
	name: string;
	end_date: string | null;
	progress: number;
	status_code: string;
}

export interface UpcomingMilestone {
	id: number;
	project_id: number;
	name: string;
	milestone_date: string;
	status?: string | null;
	
	project?: {
		id: number;
		code: string;
		name: string;
	};
}

export interface OverBudgetProject {
	id: number;
	code: string;
	name: string;
	planned_cost: number;
	spent_cost: number;
	over_by: number;
	utilization_pct: number | null;
}

export interface ChartItem {
	key: string;
	label: string;
	value: number;
}

export interface FinanceDepartmentChartItem {
	key: string;
	label: string;
	planned_cost: number;
	spent_cost: number;
	received_funding: number;
	variance: number;
}

export interface FinanceProjectChartItem {
	id: number;
	key: string;
	label: string;
	planned_cost: number;
	spent_cost: number;
	received_funding: number;
	variance: number;
	utilization_pct: number | null;
}

export interface DeliveryForecastItem {
	month: string;
	label: string;
	projects_due: number;
	milestones_due: number;
}

export interface DashboardCharts {
	projects_by_status: ChartItem[];
	projects_by_department: ChartItem[];
	projects_by_priority: ChartItem[];
	progress_distribution: ChartItem[];
	
	tasks_by_status: ChartItem[];
	milestones_by_status: ChartItem[];
	project_timeline_health: ChartItem[];
	budget_utilization_distribution: ChartItem[];
	
	finance_by_department: FinanceDepartmentChartItem[];
	finance_by_project: FinanceProjectChartItem[];
	delivery_forecast: DeliveryForecastItem[];
}