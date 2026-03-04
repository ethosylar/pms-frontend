import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService, ApiResource, RoleDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-role-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './role-form.html',
	styleUrls: ['./role-form.scss'],
})
export class RoleFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	roleId: number | null = null;
	
	form: FormGroup;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		this.form = this.fb.group({
			code: ['', [Validators.required]],
			name: ['', [Validators.required]],
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
		this.roleId = Number(idParam);
		
		this.api.getRole(this.roleId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<RoleDto>) => {
				const r = res.data;
				this.form.patchValue({
					code: r.code,
					name: r.name,
					is_active: (r.is_active as unknown) === true || (r.is_active as unknown) === 1,
				});
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load role.';
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
			is_active: !!v.is_active,
		};
		
		this.saving = true;
		
		const req$ = this.isCreate
		? this.api.createRole(payload)
		: this.api.updateRole(this.roleId!, payload);
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Role created successfully.' : 'Role updated successfully.');
				this.router.navigateByUrl('/admin/roles');
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create role.' : 'Failed to update role.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/roles');
	}
}
