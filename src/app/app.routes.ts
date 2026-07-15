import { Routes } from '@angular/router';
import { ShellComponent } from './shared/layout/shell/shell';
import { LoginComponent } from './features/auth/login/login';
import { DashboardComponent } from './features/dashboard/dashboard/dashboard';
import { authGuard } from './core/guards/auth-guard';
import { permissionGuard } from './core/guards/permission-guard';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginComponent,
		title: 'Login',
	},
	{
		path: '',
		component: ShellComponent,
		canActivate: [authGuard],
		children: [
			{
				path: '',
				redirectTo: 'dashboard',
				pathMatch: 'full',
			},
			
			{
				path: 'forbidden',
				loadComponent: () =>
				import('./features/auth/forbidden/forbidden')
				.then(m => m.ForbiddenComponent),
				title: 'Access Denied',
			},
			
			{
				path: 'dashboard',
				component: DashboardComponent,
				canActivate: [permissionGuard(['dashboard.view'])],
				title: 'Dashboard',
			},
			
			// Audit Logs
			{
				path: 'audit-logs',
				canActivate: [permissionGuard(['audit.view'])],
				loadComponent: () =>
				import('./features/audit/audit-logs/audit-logs')
				.then(m => m.AuditLogsComponent),
				title: 'Audit Logs',
			},
			{
				path: 'audit-logs/:id',
				canActivate: [permissionGuard(['audit.view'])],
				loadComponent: () =>
				import('./features/audit/audit-log-detail/audit-log-detail')
				.then(m => m.AuditLogDetailComponent),
				title: 'Audit Logs',
			},
			
			// External Risk Issues
			{
				path: 'external-risk-issues',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issues')
				.then(m => m.ExternalRiskIssuesComponent),
				title: 'External Risk Issues',
			},
			{
				path: 'external-risk-issues/new',
				canActivate: [permissionGuard(['projects.write'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
				title: 'External Risk Issues',
			},
			{
				path: 'external-risk-issues/:id/edit',
				canActivate: [permissionGuard(['projects.write'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-form/external-risk-issue-form')
				.then(m => m.ExternalRiskIssueFormComponent),
				title: 'External Risk Issues',
			},
			{
				path: 'external-risk-issues/:id',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/risk/external-risk-issues/external-risk-issue-detail/external-risk-issue-detail')
				.then(m => m.ExternalRiskIssueDetailComponent),
				title: 'External Risk Issues',
			},
			
			// Projects
			{
				path: 'projects',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/projects/projects/projects')
				.then(m => m.ProjectsComponent),
				title: 'Projects',
			},
			{
				path: 'projects/new',
				canActivate: [permissionGuard(['projects.write'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form')
				.then(m => m.ProjectFormComponent),
				title: 'New Project',
			},
			{
				path: 'projects/:id',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/projects/project-detail/project-detail')
				.then(m => m.ProjectDetailComponent),
				title: 'Project Detail',
			},
			{
				path: 'projects/:id/edit',
				canActivate: [permissionGuard(['projects.write'])],
				loadComponent: () =>
				import('./features/projects/project-form/project-form')
				.then(m => m.ProjectFormComponent),
				title: 'Edit Project',
			},
			
			// Project Milestones
			{
				path: 'projects/:projectId/milestones',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestones/project-milestones')
				.then(m => m.ProjectMilestonesComponent),
				title: 'Project Milestones',
			},
			{
				path: 'projects/:projectId/milestones/new',
				canActivate: [permissionGuard(['milestones.write'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form')
				.then(m => m.ProjectMilestoneFormComponent),
				title: 'Project Milestones',
			},
			{
				path: 'projects/:projectId/milestones/:milestoneId',
				canActivate: [permissionGuard(['milestones.write'])],
				loadComponent: () =>
				import('./features/projects/milestones/project-milestone-form/project-milestone-form')
				.then(m => m.ProjectMilestoneFormComponent),
				title: 'Project Milestones',
			},
			
			// Project Gantt / Tasks
			{
				path: 'projects/:id/gantt',
				canActivate: [permissionGuard(['projects.read'])],
				loadComponent: () =>
				import('./features/projects/project-gantt/project-gantt')
				.then(m => m.ProjectGanttComponent),
				title: 'Project Task',
			},
			{
				path: 'projects/:id/tasks/new',
				canActivate: [permissionGuard(['tasks.write'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
				title: 'Project Task',
			},
			{
				path: 'projects/:id/tasks/:taskId',
				canActivate: [permissionGuard(['tasks.write'])],
				loadComponent: () =>
				import('./features/projects/project-task-form/project-task-form')
				.then(m => m.ProjectTaskFormComponent),
				title: 'Project Task',
			},
			// ePTW Sync
			{
				path: 'eptw-sync',
				title: 'ePTW Sync',
				canActivate: [permissionGuard(['permits.read'])],
				loadComponent: () =>
				import('./features/eptw/eptw-sync/eptw-sync')
				.then(m => m.EptwSyncComponent),
			},
			
			// Admin
			{
				path: 'admin',
				canActivate: [
					permissionGuard([
						'users.manage',
						'roles.manage',
						'masterdata.manage',
					]),
				],
				children: [
					{
						path: '',
						redirectTo: 'users',
						pathMatch: 'full',
					},
					
					// Users
					{
						path: 'users',
						canActivate: [permissionGuard(['users.manage'])],
						loadComponent: () =>
						import('./features/admin/users/users/users')
						.then(m => m.UsersComponent),
						title: 'User Management',
					},
					{
						path: 'users/new',
						canActivate: [permissionGuard(['users.manage'])],
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form')
						.then(m => m.UserFormComponent),
						title: 'User Management',
					},
					{
						path: 'users/:id',
						canActivate: [permissionGuard(['users.manage'])],
						loadComponent: () =>
						import('./features/admin/users/user-form/user-form')
						.then(m => m.UserFormComponent),
						title: 'User Management',
					},
					
					// Roles
					{
						path: 'roles',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/roles/roles/roles')
						.then(m => m.RolesComponent),
						title: 'Roles Management',
					},
					{
						path: 'roles/new',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form')
						.then(m => m.RoleFormComponent),
						title: 'Roles Management',
					},
					{
						path: 'roles/:id',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/roles/role-form/role-form')
						.then(m => m.RoleFormComponent),
						title: 'Roles Management',
					},
					
					// Permissions
					{
						path: 'permissions',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/permissions/permissions/permissions')
						.then(m => m.PermissionsComponent),
						title: 'Permission Management',
					},
					{
						path: 'permissions/new',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/permissions/permission-form/permission-form')
						.then(m => m.PermissionFormComponent),
						title: 'Permission Management',
					},
					{
						path: 'permissions/:id',
						canActivate: [permissionGuard(['roles.manage'])],
						loadComponent: () =>
						import('./features/admin/permissions/permission-form/permission-form')
						.then(m => m.PermissionFormComponent),
						title: 'Permission Management',
					},
					
					// Departments
					{
						path: 'departments',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/departments/departments')
						.then(m => m.DepartmentsComponent),
						title: 'Department Management',
					},
					{
						path: 'departments/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/departments/department-form/department-form')
						.then(m => m.DepartmentFormComponent),
						title: 'Department Management',
					},
					{
						path: 'departments/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/departments/department-form/department-form')
						.then(m => m.DepartmentFormComponent),
						title: 'Department Management',
					},
					
					// Priorities
					{
						path: 'priorities',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/priorities/priorities/priorities')
						.then(m => m.PrioritiesComponent),
						title: 'Priorities Management',
					},
					{
						path: 'priorities/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form')
						.then(m => m.PriorityFormComponent),
						title: 'Priorities Management',
					},
					{
						path: 'priorities/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/priorities/priority-form/priority-form')
						.then(m => m.PriorityFormComponent),
						title: 'Priorities Management',
					},
					
					// Risk Issue Types
					{
						path: 'risk-issue-types',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-types/risk-issue-types')
						.then(m => m.RiskIssueTypesComponent),
						title: 'Risk Issue Types Management',
					},
					{
						path: 'risk-issue-types/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
						title: 'Risk Issue Types Management',
					},
					{
						path: 'risk-issue-types/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-types/risk-issue-type-form/risk-issue-type-form')
						.then(m => m.RiskIssueTypeFormComponent),
						title: 'Risk Issue Types Management',
					},
					
					// External Sources
					{
						path: 'external-sources',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/external-sources/external-sources/external-sources')
						.then(m => m.ExternalSourcesComponent),
						title: 'External Sources Management',
					},
					{
						path: 'external-sources/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
						title: 'External Sources Management',
					},
					{
						path: 'external-sources/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/external-sources/external-source-form/external-source-form')
						.then(m => m.ExternalSourceFormComponent),
						title: 'External Sources Management',
					},
					
					// Project Statuses
					{
						path: 'project-statuses',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/project-statuses/project-statuses/project-statuses')
						.then(m => m.ProjectStatusesComponent),
						title: 'Project Status Management',
					},
					{
						path: 'project-statuses/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
						title: 'Project Status Management',
					},
					{
						path: 'project-statuses/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/project-statuses/project-status-form/project-status-form')
						.then(m => m.ProjectStatusFormComponent),
						title: 'Project Status Management',
					},
					
					// Risk Issue Statuses
					{
						path: 'risk-issue-statuses',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-statuses/risk-issue-statuses')
						.then(m => m.RiskIssueStatusesComponent),
						title: 'Risk Issue Management',
					},
					{
						path: 'risk-issue-statuses/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form')
						.then(m => m.RiskIssueStatusFormComponent),
						title: 'Risk Issue Management',
					},
					{
						path: 'risk-issue-statuses/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/risk-issue-statuses/risk-issue-status-form/risk-issue-status-form')
						.then(m => m.RiskIssueStatusFormComponent),
						title: 'Risk Issue Management',
					},
					
					// Severities
					{
						path: 'severities',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/severities/severities/severities')
						.then(m => m.SeveritiesComponent),
						title: 'Severities Management',
					},
					{
						path: 'severities/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form')
						.then(m => m.SeverityFormComponent),
						title: 'Severities Management',
					},
					{
						path: 'severities/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/severities/severity-form/severity-form')
						.then(m => m.SeverityFormComponent),
						title: 'Severities Management',
					},
					
					// Task Statuses
					{
						path: 'task-statuses',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/task-statuses/task-statuses/task-statuses')
						.then(m => m.TaskStatusesComponent),
						title: 'Task Statuses Management',
					},
					{
						path: 'task-statuses/new',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form')
						.then(m => m.TaskStatusFormComponent),
						title: 'Task Statuses Management',
					},
					{
						path: 'task-statuses/:id',
						canActivate: [permissionGuard(['masterdata.manage'])],
						loadComponent: () =>
						import('./features/admin/task-statuses/task-status-form/task-status-form')
						.then(m => m.TaskStatusFormComponent),
						title: 'Task Statuses Management',
					},
				],
			},
		],
	},
	
	{
		path: '**',
		redirectTo: 'login',
	},
];