import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, map } from 'rxjs/operators';
import { ApiService, ApiResource, ProjectStatusDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';
import { Observable } from 'rxjs';

@Component({
	standalone: true,
	selector: 'app-admin-project-status-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './project-status-form.html',
	styleUrls: ['./project-status-form.scss'],
})
export class ProjectStatusFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	statusId: number | null = null;
	
	form: FormGroup;
	
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
			sort_order: [0],
			is_active: [true],
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		if (!idParam || idParam === 'new') {
			this.isCreate = true;
			this.loading = false;
			this.cdr.detectChanges();
			return;
		}
		
		this.isCreate = false;
		this.statusId = Number(idParam);
		
		this.api.getProjectStatus(this.statusId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<ProjectStatusDto>) => {
				const s = res.data;
				this.form.patchValue({
					code: s.code,
					name: s.name,
					sort_order: s.sort_order ?? 0,
					is_active: (s.is_active as unknown) === true || (s.is_active as unknown) === 1,
				});
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load project status.';
				this.cdr.detectChanges();
			}
		});
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const v = this.form.value;
		
		const payload = {
			code: String(v.code).trim().toUpperCase(),
			name: String(v.name).trim(),
			sort_order: Number.isFinite(Number(v.sort_order)) ? Number(v.sort_order) : 0,
			is_active: !!v.is_active,
		};
		
		this.saving = true;
		
		const req$: Observable<unknown> = this.isCreate
		? this.api.createProjectStatus(payload)                // { id: number }
		: this.api.updateProjectStatus(this.statusId!, payload); // { ok: true }
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Project status created.' : 'Project status updated.');
				this.router.navigateByUrl('/admin/project-statuses');
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create project status.' : 'Failed to update project status.';
				this.cdr.detectChanges();
			}
		});
		
		
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/project-statuses');
	}
}
