import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import {
	ApiService,
	ApiCollection,
	ProjectDto,
	DepartmentDto,
	PriorityDto,
	ProjectStatusDto,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-projects',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './projects.html',
	styleUrls: ['./projects.scss'],
})
export class ProjectsComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: ProjectDto[] = [];
	
	// lookups
	departments: DepartmentDto[] = [];
	statuses: ProjectStatusDto[] = [];
	priorities: PriorityDto[] = [];
	
	// pagination
	page = 1;
	perPage = 10;
	lastPage = 1;
	total = 0;
	
	form: FormGroup;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private toast: ToastService,
		private router: Router,
		private cdr: ChangeDetectorRef
		) {
		this.form = this.fb.group({
			search: [''],
			department_id: [null],
			status_id: [null],
			priority_id: [null],
			delayed: [false],
		});
	}
	
	ngOnInit(): void {
		this.loading = true;
		
		forkJoin({
			departments: this.api.getDepartments({ per_page: 200 }).pipe(catchError(() => of({ data: [] } as any))),
			statuses: this.api.getProjectStatuses({ per_page: 200, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
			priorities: this.api.getPriorities({ per_page: 200, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res) => {
				this.departments = (res.departments as ApiCollection<DepartmentDto>)?.data ?? [];
				this.statuses = (res.statuses as ApiCollection<ProjectStatusDto>)?.data ?? [];
				this.priorities = (res.priorities as ApiCollection<PriorityDto>)?.data ?? [];
				this.load(1);
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load lookup data.';
			},
		});
	}
	
	load(page: number): void {
		this.error = null;
		this.loading = true;
		
		const v = this.form.value;
		
		this.api
		.getProjects({
			search: (v.search ?? '').trim() || undefined,
			department_id: v.department_id ?? undefined,
			status_id: v.status_id ?? undefined,
			priority_id: v.priority_id ?? undefined,
			delayed: !!v.delayed,
			page,
			per_page: this.perPage,
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res) => {
				this.rows = res.data ?? [];
				this.page = res.meta?.current_page ?? page;
				this.perPage = res.meta?.per_page ?? this.perPage;
				this.total = res.meta?.total ?? 0;
				this.lastPage = res.meta?.last_page ?? 1;
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load projects.';
			},
		});
	}
	
	apply(): void {
		this.load(1);
	}
	
	reset(): void {
		this.form.reset({
			search: '',
			department_id: null,
			status_id: null,
			priority_id: null,
			delayed: false,
		});
		this.load(1);
	}
	
	pages(): number[] {
		// small pager window
		const win = 2;
		const start = Math.max(1, this.page - win);
		const end = Math.min(this.lastPage, this.page + win);
		const out: number[] = [];
		for (let i = start; i <= end; i++) out.push(i);
		return out;
	}
	
	delete(row: ProjectDto): void {
		const ok = confirm(`Delete project "${row.code} - ${row.name}"?\nThis cannot be undone.`);
		if (!ok) return;
		
		this.loading = true;
		this.api
		.deleteProject(row.id)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Project deleted.');
				// reload current page safely
				const newPage = Math.min(this.page, this.lastPage);
				this.load(newPage);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to delete project.');
			},
		});
	}
	
	goNew(): void {
		this.router.navigateByUrl('/projects/new');
	}
	
	statusBadgeClass(code?: string | null): string {
		const value = String(code ?? '').trim().toUpperCase();
		
		switch (value) {
			case 'COMPLETED':
			return 'bg-success';
			
			case 'DELAYED':
			return 'bg-danger';
			
			case 'AT_RISK':
			return 'bg-warning text-dark';
			
			case 'IN_PROGRESS':
			case 'INPROGRESS':
			return 'bg-primary';
			
			case 'ON_HOLD':
			case 'ONHOLD':
			return 'bg-secondary';
			
			case 'PLANNED':
			case 'PENDING':
			return 'bg-info text-dark';
			
			case 'CANCELLED':
			return 'bg-dark';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	priorityBadgeClass(code?: string | null): string {
		const value = String(code ?? '').trim().toUpperCase();
		
		switch (value) {
			case 'LOW':
			return 'bg-success';
			
			case 'MEDIUM':
			return 'bg-info text-dark';
			
			case 'HIGH':
			return 'bg-warning text-dark';
			
			case 'CRITICAL':
			return 'bg-danger';
			
			default:
			return 'bg-light text-dark border';
		}
	}
}
