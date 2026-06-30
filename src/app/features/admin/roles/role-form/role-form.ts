import { ChangeDetectorRef,Component,OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule} from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ApiCollection, ApiResource, ApiService, PermissionDto,	RoleDto, RoleUpsertPayload} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

type PermissionGroup = {
	module: string;
	permissions: PermissionDto[];
};

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
	
	permissions: PermissionDto[] = [];
	permissionGroups: PermissionGroup[] = [];
	
	openPermissionModules = new Set<number>([0]);
	
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
			is_active: [true],
			permission_ids: this.fb.control<number[]>([]),
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		
		this.isCreate = !idParam || idParam === 'new';
		this.roleId = this.isCreate ? null : Number(idParam);
		
		forkJoin({
			permissions: this.api.getPermissions({
				is_active: 1,
				per_page: 100
			}),
			role: this.isCreate
			? of(null)
			: this.api.getRole(this.roleId!)
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: ({
				permissions,
				role
				}: {
				permissions: ApiCollection<PermissionDto>;
				role: ApiResource<RoleDto> | null;
			}) => {
			this.permissions = permissions.data ?? [];
			this.buildPermissionGroups();
			
			if (role) {
				const r = role.data;
				
				this.form.patchValue({
					code: r.code,
					name: r.name,
					is_active:
					(r.is_active as unknown) === true ||
					(r.is_active as unknown) === 1,
					permission_ids: (r.permissions ?? []).map(p => Number(p.id)),
				});
			}
			
			this.cdr.detectChanges();
			},
			error: err => {
				console.error(err);
				this.error = 'Failed to load role or permissions.';
				this.cdr.detectChanges();
			}
		});
	}
	
	private buildPermissionGroups(): void {
		const map = new Map<string, PermissionDto[]>();
		
		for (const permission of this.permissions) {
			const moduleName = permission.module || 'General';
			
			if (!map.has(moduleName)) {
				map.set(moduleName, []);
			}
			
			map.get(moduleName)!.push(permission);
		}
		
		this.permissionGroups = Array.from(map.entries()).map(
			([module, permissions]) => ({
				module,
				permissions,
			})
		);
	}
	
	permissionIds(): number[] {
		return ((this.form.get('permission_ids')?.value ?? []) as number[])
		.map(Number)
		.filter(Number.isFinite);
	}
	
	isPermissionChecked(permissionId: number): boolean {
		return this.permissionIds().includes(Number(permissionId));
	}
	
	togglePermission(permissionId: number, checked: boolean): void {
		const current = new Set(this.permissionIds());
		
		if (checked) {
			current.add(Number(permissionId));
			} else {
			current.delete(Number(permissionId));
		}
		
		this.form.get('permission_ids')?.setValue(Array.from(current));
		this.form.get('permission_ids')?.markAsDirty();
		this.form.get('permission_ids')?.updateValueAndValidity();
		
		this.cdr.detectChanges();
	}
	
	toggleModule(group: PermissionGroup, checked: boolean): void {
		const current = new Set(this.permissionIds());
		
		for (const permission of group.permissions) {
			if (checked) {
				current.add(Number(permission.id));
				} else {
				current.delete(Number(permission.id));
			}
		}
		
		this.form.get('permission_ids')?.setValue(Array.from(current));
		this.form.get('permission_ids')?.markAsDirty();
		this.form.get('permission_ids')?.updateValueAndValidity();
		
		this.cdr.detectChanges();
	}
	
	moduleChecked(group: PermissionGroup): boolean {
		return group.permissions.every(p => this.isPermissionChecked(p.id));
	}
	
	moduleIndeterminate(group: PermissionGroup): boolean {
		const checkedCount = group.permissions
		.filter(p => this.isPermissionChecked(p.id))
		.length;
		
		return checkedCount > 0 && checkedCount < group.permissions.length;
	}
	
	selectedPermissionCount(): number {
		return this.permissionIds().length;
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const v = this.form.value;
		
		const payload: RoleUpsertPayload = {
			code: String(v.code).trim().toUpperCase(),
			name: String(v.name).trim(),
			is_active: !!v.is_active,
			permission_ids: this.permissionIds(),
		};
		
		this.saving = true;
		
		const req$ = this.isCreate
		? this.api.createRole(payload)
		: this.api.updateRole(this.roleId!, payload);
		
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
					? 'Role created successfully.'
					: 'Role updated successfully.'
				);
				
				this.router.navigateByUrl('/admin/roles');
			},
			error: err => {
				console.error(err);
				
				this.error = this.isCreate
				? 'Failed to create role.'
				: 'Failed to update role.';
				
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/roles');
	}
	
	isModuleOpen(index: number): boolean {
		return this.openPermissionModules.has(index);
	}
	
	togglePermissionModule(index: number): void {
		if (this.openPermissionModules.has(index)) {
			this.openPermissionModules.delete(index);
			} else {
			this.openPermissionModules.add(index);
		}
		
		this.cdr.detectChanges();
	}
	
	moduleSelectedCount(group: PermissionGroup): number {
		return group.permissions
		.filter(p => this.isPermissionChecked(p.id))
		.length;
	}
}