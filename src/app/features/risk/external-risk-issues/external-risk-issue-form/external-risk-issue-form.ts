import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import {
	ApiService,
	ApiResource,
	ExternalRiskIssueDto,
	ExternalRiskIssueUpsertPayload,
	ExternalSourceDto,
	RiskIssueTypeDto,
	SeverityDto,
	RiskIssueStatusDto,
	ProjectDto,
} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-external-risk-issue-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './external-risk-issue-form.html',
	styleUrls: ['./external-risk-issue-form.scss'],
})
export class ExternalRiskIssueFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	isCreate = true;
	id: number | null = null;
	
	// lookups
	sources: ExternalSourceDto[] = [];
	projects: ProjectDto[] = [];
	types: RiskIssueTypeDto[] = [];
	severities: SeverityDto[] = [];
	statuses: RiskIssueStatusDto[] = [];
	
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
			external_source_id: [null],
			external_id: ['', [Validators.required]],
			
			project_id: [null],
			type_id: [null, [Validators.required]],
			severity_id: [null, [Validators.required]],
			risk_issue_status_id: [null, [Validators.required]],
			
			title: ['', [Validators.required]],
			owner: [''],
			
			source_created_at: [null],
			source_updated_at: [null],
			last_synced_at: [null],
			
			raw_payload: [''], // JSON string (optional)
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		this.isCreate = !idParam || idParam === 'new';
		
		if (!this.isCreate) this.id = Number(idParam);
		
		// Load lookups, then load record if edit
		forkJoin({
			sources: this.api.getExternalSources({ per_page: 100 }),
			types: this.api.getRiskIssueTypes({ per_page: 100 }),
			severities: this.api.getSeverities?.({ per_page: 100 }) ?? of({ data: [] }),
			statuses: this.api.getRiskIssueStatuses?.({ per_page: 100 }) ?? of({ data: [] }),
			projects: this.api.getProjects?.({ per_page: 100 }) ?? of({ data: [] }),
		})
		.pipe(
			switchMap((lk: any) => {
				this.sources = lk.sources?.data ?? [];
				this.types = lk.types?.data ?? [];
				this.severities = lk.severities?.data ?? [];
				this.statuses = lk.statuses?.data ?? [];
				this.projects = lk.projects?.data ?? [];
				
				if (this.isCreate) return of(null);
				return this.api.getExternalRiskIssue(this.id!, true);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiResource<ExternalRiskIssueDto> | null) => {
				if (!res) return;
				
				const r = res.data as any;
				
				const toLocal = (dt: any) => {
					if (!dt) return null;
					// try to convert ISO to yyyy-MM-ddTHH:mm for datetime-local
					const s = String(dt);
					return s.length >= 16 ? s.slice(0, 16) : s;
				};
				
				this.form.patchValue({
					external_source_id: r.external_source_id ?? null,
					external_id: r.external_id,
					
					project_id: r.project_id ?? null,
					type_id: r.type_id ?? null,
					severity_id: r.severity_id ?? null,
					risk_issue_status_id: r.risk_issue_status_id ?? null,
					
					title: r.title,
					owner: r.owner ?? '',
					
					source_created_at: toLocal(r.source_created_at),
					source_updated_at: toLocal(r.source_updated_at),
					last_synced_at: toLocal(r.last_synced_at),
					
					raw_payload: typeof r.raw_payload === 'string'
					? r.raw_payload
					: JSON.stringify(r.raw_payload ?? '', null, 2),
				});
				
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load form data.';
				this.cdr.detectChanges();
			}
		});
	}
	
	private normalizePayload(): ExternalRiskIssueUpsertPayload | null {
		const v = this.form.value;
		
		const rawText = String(v.raw_payload ?? '').trim();
		let raw_payload: ExternalRiskIssueUpsertPayload['raw_payload'] = undefined;
		
		if (rawText === '') {
			raw_payload = null; // explicit clear
			} else {
			// validate JSON
			try {
				JSON.parse(rawText);
				raw_payload = rawText; // send as JSON string (backend accepts)
				} catch {
				this.error = 'raw_payload must be valid JSON (or leave blank).';
				return null;
			}
		}
		
		return {
			external_source_id: v.external_source_id ?? null,
			external_id: String(v.external_id ?? '').trim(),
			
			project_id: v.project_id ?? null,
			type_id: Number(v.type_id),
			severity_id: Number(v.severity_id),
			risk_issue_status_id: Number(v.risk_issue_status_id),
			
			title: String(v.title ?? '').trim(),
			owner: String(v.owner ?? '').trim() || null,
			
			source_created_at: v.source_created_at || null,
			source_updated_at: v.source_updated_at || null,
			last_synced_at: v.last_synced_at || null,
			
			raw_payload,
		};
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const payload = this.normalizePayload();
		if (!payload) {
			this.cdr.detectChanges();
			return;
		}
		
		this.saving = true;
		
		const req$ = this.isCreate
		? this.api.createExternalRiskIssue(payload)
		: this.api.updateExternalRiskIssue(this.id!, payload);
		
		req$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: any) => {
				const id = this.isCreate ? res?.data?.id : this.id;
				this.toast.success(this.isCreate ? 'Issue created.' : 'Issue updated.');
				this.router.navigate(['/external-risk-issues', id]);
			},
			error: (err: any) => {
				console.error(err);
				const msg = err?.error?.message ?? (this.isCreate ? 'Failed to create issue.' : 'Failed to update issue.');
				this.error = msg;
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		if (this.isCreate) this.router.navigateByUrl('/external-risk-issues');
		else this.router.navigate(['/external-risk-issues', this.id]);
	}
}
