import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { forkJoin, of, } from 'rxjs';
import { finalize, switchMap, } from 'rxjs/operators';

import {
	ApiResource,
	ApiService,
	ExternalRiskIssueDto,
	ExternalRiskIssueUpsertPayload,
	ExternalSourceDto,
	ProjectDto,
	RiskIssueStatusDto,
	RiskIssueTypeDto,
	SeverityDto,
} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-external-risk-issue-form',
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
	],
	templateUrl: './external-risk-issue-form.html',
	styleUrls: ['./external-risk-issue-form.scss'],
})
export class ExternalRiskIssueFormComponent implements OnInit {
	loading = true;
	saving = false;
	
	error: string | null = null;
	
	isCreate = true;
	id: number | null = null;
	
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
		private cdr: ChangeDetectorRef,
		) {
		this.form = this.fb.group({
			external_source_id: [null],
			external_id: [
				'',
				[
					Validators.required,
					Validators.maxLength(120),
				],
			],
			
			project_id: [null],
			type_id: [
				null,
				[Validators.required],
			],
			severity_id: [
				null,
				[Validators.required],
			],
			risk_issue_status_id: [
				null,
				[Validators.required],
			],
			
			title: [
				'',
				[
					Validators.required,
					Validators.maxLength(255),
				],
			],
			description: [''],
			owner: [
				'',
				[Validators.maxLength(255)],
			],
			
			source_created_at: [null],
			source_updated_at: [null],
			last_synced_at: [null],
			
			raw_payload: [''],
		});
	}
	
	ngOnInit(): void {
		const idParam =
		this.route.snapshot.paramMap.get('id');
		
		this.isCreate =
		!idParam ||
		idParam === 'new';
		
		if (!this.isCreate) {
			const parsedId = Number(idParam);
			
			if (
				!Number.isInteger(parsedId) ||
				parsedId <= 0
				) {
				this.error =
				'Invalid external risk issue ID.';
				this.loading = false;
				return;
			}
			
			this.id = parsedId;
		}
		
		forkJoin({
			sources:
			this.api.getExternalSources({
				per_page: 100,
			}),
			types:
			this.api.getRiskIssueTypes({
				per_page: 100,
			}),
			severities:
			this.api.getSeverities({
				per_page: 100,
			}),
			statuses:
			this.api.getRiskIssueStatuses({
				per_page: 100,
			}),
			projects:
			this.api.getProjects({
				per_page: 100,
			}),
		})
		.pipe(
			switchMap(lookups => {
				this.sources =
				lookups.sources.data ?? [];
				this.types =
				lookups.types.data ?? [];
				this.severities =
				lookups.severities.data ?? [];
				this.statuses =
				lookups.statuses.data ?? [];
				this.projects =
				lookups.projects.data ?? [];
				
				if (this.isCreate) {
					return of(null);
				}
				
				return this.api.getExternalRiskIssue(
					this.id!,
					true
				);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res:
				| ApiResource<ExternalRiskIssueDto>
				| null
				) => {
				if (!res) {
					return;
				}
				
				const issue = res.data;
				
				this.form.patchValue({
					external_source_id:
					issue.external_source_id ??
					null,
					external_id:
					issue.external_id,
					
					project_id:
					issue.project_id ??
					null,
					type_id:
					issue.type_id ??
					null,
					severity_id:
					issue.severity_id ??
					null,
					risk_issue_status_id:
					issue.risk_issue_status_id ??
					null,
					
					title:
					issue.title,
					description:
					issue.description ??
					'',
					owner:
					issue.owner ??
					'',
					
					source_created_at:
					this.toDateTimeLocal(
						issue.source_created_at
					),
					source_updated_at:
					this.toDateTimeLocal(
						issue.source_updated_at
					),
					last_synced_at:
					this.toDateTimeLocal(
						issue.last_synced_at
					),
					
					raw_payload:
					this.formatPayload(
						issue.raw_payload
					),
				});
			},
			error: (err: any) => {
				console.error(err);
				
				this.error =
				err?.error?.message ||
				'Failed to load external risk issue form data.';
			},
		});
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
		
		const request$ = this.isCreate
		? this.api.createExternalRiskIssue(
			payload
		)
		: this.api.updateExternalRiskIssue(
			this.id!,
			payload
		);
		
		request$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiResource<ExternalRiskIssueDto>
				) => {
				const issueId =
				res?.data?.id ??
				this.id;
				
				this.toast.success(
					this.isCreate
					? 'External risk issue created.'
					: 'External risk issue updated.'
				);
				
				this.router.navigate([
					'/external-risk-issues',
					issueId,
				]);
			},
			error: (err: any) => {
				console.error(err);
				
				this.error =
				this.apiErrorMessage(
					err,
					this.isCreate
					? 'Failed to create external risk issue.'
					: 'Failed to update external risk issue.'
				);
			},
		});
	}
	
	cancel(): void {
		if (
			this.isCreate ||
			!this.id
			) {
			this.router.navigateByUrl(
				'/external-risk-issues'
			);
			return;
		}
		
		this.router.navigate([
			'/external-risk-issues',
			this.id,
		]);
	}
	
	private normalizePayload():
	| ExternalRiskIssueUpsertPayload
	| null {
		const value = this.form.value;
		
		const rawText =
		String(
			value.raw_payload ??
			''
		).trim();
		
		let rawPayload:
		| string
		| Record<string, unknown>
		| unknown[]
		| null;
		
		if (rawText === '') {
			rawPayload = null;
			} else {
			try {
				JSON.parse(rawText);
				rawPayload = rawText;
				} catch {
				this.error =
				'Raw Payload must contain valid JSON or be left blank.';
				return null;
			}
		}
		
		return {
			external_source_id:
			this.nullableNumber(
				value.external_source_id
			),
			external_id:
			String(
				value.external_id ??
				''
			).trim(),
			
			project_id:
			this.nullableNumber(
				value.project_id
			),
			type_id:
			this.nullableNumber(
				value.type_id
			),
			severity_id:
			this.nullableNumber(
				value.severity_id
			),
			risk_issue_status_id:
			this.nullableNumber(
				value.risk_issue_status_id
			),
			
			title:
			String(
				value.title ??
				''
			).trim(),
			description:
			String(
				value.description ??
				''
			).trim() ||
			null,
			owner:
			String(
				value.owner ??
				''
			).trim() ||
			null,
			
			source_created_at:
			value.source_created_at ||
			null,
			source_updated_at:
			value.source_updated_at ||
			null,
			last_synced_at:
			value.last_synced_at ||
			null,
			
			raw_payload:
			rawPayload,
		};
	}
	
	private nullableNumber(
		value: unknown
		): number | null {
		if (
			value === null ||
			value === undefined ||
			value === ''
			) {
			return null;
		}
		
		const parsed = Number(value);
		
		return Number.isFinite(parsed)
		? parsed
		: null;
	}
	
	private toDateTimeLocal(
		value?: string | null
		): string | null {
		if (!value) {
			return null;
		}
		
		const text = String(value);
		
		return text.length >= 16
		? text.slice(0, 16)
		: text;
	}
	
	private formatPayload(
		value: unknown
		): string {
		if (
			value === null ||
			value === undefined ||
			value === ''
			) {
			return '';
		}
		
		if (typeof value === 'string') {
			try {
				return JSON.stringify(
					JSON.parse(value),
					null,
					2
				);
				} catch {
				return value;
			}
		}
		
		return JSON.stringify(
			value,
			null,
			2
		);
	}
	
	private apiErrorMessage(
		err: any,
		fallback: string
		): string {
		if (err?.status === 409) {
			return (
				err?.error?.message ||
				'An external risk issue with this source and external ID already exists.'
			);
		}
		
		if (err?.status === 422) {
			const errors =
			err?.error?.errors;
			
			if (errors) {
				const firstKey =
				Object.keys(errors)[0];
				
				return (
					errors[firstKey]?.[0] ||
					err?.error?.message ||
					'Validation failed.'
				);
			}
			
			return (
				err?.error?.message ||
				'Validation failed.'
			);
		}
		
		return (
			err?.error?.message ||
			fallback
		);
	}
}
