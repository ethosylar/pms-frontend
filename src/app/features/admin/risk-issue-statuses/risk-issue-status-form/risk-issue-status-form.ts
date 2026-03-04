import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiResource, RiskIssueStatusDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-admin-risk-issue-status-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './risk-issue-status-form.html',
	styleUrls: ['./risk-issue-status-form.scss'],
})
export class RiskIssueStatusFormComponent implements OnInit {
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
		this.statusId = Number(idParam);
		
		this.api.getRiskIssueStatus(this.statusId)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<RiskIssueStatusDto>) => {
				const s = res.data;
				this.form.patchValue({
					code: s.code,
					name: s.name,
					sort_order: Number(s.sort_order ?? 0),
					is_active: (s.is_active as unknown) === true || (s.is_active as unknown) === 1,
				});
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load risk issue status.';
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
		this.cdr.detectChanges();
		
		const req$ = this.isCreate
		? this.api.createRiskIssueStatus(payload)
		: this.api.updateRiskIssueStatus(this.statusId!, payload);
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Risk status created.' : 'Risk status updated.');
				this.router.navigateByUrl('/admin/risk-issue-statuses');
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create risk status.' : 'Failed to update risk status.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigateByUrl('/admin/risk-issue-statuses');
	}
}
