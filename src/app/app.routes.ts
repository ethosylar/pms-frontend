import { Routes } from '@angular/router';
import { ShellComponent } from './shared/layout/shell/shell';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginComponent,
	},
	
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{ path: '', redirectTo: 'dashboard', pathMatch: 'full' },
			{ path: 'dashboard', component: DashboardComponent },
			//{ path: 'projects', loadComponent: () => import('./features/projects/projects').then(m => m.ProjectsComponent) },
			//{ path: 'external-risk-issues', loadComponent: () => import('./features/risk/risk').then(m => m.RiskComponent) },
			{
				path: 'audit-logs',
				canActivate: [roleGuard(['ADMIN', 'AUDITOR'])],
				loadComponent: () =>
				import('./features/audit/audit-logs/audit-logs').then(m => m.AuditLogsComponent),
			},
			{
				path: 'audit-logs/:id',
				canActivate: [roleGuard(['ADMIN', 'AUDITOR'])],
				loadComponent: () =>
				import('./features/audit/audit-log-detail/audit-log-detail').then(m => m.AuditLogDetailComponent),
			},
			// External Risk Issues (all auth can read)
			{
				path: 'external-risk-issues',
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issues').then(m => m.ExternalRiskIssuesComponent),
			},
			{
				path: 'external-risk-issues/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
			},
			{
				path: 'external-risk-issues/:id/edit',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
			},
			{
				path: 'external-risk-issues/:id',
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-detail/external-risk-issue-detail')
				.then(m => m.ExternalRiskIssueDetailComponent),
			},
			
			// Project Section
			{
				path: 'projects',
				loadComponent: () =>
				import('./features/projects/projects/projects').then(m => m.ProjectsComponent),
			},
			{
				path: 'projects/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form').then(m => m.ProjectFormComponent),
			},
			{
				path: 'projects/:id',
				loadComponent: () =>
				import('./features/projects/project-detail/project-detail').then(m => m.ProjectDetailComponent),
			},
			{
				path: 'projects/:id/edit',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form').then(m => m.ProjectFormComponent),
			},
			
			{
				path: 'projects/:projectId/milestones',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestones/project-milestones').then(m => m.ProjectMilestonesComponent),
			},
			{
				path: 'projects/:projectId/milestones/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form').then(m => m.ProjectMilestoneFormComponent),
			},
			{
				path: 'projects/:projectId/milestones/:milestoneId',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form').then(m => m.ProjectMilestoneFormComponent),
			},
			{
				path: 'projects/:id/gantt',
				loadComponent: () =>
				import('./features/projects/project-gantt/project-gantt')
				.then(m => m.ProjectGanttComponent),
			},
			{
				path: 'projects/:id/tasks/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
			},
			{
				path: 'projects/:id/tasks/:taskId',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
			},
			
			
			
			
			
			{
				path: 'admin',
				canActivate: [roleGuard(['ADMIN'])],
				children: [
					{
						path: 'users',
						loadComponent: () =>
						import('./features/admin/users/users/users').then(m => m.UsersComponent),
					},
					{
						path: 'users/new',
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form').then(m => m.UserFormComponent),
					},
					{
						path: 'users/:id',
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form').then(m => m.UserFormComponent),
					},
					{
						path: 'departments', 
						loadComponent: () => 
						import('./features/admin/departments/departments').then(m => m.DepartmentsComponent) 
					},
					{
						path: 'departments/new', 
						loadComponent: () => 
						import('./features/admin/departments/department-form/department-form').then(m => m.DepartmentFormComponent) 
					},
					{
						path: 'departments/:id', 
						loadComponent: () => 
						import('./features/admin/departments/department-form/department-form').then(m => m.DepartmentFormComponent) 
					},
					{
						path: 'roles',
						loadComponent: () =>
						import('./features/admin/roles/roles/roles').then(m => m.RolesComponent),
					},
					{
						path: 'roles/new',
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form').then(m => m.RoleFormComponent),
					},
					{
						path: 'roles/:id',
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form').then(m => m.RoleFormComponent),
					},
					{
						path: 'priorities',
						loadComponent: () =>
						import('./features/admin/priorities/priorities/priorities').then(m => m.PrioritiesComponent),
					},
					{
						path: 'priorities/new',
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form').then(m => m.PriorityFormComponent),
					},
					{
						path: 'priorities/:id',
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form').then(m => m.PriorityFormComponent),
					},
					{
						path: 'risk-issue-types',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-types/risk-issue-types')
						.then(m => m.RiskIssueTypesComponent),
					},
					{
						path: 'risk-issue-types/new',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
					},
					{
						path: 'risk-issue-types/:id',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
					},
					{
						path: 'external-sources',
						loadComponent: () =>
						import('./features/admin/external-sources/external-sources/external-sources')
						.then(m => m.ExternalSourcesComponent),
					},
					{
						path: 'external-sources/new',
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
					},
					{
						path: 'external-sources/:id',
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
					},
					{
						path: 'project-statuses',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-statuses/project-statuses')
						.then(m => m.ProjectStatusesComponent),
					},
					{
						path: 'project-statuses/new',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
					},
					{
						path: 'project-statuses/:id',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
					},
					{
						path: 'risk-issue-statuses',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-statuses/risk-issue-statuses').then(m => m.RiskIssueStatusesComponent),
					},
					{
						path: 'risk-issue-statuses/new',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form').then(m => m.RiskIssueStatusFormComponent),
					},
					{
						path: 'risk-issue-statuses/:id',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form').then(m => m.RiskIssueStatusFormComponent),
					},
					{
						path: 'severities',
						loadComponent: () =>
						import('./features/admin/severities/severities/severities').then(m => m.SeveritiesComponent),
					},
					{
						path: 'severities/new',
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form').then(m => m.SeverityFormComponent),
					},
					{
						path: 'severities/:id',
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form').then(m => m.SeverityFormComponent),
					},
					{
						path: 'task-statuses',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-statuses/task-statuses').then(m => m.TaskStatusesComponent),
					},
					{
						path: 'task-statuses/new',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form').then(m => m.TaskStatusFormComponent),
					},
					{
						path: 'task-statuses/:id',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form').then(m => m.TaskStatusFormComponent),
					},
					
					
				],
			},
		],
	},
	
	{ path: '**', redirectTo: 'login' },
];
