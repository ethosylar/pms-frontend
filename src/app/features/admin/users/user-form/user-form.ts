import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { ApiService, RoleDto, UserDto, ApiCollection, ApiResource, DepartmentDto } from '../../../../core/services/api.service';
import { ChangeDetectorRef } from '@angular/core';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-user-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './user-form.html',
	styleUrls: ['./user-form.scss'],
})
export class UserFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	message: string | null = null;
	form: FormGroup;
	
	isCreate = true;
	userId: number | null = null;
	
	roles: RoleDto[] = [];
	originalRoleIds: number[] = [];
	
	departments: DepartmentDto[] = [];
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private cdr: ChangeDetectorRef,
		private toast: ToastService
		) {
		this.form = this.fb.group({
			name: ['', [Validators.required]],
			username: ['', [Validators.required]],
			email: ['', [Validators.required, Validators.email]],
			department_id: [null],
			password: [''],                 // optional on edit
			role_ids: this.fb.control<number[]>([]),
		});
	}
	
	ngOnInit(): void {
		forkJoin({
			roles: this.api.getRoles(),
			departments: this.api.getDepartments({ per_page: 2000 }) // big enough for dropdown
		}).pipe(
		switchMap(({ roles, departments }) => {
			this.roles = roles.data ?? [];
			this.departments = departments.data ?? [];
			
			const idParam = this.route.snapshot.paramMap.get('id');
			if (!idParam || idParam === 'new') {
				this.isCreate = true;
				this.userId = null;
				
				this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
				this.form.get('password')?.updateValueAndValidity();
				
				return of(null);
			}
			
			this.isCreate = false;
			this.userId = Number(idParam);
			return this.api.getUser(this.userId);
		}),
		finalize(() => {
			this.loading = false;
			this.saving = false;
			this.cdr.detectChanges();
		})
		).subscribe({
			next: (res: ApiResource<UserDto> | null) => {
				if (!res) return;
				const u = res.data;
				
				this.form.patchValue({
					name: u.name,
					username: u.username,
					email: u.email,
					department_id: u.department?.id ?? u.department_id ?? null, // ✅
					password: '',
					role_ids: (u.roles ?? []).map(x => x.id),
				});
				
				this.originalRoleIds = (u.roles ?? []).map(x => Number(x.id)).sort((a, b) => a - b);
				this.cdr.detectChanges();
			},
			error: (err: any) => {
				console.error(err);
				this.error = 'Failed to load user/roles/departments.';
				this.cdr.detectChanges();
			}
		});
	}
	
	
	// checkbox helpers
	isRoleChecked(roleId: number): boolean {
		const ids = (this.form.get('role_ids')?.value ?? []) as number[];
		return ids.map(Number).includes(roleId);
	}
	
	toggleRole(roleId: number, checked: boolean) {
		const ctrl = this.form.get('role_ids');
		const current = new Set<number>(((ctrl?.value ?? []) as any[]).map(Number));
		
		if (checked) current.add(roleId);
		else current.delete(roleId);
		
		ctrl?.setValue(Array.from(current));
		ctrl?.markAsDirty();
		ctrl?.updateValueAndValidity();
		this.cdr.detectChanges();
	}
	
	
	private rolesChanged(newIds: number[]): boolean {
		const next = (newIds ?? []).map(Number).sort((a, b) => a - b);
		const prev = (this.originalRoleIds ?? []).map(Number).sort((a, b) => a - b);
		
		if (next.length !== prev.length) return true;
		return next.some((v, i) => v !== prev[i]);
	}
	
	save(): void {
		this.error = null;
		this.message = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const v = this.form.value;
		//const roleIds = v.role_ids ?? [];
		const raw = (v.role_ids ?? []) as Array<number | string>;
		const roleIds: number[] = raw
		.map((x) => Number(x))
		.filter((n: number) => Number.isFinite(n));
		
		const departmentIdRaw = this.form.get('department_id')?.value;
		const department_id = departmentIdRaw === null || departmentIdRaw === ''
		? null
		: Number(departmentIdRaw);
		
		this.saving = true;
		
		if (this.isCreate) {
			this.api.createUser({
				name: v.name!,
				username: v.username!,
				email: v.email!,
				password: v.password!,
				department_id,
				role_ids: roleIds
			})
			.pipe(finalize(() => (this.saving = false)))
			.subscribe({
				next: () => {
					this.toast.success('User created successfully.');
					this.cdr.detectChanges();
					this.router.navigateByUrl('/admin/users')
				},
				error: (err) => {
					console.error(err);
					this.error = 'Failed to create user.';
				}
			});
			return;
		}
		
		// EDIT mode
		const id = this.userId!;
		const updatePayload: any = {
			name: v.name,
			username: v.username,
			email: v.email,
			department_id,
		};
		if (v.password && v.password.trim().length > 0) updatePayload.password = v.password;
		
		this.api.updateUser(id, updatePayload).pipe(
			switchMap(() => {
				// sync roles only if changed
				return this.rolesChanged(roleIds)
				? this.api.syncUserRoles(id, roleIds)
				: of({ ok: true });
			}),
			finalize(() => (this.saving = false))
			).subscribe({
				next: () => {
					//this.message = 'User updated successfully.';
					this.toast.success('User updated successfully.');
					this.originalRoleIds = roleIds.slice().sort((a: number, b: number) => a - b);
					this.form.patchValue({ password: '' });
					this.cdr.detectChanges();
					this.router.navigateByUrl('/admin/users');
				},
				error: (err) => {
					console.error(err);
					this.error = 'Failed to update user.';
				}
			});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/users');
	}
}
