import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiResource, RiskIssueTypeDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-risk-issue-type-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './risk-issue-type-form.html',
	styleUrls: ['./risk-issue-type-form.scss'],
})
export class RiskIssueTypeFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	typeId: number | null = null;
	
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
		this.typeId = Number(idParam);
		
		this.api.getRiskIssueType(this.typeId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<RiskIssueTypeDto>) => {
				const t = res.data;
				this.form.patchValue({
					code: t.code,
					name: t.name,
					is_active: (t.is_active as unknown) === true || (t.is_active as unknown) === 1,
				});
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load risk/issue type.';
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
		? this.api.createRiskIssueType(payload)
		: this.api.updateRiskIssueType(this.typeId!, payload);
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Risk/Issue type created.' : 'Risk/Issue type updated.');
				this.router.navigateByUrl('/admin/risk-issue-types');
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create risk/issue type.' : 'Failed to update risk/issue type.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/risk-issue-types');
	}
}
