import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { RoleName } from '../../../core/auth/auth.models';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ToastContainerComponent } from '../../ui/toast/toast-container';

@Component({
	standalone: true,
	selector: 'app-shell',
	imports: [CommonModule, RouterModule, ToastContainerComponent],
	templateUrl: './shell.html',
	styleUrls: ['./shell.scss'],
})
export class ShellComponent {
	user$!: Observable<any>;
	canAudit$!: Observable<boolean>;
	canAdmin$!: Observable<boolean>;
	
	sidebarCollapsed = false;
	
	constructor(
		private auth: AuthService,
		private router: Router
		) {
		this.user$ = this.auth.user$;
		
		this.canAudit$ = this.user$.pipe(
			map(u => this.auth.getRoleNames(u).some(r => r === 'ADMIN' || r === 'AUDITOR'))
		);
		
		this.canAdmin$ = this.user$.pipe(
			map(u => this.auth.getRoleNames(u).includes('ADMIN' as RoleName))
		);
	}
	
	toggleSidebar() {
		this.sidebarCollapsed = !this.sidebarCollapsed;
	}
	
	
	logout() {
		this.auth.logout().subscribe({
			next: () => this.router.navigateByUrl('/login'),
			error: () => this.router.navigateByUrl('/login'),
		});
	}
}
