import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth';
import { AuthUser } from '../../../core/auth/auth.models';
import { ToastContainerComponent } from '../../ui/toast/toast-container';

type SidebarItem = {
	label: string;
	route: string;
	icon: string;
	permissions: string[];
	exact?: boolean;
};

@Component({
	standalone: true,
	selector: 'app-shell',
	imports: [
		CommonModule,
		RouterModule,
		ToastContainerComponent,
	],
	templateUrl: './shell.html',
	styleUrls: ['./shell.scss'],
})
export class ShellComponent {
	user$: Observable<AuthUser | null>;
	
	sidebarCollapsed = false;
	
	mainItems: SidebarItem[] = [
		{
			label: 'Dashboard',
			route: '/dashboard',
			icon: 'bi-speedometer2',
			permissions: ['dashboard.view'],
			exact: true,
		},
		{
			label: 'Projects',
			route: '/projects',
			icon: 'bi-kanban',
			permissions: ['projects.read'],
		},
		{
			label: 'Risk Issues',
			route: '/external-risk-issues',
			icon: 'bi-exclamation-triangle',
			permissions: ['projects.read'],
		},
		{
			label: 'ePTW Sync',
			route: '/eptw-sync',
			icon: 'bi-arrow-repeat',
			permissions: ['permits.read'],
		},
		{
			label: 'Audit Logs',
			route: '/audit-logs',
			icon: 'bi-clipboard-data',
			permissions: ['audit.view'],
		},
	];
	
	accessControlItems: SidebarItem[] = [
		{
			label: 'Users',
			route: '/admin/users',
			icon: 'bi-people',
			permissions: ['users.manage'],
		},
		{
			label: 'Roles',
			route: '/admin/roles',
			icon: 'bi-shield-lock',
			permissions: ['roles.manage'],
		},
		{
			label: 'Permissions',
			route: '/admin/permissions',
			icon: 'bi-key',
			permissions: ['roles.manage'],
		},
	];
	
	masterDataItems: SidebarItem[] = [
		{
			label: 'Departments',
			route: '/admin/departments',
			icon: 'bi-building',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'External Sources',
			route: '/admin/external-sources',
			icon: 'bi-link-45deg',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Priorities',
			route: '/admin/priorities',
			icon: 'bi-sort-numeric-down',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Project Status',
			route: '/admin/project-statuses',
			icon: 'bi-flag',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Risk Statuses',
			route: '/admin/risk-issue-statuses',
			icon: 'bi-flag',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Risk Issue Types',
			route: '/admin/risk-issue-types',
			icon: 'bi-shield-exclamation',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Severities',
			route: '/admin/severities',
			icon: 'bi-thermometer-half',
			permissions: ['masterdata.manage'],
		},
		{
			label: 'Task Statuses',
			route: '/admin/task-statuses',
			icon: 'bi-list-check',
			permissions: ['masterdata.manage'],
		},
	];
	
	constructor(
		private auth: AuthService,
		private router: Router
		) {
		this.user$ = this.auth.user$;
	}
	
	canAny(permissions: string[]): boolean {
		if (!permissions.length) {
			return true;
		}
		
		return this.auth.hasAnyPermission(permissions);
	}
	
	showGroup(items: SidebarItem[]): boolean {
		return items.some(item => this.canAny(item.permissions));
	}
	
	showAdminSection(): boolean {
		return this.showGroup(this.accessControlItems) ||
		this.showGroup(this.masterDataItems);
	}
	
	toggleSidebar(): void {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}
	
	currentPageTitle(): string {
		const url = this.router.url.split('?')[0].split('#')[0];
		
		const allItems = [
			...this.mainItems,
			...this.accessControlItems,
			...this.masterDataItems,
		];
		
		const matched = allItems
		.filter(item =>
			url === item.route ||
			url.startsWith(item.route + '/')
		)
		.sort((a, b) => b.route.length - a.route.length)[0];
		
		if (matched) {
			return matched.label;
		}
		
		if (url.startsWith('/admin')) {
			return 'Administration';
		}
		
		return 'Dashboard';
	}
	
	logout(): void {
		this.auth.logout().subscribe({
			next: () => this.router.navigateByUrl('/login'),
			error: () => this.router.navigateByUrl('/login'),
		});
	}
}