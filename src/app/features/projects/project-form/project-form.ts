import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import {
	ApiService,
	ApiResource,
	ProjectDto,
	DepartmentDto,
	PriorityDto,
	ProjectStatusDto,
	UserDto,
	ApiCollection,
	ProjectCategoryDto,
	ProjectUpsertPayload,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-project-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './project-form.html',
	styleUrls: ['./project-form.scss'],
})
export class ProjectFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	projectId: number | null = null;
	
	form: FormGroup;
	
	departments: DepartmentDto[] = [];
	statuses: ProjectStatusDto[] = [];
	priorities: PriorityDto[] = [];
	owners: Array<{ id: number; name: string }> = [];
	categories: ProjectCategoryDto[] = [];
	
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
		) {
		this.form = this.fb.group({
			code: ['', [Validators.required]],
			name: ['', [Validators.required]],
			sponsor: [''],
			progress: [0],
			
			department_id: [null],
			project_status_id: [null],
			priority_id: [null],
			owner_user_id: [null],
			
			start_date: [null],
			actual_start_date: [null],
			target_start_date: [null],
			target_end_date: [null],
			actual_end_date: [null],
			description: [null],
			
			currency_code: ['MYR'],
			planned_cost_total: [0],
			actual_cost_total: [0],
			committed_cost_total: [0],
			planned_funding_total: [0],
			actual_funding_total: [0],
			budget_notes: [null],
			budget_updated_at: [null],
			
			project_category_id: [null],
			
			planned_progress: [0],
			
			notes: [null],
		});
	}
	
	private toDateInput(v?: string | null): string | null {
		if (!v) return null;
		if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // already OK
		const d = new Date(v);
		if (Number.isNaN(d.getTime())) return null;
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		return `${yyyy}-${mm}-${dd}`;
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		
		this.isCreate = !idParam || idParam === 'new';
		this.projectId = this.isCreate ? null : Number(idParam);
		
		this.loading = true;
		
		forkJoin({
			departments: this.api.getDepartments({ per_page: 100 }).pipe(catchError(() => of({ data: [] } as any))),
			statuses: this.api.getProjectStatuses({ per_page: 100, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
			priorities: this.api.getPriorities({ per_page: 100, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
			categories: this.api.getProjectCategories({ per_page: 100, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
			// owners are optional (your /users might be ADMIN-only). We handle failures gracefully.
			owners: this.api.getUsers({ per_page: 100 }).pipe(catchError(() => of({ data: [] } as any))),
		})
		.pipe(
			switchMap((lk) => {
				this.departments = (lk.departments as ApiCollection<DepartmentDto>)?.data ?? [];
				this.statuses = (lk.statuses as ApiCollection<ProjectStatusDto>)?.data ?? [];
				this.priorities = (lk.priorities as ApiCollection<PriorityDto>)?.data ?? [];
				this.categories = (lk.categories as ApiCollection<ProjectCategoryDto>)?.data ?? [];
				
				const users = (lk.owners as ApiCollection<UserDto>)?.data ?? [];
				this.owners = users.map(u => ({ id: u.id, name: u.name }));
				
				if (this.isCreate) return of(null);
				return this.api.getProject(this.projectId!);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiResource<ProjectDto> | null) => {
				if (!res) return;
				
				const p = res.data;
				
				this.form.patchValue({
					code: p.code,
					name: p.name,
					description: p.description ?? null,
					
					department_id: p.department?.id ?? p.department_id ?? null,
					owner_user_id: p.owner?.id ?? p.owner_user_id ?? null,
					project_status_id: p.status?.id ?? p.project_status_id ?? null,
					priority_id: p.priority?.id ?? p.priority_id ?? null,
					project_category_id: p.project_category_id ?? null,
					
					sponsor: p.sponsor ?? null,
					
					planned_progress: p.planned_progress ?? 0,
					progress: p.progress ?? 0,
					
					start_date: p.start_date ?? null,
					actual_start_date: p.actual_start_date ?? null,
					target_end_date: p.target_end_date ?? null,
					actual_end_date: p.actual_end_date ?? null,
					
					notes: p.notes ?? null,
					
					currency_code: p.currency_code ?? 'MYR',
					planned_cost_total: p.planned_cost_total ?? 0,
					actual_cost_total: p.actual_cost_total ?? 0,
					committed_cost_total: p.committed_cost_total ?? 0,
					planned_funding_total: p.planned_funding_total ?? 0,
					actual_funding_total: p.actual_funding_total ?? 0,
					budget_notes: p.budget_notes ?? null,
					budget_updated_at: p.budget_updated_at ? String(p.budget_updated_at).slice(0, 10) : null,
				});
				
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load project.';
			},
		});
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const v = this.form.value;
		
		const payload: ProjectUpsertPayload = {
			code: String(v.code).trim(),
			name: String(v.name).trim(),
			description: v.description || null,
			
			department_id: v.department_id ?? null,
			owner_user_id: v.owner_user_id ?? null,
			project_status_id: v.project_status_id ?? null,
			priority_id: v.priority_id ?? null,
			project_category_id: v.project_category_id ?? null,
			
			sponsor: v.sponsor || null,
			
			planned_progress: this.percent(v.planned_progress),
			progress: this.percent(v.progress),
			
			start_date: v.start_date || null,
			actual_start_date: v.actual_start_date || null,
			target_end_date: v.target_end_date || null,
			actual_end_date: v.actual_end_date || null,
			
			notes: v.notes || null,
			
			currency_code: v.currency_code || 'MYR',
			planned_cost_total: this.money(v.planned_cost_total),
			actual_cost_total: this.money(v.actual_cost_total),
			committed_cost_total: this.money(v.committed_cost_total),
			planned_funding_total: this.money(v.planned_funding_total),
			actual_funding_total: this.money(v.actual_funding_total),
			budget_notes: v.budget_notes || null,
			budget_updated_at: v.budget_updated_at || null,
		};
		
		this.saving = true;
		
		// normalize create/update to an ID stream (prevents TS union observable issues)
		const id$ = this.isCreate
		? this.api.createProject(payload).pipe(map((r) => r.id))
		: this.api.updateProject(this.projectId!, payload).pipe(map(() => this.projectId!));
		
		id$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (id: number) => {
				this.toast.success(this.isCreate ? 'Project created.' : 'Project updated.');
				this.router.navigate(['/projects', id]);
			},
			error: (err) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create project.' : 'Failed to update project.';
				this.cdr.detectChanges();
			},
		});
	}
	
	cancel(): void {
		if (this.projectId) this.router.navigate(['/projects', this.projectId]);
		else this.router.navigateByUrl('/projects');
	}
	
	private money(value: unknown): number {
		const n = Number(value);
		return Number.isFinite(n) && n >= 0 ? n : 0;
	}
	
	private percent(value: unknown): number {
		const n = Number(value);
		if (!Number.isFinite(n)) return 0;
		return Math.max(0, Math.min(100, n));
	}
}
