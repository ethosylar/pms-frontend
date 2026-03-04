import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService, DepartmentDto, ApiResource, ApiCollection } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-department-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './department-form.html',
	styleUrls: ['./department-form.scss'],
})
export class DepartmentFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	form: FormGroup;
	
	isCreate = true;
	deptId: number | null = null;
	
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
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		
		if (!idParam || idParam === 'new') {
			this.isCreate = true;
			this.deptId = null;
			this.loading = false;
			this.cdr.detectChanges();
			return;
		}
		
		this.isCreate = false;
		this.deptId = Number(idParam);
		
		this.api.getDepartment(this.deptId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<DepartmentDto>) => {
				this.form.patchValue({ code: res.data.code, name: res.data.name });
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load department.';
				this.cdr.detectChanges();
			}
		});
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			this.cdr.detectChanges();
			return;
		}
		
		const v = this.form.value;
		this.saving = true;
		this.cdr.detectChanges();
		
		if (this.isCreate) {
			this.api.createDepartment({ code: v.code!, name: v.name! })
			.pipe(finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			}))
			.subscribe({
				next: () => {
					this.toast.success('Department created successfully.');
					this.router.navigateByUrl('/admin/departments');
				},
				error: (err) => {
					console.error(err);
					this.error = 'Failed to create department.';
					this.cdr.detectChanges();
				}
			});
			return;
		}
		
		const id = this.deptId!;
		this.api.updateDepartment(id, { code: v.code!, name: v.name! })
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success('Department updated successfully.');
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to update department.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/departments');
	}
}
