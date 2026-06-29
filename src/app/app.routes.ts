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
				title: 'Audit Logs'
			},
			{
				path: 'audit-logs/:id',
				canActivate: [roleGuard(['ADMIN', 'AUDITOR'])],
				loadComponent: () =>
				import('./features/audit/audit-log-detail/audit-log-detail').then(m => m.AuditLogDetailComponent),
				title: 'Audit Logs'
			},
			// External Risk Issues (all auth can read)
			{
				path: 'external-risk-issues',
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issues').then(m => m.ExternalRiskIssuesComponent),
				title: 'External Risk Issues'
			},
			{
				path: 'external-risk-issues/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
				title: 'External Risk Issues'
			},
			{
				path: 'external-risk-issues/:id/edit',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
				title: 'External Risk Issues'
			},
			{
				path: 'external-risk-issues/:id',
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-detail/external-risk-issue-detail')
				.then(m => m.ExternalRiskIssueDetailComponent),
				title: 'External Risk Issues'
			},
			
			// Project Section
			{
				path: 'projects',
				loadComponent: () =>
				import('./features/projects/projects/projects').then(m => m.ProjectsComponent),
				title: 'Projects'
			},
			{
				path: 'projects/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form').then(m => m.ProjectFormComponent),
				title: 'Projects'
			},
			{
				path: 'projects/:id',
				loadComponent: () =>
				import('./features/projects/project-detail/project-detail').then(m => m.ProjectDetailComponent),
				title: 'Projects'
			},
			{
				path: 'projects/:id/edit',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form').then(m => m.ProjectFormComponent),
				title: 'Projects'
			},
			
			{
				path: 'projects/:projectId/milestones',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestones/project-milestones').then(m => m.ProjectMilestonesComponent),
				title: 'Projects'
			},
			{
				path: 'projects/:projectId/milestones/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form').then(m => m.ProjectMilestoneFormComponent),
				title: 'Project Milestones'
			},
			{
				path: 'projects/:projectId/milestones/:milestoneId',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form').then(m => m.ProjectMilestoneFormComponent),
				title: 'Project Milestones'
			},
			{
				path: 'projects/:id/gantt',
				loadComponent: () =>
				import('./features/projects/project-gantt/project-gantt')
				.then(m => m.ProjectGanttComponent),
				title: 'Project Task'
			},
			{
				path: 'projects/:id/tasks/new',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
				title: 'Project Task'
			},
			{
				path: 'projects/:id/tasks/:taskId',
				canActivate: [roleGuard(['ADMIN', 'PMO', 'PM'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
				title: 'Project Task'
			},
			
			
			
			
			
			{
				path: 'admin',
				canActivate: [roleGuard(['ADMIN'])],
				children: [
					{
						path: 'users',
						loadComponent: () =>
						import('./features/admin/users/users/users').then(m => m.UsersComponent),
						title: 'User Management'
					},
					{
						path: 'users/new',
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form').then(m => m.UserFormComponent),
						title: 'User Management'
					},
					{
						path: 'users/:id',
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form').then(m => m.UserFormComponent),
						title: 'User Management'
					},
					{
						path: 'departments', 
						loadComponent: () => 
						import('./features/admin/departments/departments').then(m => m.DepartmentsComponent),
						title: 'Department Management'
						
					},
					{
						path: 'departments/new', 
						loadComponent: () => 
						import('./features/admin/departments/department-form/department-form').then(m => m.DepartmentFormComponent),
						title: 'Department Management'
					},
					{
						path: 'departments/:id', 
						loadComponent: () => 
						import('./features/admin/departments/department-form/department-form').then(m => m.DepartmentFormComponent),
						title: 'Department Management'
					},
					{
						path: 'roles',
						loadComponent: () =>
						import('./features/admin/roles/roles/roles').then(m => m.RolesComponent),
						title: 'Roles Management'
					},
					{
						path: 'roles/new',
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form').then(m => m.RoleFormComponent),
						title: 'Roles Management'
					},
					{
						path: 'roles/:id',
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form').then(m => m.RoleFormComponent),
						title: 'Roles Management'
					},
					{
						path: 'priorities',
						loadComponent: () =>
						import('./features/admin/priorities/priorities/priorities').then(m => m.PrioritiesComponent),
						title: 'Priorities Management'
					},
					{
						path: 'priorities/new',
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form').then(m => m.PriorityFormComponent),
						title: 'Priorities Management'
					},
					{
						path: 'priorities/:id',
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form').then(m => m.PriorityFormComponent),
						title: 'Priorities Management'
					},
					{
						path: 'risk-issue-types',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-types/risk-issue-types')
						.then(m => m.RiskIssueTypesComponent),
						title: 'Risk Issue Types Management'
					},
					{
						path: 'risk-issue-types/new',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
						title: 'Risk Issue Types Management'
					},
					{
						path: 'risk-issue-types/:id',
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
						title: 'Risk Issue Types Management'
					},
					{
						path: 'external-sources',
						loadComponent: () =>
						import('./features/admin/external-sources/external-sources/external-sources')
						.then(m => m.ExternalSourcesComponent),
						title: 'External Sources Management'
					},
					{
						path: 'external-sources/new',
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
						title: 'External Sources Management'
					},
					{
						path: 'external-sources/:id',
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
						title: 'External Sources Management'
					},
					{
						path: 'project-statuses',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-statuses/project-statuses')
						.then(m => m.ProjectStatusesComponent),
						title: 'Project Status Management'
					},
					{
						path: 'project-statuses/new',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
						title: 'Project Status Management'
					},
					{
						path: 'project-statuses/:id',
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
						title: 'Project Status Management'
					},
					{
						path: 'risk-issue-statuses',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-statuses/risk-issue-statuses').then(m => m.RiskIssueStatusesComponent),
						title: 'Risk Issue Management'
					},
					{
						path: 'risk-issue-statuses/new',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form').then(m => m.RiskIssueStatusFormComponent),
						title: 'Risk Issue Management'
					},
					{
						path: 'risk-issue-statuses/:id',
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form').then(m => m.RiskIssueStatusFormComponent),
						title: 'Risk Issue Management'
					},
					{
						path: 'severities',
						loadComponent: () =>
						import('./features/admin/severities/severities/severities').then(m => m.SeveritiesComponent),
						title: 'Severities Management'
					},
					{
						path: 'severities/new',
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form').then(m => m.SeverityFormComponent),
						title: 'Severities Management'
					},
					{
						path: 'severities/:id',
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form').then(m => m.SeverityFormComponent),
						title: 'Severities Management'
					},
					{
						path: 'task-statuses',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-statuses/task-statuses').then(m => m.TaskStatusesComponent),
						title: 'Task Statuses Management'
					},
					{
						path: 'task-statuses/new',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form').then(m => m.TaskStatusFormComponent),
						title: 'Task Statuses Management'
					},
					{
						path: 'task-statuses/:id',
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form').then(m => m.TaskStatusFormComponent),
						title: 'Task Statuses Management'
					},
					
					
				],
			},
		],
	},
	
	{ path: '**', redirectTo: 'login' },
];
