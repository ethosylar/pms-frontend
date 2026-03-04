import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiService, UserRow, LaravelPaginated,UserDto, ApiCollection } from '../../../../core/services/api.service';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
	standalone: true,
	selector: 'app-admin-users',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './users.html',
	styleUrls: ['./users.scss'],
})
export class UsersComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: UserDto[] = [];
	
	// simple pagination
	page = 1;
	perPage = 10;
	total = 0;
	lastPage = 1;
	
	// search
	search = '';
	
	constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getUsers({ search: this.search || undefined, page: this.page, per_page: this.perPage })
		.pipe(finalize(() => {(this.loading = false);this.cdr.detectChanges();}))
		.subscribe({
			next: (res: ApiCollection<UserDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load users.';
			}
		});
	}
	
	onSearchEnter(): void {
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (next < 1 || next > this.lastPage) return;
		this.page = next;
		this.fetch();
	}
	
	roleText(u: UserDto): string {
		const roles = u.roles ?? [];
		return roles.map(r => r.code).join(', ') || '-';
	}
	
	deptText(u: UserRow): string {
		if (!u.department) return '-';
		return u.department.name || u.department.code || '-';
	}
	
	deleteUser(u: UserDto) {
		const ok = confirm(`Delete user "${u.name}" (${u.email})?`);
		if (!ok) return;
		
		this.loading = true;
		this.api.deleteUser(u.id)
		.pipe(finalize(() => (this.loading = false)))
		.subscribe({
			next: () => this.fetch(),
			error: (err) => {
				console.error(err);
				this.error = 'Failed to delete user.';
			}
		});
	}
}
