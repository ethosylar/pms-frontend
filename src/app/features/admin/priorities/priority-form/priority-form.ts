import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiResource, PriorityDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-priority-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './priority-form.html',
	styleUrls: ['./priority-form.scss'],
})
export class PriorityFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	priorityId: number | null = null;
	
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
			sort_order: [0, [Validators.required]],
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
		this.priorityId = Number(idParam);
		
		this.api.getPriority(this.priorityId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<PriorityDto>) => {
				const p = res.data;
				this.form.patchValue({
					code: p.code,
					name: p.name,
					sort_order: Number(p.sort_order ?? 0),
					is_active: (p.is_active as unknown) === true || (p.is_active as unknown) === 1,
				});
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load priority.';
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
		
		const req$ = this.isCreate
		? this.api.createPriority(payload)
		: this.api.updatePriority(this.priorityId!, payload);
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Priority created successfully.' : 'Priority updated successfully.');
				this.router.navigateByUrl('/admin/priorities');
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create priority.' : 'Failed to update priority.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/priorities');
	}
}
