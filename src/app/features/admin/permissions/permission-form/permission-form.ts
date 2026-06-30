import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ApiResource, ApiService, PermissionDto, PermissionUpsertPayload } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-permission-form',
	imports: [
		CommonModule,
		RouterModule,
		ReactiveFormsModule,
	],
	templateUrl: './permission-form.html',
	styleUrls: ['./permission-form.scss'],
})
export class PermissionFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	permissionId: number | null = null;
	
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
			code: ['', [
				Validators.required,
				Validators.pattern(/^[a-z0-9._-]+$/),
			]],
			name: ['', [Validators.required]],
			module: [''],
			description: [''],
			sort_order: [0],
			is_active: [true],
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		
		this.isCreate = !idParam || idParam === 'new';
		this.permissionId = this.isCreate ? null : Number(idParam);
		
		const req$: Observable<ApiResource<PermissionDto> | null> = this.isCreate
		? of(null)
		: this.api.getPermission(this.permissionId!);
		
		req$
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiResource<PermissionDto> | null) => {
				if (!res) {
					return;
				}
				
				const p = res.data;
				
				this.form.patchValue({
					code: p.code,
					name: p.name,
					module: p.module ?? '',
					description: p.description ?? '',
					sort_order: p.sort_order ?? 0,
					is_active:
					(p.is_active as unknown) === true ||
					(p.is_active as unknown) === 1,
				});
				
				if (p.code === 'system.all') {
					this.form.get('code')?.disable();
				}
				
				this.cdr.detectChanges();
			},
			error: (err: any) => {
				console.error(err);
				this.error = 'Failed to load permission.';
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
		
		const raw = this.form.getRawValue();
		
		const payload: PermissionUpsertPayload = {
			code: String(raw.code ?? '').trim().toLowerCase(),
			name: String(raw.name ?? '').trim(),
			module: raw.module ? String(raw.module).trim() : null,
			description: raw.description
			? String(raw.description).trim()
			: null,
			sort_order: Number(raw.sort_order ?? 0),
			is_active: !!raw.is_active,
		};
		
		this.saving = true;
		
		const req$: Observable<ApiResource<PermissionDto> | { ok: true; message?: string }> =
		this.isCreate
        ? this.api.createPermission(payload)
        : this.api.updatePermission(this.permissionId!, payload);
		
		req$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					this.isCreate
					? 'Permission created successfully.'
					: 'Permission updated successfully.'
				);
				
				this.router.navigateByUrl('/admin/permissions');
			},
			error: (err: any) => {
				console.error(err);
				
				if (err?.status === 422) {
					const errors = err?.error?.errors;
					const firstKey = errors ? Object.keys(errors)[0] : null;
					
					this.error = firstKey
					? errors[firstKey][0]
					: 'Validation failed.';
					} else {
					this.error = this.isCreate
					? 'Failed to create permission.'
					: 'Failed to update permission.';
				}
				
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/permissions');
	}
}