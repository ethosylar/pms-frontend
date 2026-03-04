export interface DashboardOverviewResponse {
  data: DashboardOverviewData;
}

export interface DashboardOverviewData {
  counts: DashboardCounts;
  delayed_projects: DelayedProject[];
  upcoming_milestones: UpcomingMilestone[];
  charts: DashboardCharts;
}

export interface DashboardCounts {
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

export interface DelayedProject {
  id: number;
  code: string;
  name: string;
  target_end_date: string;
  progress: number;
  status_code: string;
}

export interface UpcomingMilestone {
  id: number;
  project_id: number;
  name: string;
  milestone_date: string;
  project?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface ChartItem {
  key: string;
  label: string;
  value: number;
}

export interface DashboardCharts {
  projects_by_status: ChartItem[];
  projects_by_department: ChartItem[];
  projects_by_priority: ChartItem[];
  progress_distribution: ChartItem[];
  tasks_by_status: ChartItem[];
  project_timeline_health: ChartItem[];
}
