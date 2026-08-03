import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule, } from '@angular/common';
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

import { ToastService, } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	
	selector:
	'app-external-risk-issue-form',
	
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
	],
	
	templateUrl:
	'./external-risk-issue-form.html',
	
	styleUrls: [
		'./external-risk-issue-form.scss',
	],
})
export class ExternalRiskIssueFormComponent
implements OnInit {
	
	loading = true;
	
	saving = false;
	
	error:
	string | null = null;
	
	
	isCreate = true;
	
	id:
	number | null = null;
	
	
	sources:
	ExternalSourceDto[] = [];
	
	projects:
	ProjectDto[] = [];
	
	types:
	RiskIssueTypeDto[] = [];
	
	severities:
	SeverityDto[] = [];
	
	statuses:
	RiskIssueStatusDto[] = [];
	
	
	form: FormGroup;
	
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		
		this.form =
		this.fb.group({
			
			// ---------------------------------------------------------
			// External source information
			// ---------------------------------------------------------
			
			external_source_id: [
				null,
			],
			
			external_id: [
				'',
				[
					Validators.required,
					
					/*
						* Prevent whitespace-only IDs.
					*/
					Validators.pattern(
						/\S/
					),
					
					Validators.maxLength(
						120
					),
				],
			],
			
			
			// ---------------------------------------------------------
			// Classification / project
			// ---------------------------------------------------------
			
			project_id: [
				null,
			],
			
			type_id: [
				null,
				[
					Validators.required,
				],
			],
			
			severity_id: [
				null,
				[
					Validators.required,
				],
			],
			
			risk_issue_status_id: [
				null,
				[
					Validators.required,
				],
			],
			
			
			// ---------------------------------------------------------
			// Risk / Issue information
			// ---------------------------------------------------------
			
			title: [
				'',
				[
					Validators.required,
					
					/*
						* Prevent whitespace-only titles.
					*/
					Validators.pattern(
						/\S/
					),
					
					Validators.maxLength(
						255
					),
				],
			],
			
			description: [
				'',
			],
			
			owner: [
				'',
				[
					Validators.maxLength(
						255
					),
				],
			],
			
			
			// ---------------------------------------------------------
			// Source timestamps
			// ---------------------------------------------------------
			
			source_created_at: [
				null,
			],
			
			source_updated_at: [
				null,
			],
			
			last_synced_at: [
				null,
			],
			
			
			// ---------------------------------------------------------
			// Source JSON
			// ---------------------------------------------------------
			
			raw_payload: [
				'',
			],
		});
		
		
		/*
			* Laravel field validation errors are stored
			* directly inside each Angular control as:
			*
			* {
			*     server: 'Backend message'
			* }
			*
			* Once the user changes that field, the
			* server-side error should disappear.
		*/
		this.enableServerErrorClearing();
		
		
		/*
			* Raw JSON has its own frontend validation
			* error. Remove that error once the user
			* changes the JSON text.
		*/
		this.form
		.get(
			'raw_payload'
		)
		?.valueChanges
		.subscribe(
			() => {
				
				this.clearControlError(
					'raw_payload',
					'json'
				);
			}
		);
	}
	
	
	// =========================================================================
	// Initialization
	// =========================================================================
	
	ngOnInit(): void {
		
		const idParam =
		this.route.snapshot
		.paramMap
		.get(
			'id'
		);
		
		
		this.isCreate =
		!idParam ||
		idParam ===
		'new';
		
		
		if (
			!this.isCreate
			) {
			
			const parsedId =
			Number(
				idParam
			);
			
			
			if (
				!Number.isInteger(
					parsedId
				) ||
				parsedId <= 0
				) {
				
				this.error =
				'Invalid external risk issue ID.';
				
				this.loading =
				false;
				
				return;
			}
			
			
			this.id =
			parsedId;
		}
		
		
		this.loadForm();
	}
	
	
	// =========================================================================
	// Load Form
	// =========================================================================
	
	private loadForm(): void {
		
		this.loading =
		true;
		
		this.error =
		null;
		
		
		forkJoin({
			
			sources:
			this.api
			.getExternalSources({
				per_page:
				100,
			}),
			
			
			types:
			this.api
			.getRiskIssueTypes({
				per_page:
				100,
			}),
			
			
			severities:
			this.api
			.getSeverities({
				per_page:
				100,
			}),
			
			
			statuses:
			this.api
			.getRiskIssueStatuses({
				per_page:
				100,
			}),
			
			
			projects:
			this.api
			.getProjects({
				per_page:
				100,
			}),
		})
		.pipe(
			
			switchMap(
				lookups => {
					
					this.sources =
					lookups.sources
					.data ??
					[];
					
					
					this.types =
					lookups.types
					.data ??
					[];
					
					
					this.severities =
					lookups.severities
					.data ??
					[];
					
					
					this.statuses =
					lookups.statuses
					.data ??
					[];
					
					
					this.projects =
					lookups.projects
					.data ??
					[];
					
					
					/*
						* Create mode only needs lookups.
					*/
					if (
						this.isCreate
						) {
						return of(
							null
						);
					}
					
					
					/*
						* Include raw payload while editing
						* so it can be shown in the form.
					*/
					return this.api
					.getExternalRiskIssue(
						this.id!,
						true
					);
				}
			),
			
			
			finalize(
				() => {
					
					this.loading =
					false;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: (
				response:
				| ApiResource<
				ExternalRiskIssueDto
				>
				| null
				) => {
				
				if (
					!response
					) {
					return;
				}
				
				
				const issue =
				response.data;
				
				
				this.form
				.patchValue({
					
					external_source_id:
					issue
					.external_source_id ??
					null,
					
					external_id:
					issue
					.external_id,
					
					
					project_id:
					issue
					.project_id ??
					null,
					
					type_id:
					issue
					.type_id ??
					null,
					
					severity_id:
					issue
					.severity_id ??
					null,
					
					risk_issue_status_id:
					issue
					.risk_issue_status_id ??
					null,
					
					
					title:
					issue
					.title,
					
					description:
					issue
					.description ??
					'',
					
					owner:
					issue
					.owner ??
					'',
					
					
					source_created_at:
					this.toDateTimeLocal(
						issue
						.source_created_at
					),
					
					source_updated_at:
					this.toDateTimeLocal(
						issue
						.source_updated_at
					),
					
					last_synced_at:
					this.toDateTimeLocal(
						issue
						.last_synced_at
					),
					
					
					raw_payload:
					this.formatPayload(
						issue
						.raw_payload
					),
				});
				
				
				/*
					* Existing data should not immediately
					* appear dirty or invalid.
				*/
				this.form
				.markAsPristine();
				
				this.form
				.markAsUntouched();
				
				
				this.cdr
				.detectChanges();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.error =
				err?.error
				?.message ||
				'Failed to load external risk issue form data.';
			},
		});
	}
	
	
	// =========================================================================
	// Validation helpers
	// =========================================================================
	
	isInvalid(
		controlName: string
		): boolean {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		return !!control &&
		control.invalid &&
		(
			control.touched ||
			control.dirty
		);
	}
	
	
	fieldError(
		controlName: string,
		label: string
		): string {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		if (
			!control?.errors
			) {
			return '';
		}
		
		
		const errors =
		control.errors;
		
		
		// -------------------------------------------------------------
		// Laravel / backend validation
		// -------------------------------------------------------------
		
		if (
			errors[
				'server'
			]
			) {
			return String(
				errors[
					'server'
				]
			);
		}
		
		
		// -------------------------------------------------------------
		// Required
		// -------------------------------------------------------------
		
		if (
			errors[
				'required'
			]
			) {
			return (
				`${label} is required.`
			);
		}
		
		
		// -------------------------------------------------------------
		// Maximum length
		// -------------------------------------------------------------
		
		if (
			errors[
				'maxlength'
			]
			) {
			return (
				`${label} cannot exceed ` +
				`${errors[
				'maxlength'
				].requiredLength} characters.`
			);
		}
		
		
		// -------------------------------------------------------------
		// Pattern
		// -------------------------------------------------------------
		
		if (
			errors[
				'pattern'
			]
			) {
			
			if (
				controlName ===
				'external_id'
				) {
				return (
					'External ID cannot be blank or contain only spaces.'
				);
			}
			
			
			if (
				controlName ===
				'title'
				) {
				return (
					'Title cannot be blank or contain only spaces.'
				);
			}
			
			
			return (
				`${label} has an unsupported format.`
			);
		}
		
		
		// -------------------------------------------------------------
		// JSON validation
		// -------------------------------------------------------------
		
		if (
			errors[
				'json'
			]
			) {
			return String(
				errors[
					'json'
				]
			);
		}
		
		
		return (
			`${label} is invalid.`
		);
	}
	
	
	private enableServerErrorClearing():
	void {
		
		for (
			const control of
			Object.values(
				this.form.controls
			)
			) {
			
			control.valueChanges
			.subscribe(
				() => {
					
					const errors =
					control.errors;
					
					
					if (
						!errors ||
						!errors[
							'server'
						]
						) {
						return;
					}
					
					
					const {
						server:
						_removedServerError,
						
						...remainingErrors
					} = errors;
					
					
					control.setErrors(
						
						Object.keys(
							remainingErrors
						).length
						? remainingErrors
						: null,
						
						{
							emitEvent:
							false,
						}
					);
				}
			);
		}
	}
	
	
	private addControlError(
		controlName: string,
		errorName: string,
		message: string
		): void {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		if (
			!control
			) {
			return;
		}
		
		
		control.setErrors({
			...(
				control.errors ??
				{}
			),
			
			[errorName]:
			message,
		});
		
		
		control
		.markAsTouched();
	}
	
	
	private clearControlError(
		controlName: string,
		errorName: string
		): void {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		const errors =
		control?.errors;
		
		
		if (
			!control ||
			!errors ||
			!errors[
				errorName
			]
			) {
			return;
		}
		
		
		const {
			[errorName]:
			_removedError,
			
			...remainingErrors
		} = errors;
		
		
		control.setErrors(
			Object.keys(
				remainingErrors
			).length
			? remainingErrors
			: null
		);
	}
	
	
	private validateRawPayload():
	boolean {
		
		this.clearControlError(
			'raw_payload',
			'json'
		);
		
		
		const rawText =
		String(
			this.form
			.get(
				'raw_payload'
			)
			?.value ??
			''
		)
		.trim();
		
		
		/*
			* Empty is valid because the backend
			* allows raw_payload = null.
		*/
		if (
			rawText ===
			''
			) {
			return true;
		}
		
		
		try {
			
			JSON.parse(
				rawText
			);
			
			
			return true;
			
			} catch {
			
			this.addControlError(
				'raw_payload',
				'json',
				'Raw Payload must contain valid JSON or be left blank.'
			);
			
			
			return false;
		}
	}
	
	
	private applyApiFieldErrors(
		err: any
		): boolean {
		
		const errors =
		err?.error
		?.errors;
		
		
		if (
			err?.status !==
			422 ||
			!errors ||
			typeof errors !==
			'object'
			) {
			return false;
		}
		
		
		let applied =
		false;
		
		
		for (
			const [
				backendField,
				messages,
			]
			of Object.entries(
				errors
			)
			) {
			
			const candidates = [
				
				String(
					backendField
				),
				
				String(
					backendField
				)
				.split('.')[0],
				
				String(
					backendField
				)
				.split('.')
				.at(-1) ??
				'',
			];
			
			
			const controlName =
			candidates.find(
				name =>
				!!name &&
				!!this.form
				.get(
					name
				)
			);
			
			
			if (
				!controlName
				) {
				continue;
			}
			
			
			const control =
			this.form.get(
				controlName
			);
			
			
			if (
				!control
				) {
				continue;
			}
			
			
			const message =
			Array.isArray(
				messages
			)
			? String(
				messages[0] ??
				'Invalid value.'
			)
			: String(
				messages
			);
			
			
			control.setErrors({
				...(
					control.errors ??
					{}
				),
				
				server:
				message,
			});
			
			
			control
			.markAsTouched();
			
			
			applied =
			true;
		}
		
		
		return applied;
	}
	
	
	private markDuplicateExternalId(
		message?: string
		): void {
		
		const duplicateMessage =
		message ||
		'This External Source and External ID combination already exists.';
		
		
		/*
			* The backend duplicate rule is the
			* combination of:
			*
			* external_source_id + external_id
			*
			* Highlight both fields so it is obvious
			* what combination the user needs to fix.
		*/
		this.addControlError(
			'external_source_id',
			'server',
			duplicateMessage
		);
		
		
		this.addControlError(
			'external_id',
			'server',
			duplicateMessage
		);
	}
	
	
	private markBackendRawPayloadError(
		message?: string
		): void {
		
		this.addControlError(
			'raw_payload',
			'server',
			message ||
			'Raw Payload must contain valid JSON.'
		);
	}
	
	
	private focusFirstInvalidField():
	void {
		
		setTimeout(
			() => {
				
				const element =
				window.document
				.querySelector<
				HTMLElement
				>(
					'.is-invalid'
				);
				
				
				if (
					!element
					) {
					return;
				}
				
				
				element
				.scrollIntoView({
					behavior:
					'smooth',
					
					block:
					'center',
				});
				
				
				element
				.focus();
			},
			50
		);
	}
	
	
	// =========================================================================
	// Save
	// =========================================================================
	
	save(): void {
		
		this.error =
		null;
		
		
		// -----------------------------------------------------------------
		// Normalize text fields before validation
		// -----------------------------------------------------------------
		
		this.normalizeTextField(
			'external_id'
		);
		
		this.normalizeTextField(
			'title'
		);
		
		this.normalizeTextField(
			'owner'
		);
		
		
		this.form
		.updateValueAndValidity();
		
		
		// -----------------------------------------------------------------
		// JSON validation
		// -----------------------------------------------------------------
		
		const rawPayloadValid =
		this.validateRawPayload();
		
		
		// -----------------------------------------------------------------
		// Standard Angular validation
		// -----------------------------------------------------------------
		
		if (
			this.form.invalid ||
			!rawPayloadValid
			) {
			
			this.form
			.markAllAsTouched();
			
			
			this.error =
			'Please correct the highlighted fields before submitting.';
			
			
			this.focusFirstInvalidField();
			
			
			this.cdr
			.detectChanges();
			
			
			return;
		}
		
		
		// -----------------------------------------------------------------
		// Build payload
		// -----------------------------------------------------------------
		
		const payload =
		this.normalizePayload();
		
		
		if (
			!payload
			) {
			
			this.error =
			'Please correct the highlighted fields before submitting.';
			
			
			this.focusFirstInvalidField();
			
			
			this.cdr
			.detectChanges();
			
			
			return;
		}
		
		
		this.saving =
		true;
		
		
		const request$ =
		this.isCreate
		
		? this.api
		.createExternalRiskIssue(
			payload
		)
		
		: this.api
		.updateExternalRiskIssue(
			this.id!,
			payload
		);
		
		
		request$
		.pipe(
			
			finalize(
				() => {
					
					this.saving =
					false;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: (
				response:
				ApiResource<
				ExternalRiskIssueDto
				>
				) => {
				
				const issueId =
				response
				?.data
				?.id ??
				this.id;
				
				
				this.toast
				.success(
					this.isCreate
					? 'External risk issue created.'
					: 'External risk issue updated.'
				);
				
				
				this.router
				.navigate([
					'/external-risk-issues',
					issueId,
				]);
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				// -----------------------------------------------------
				// Standard Laravel 422 field errors
				// -----------------------------------------------------
				
				if (
					this.applyApiFieldErrors(
						err
					)
					) {
					
					this.error =
					'Please correct the highlighted fields.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// Duplicate external_source_id + external_id
				// -----------------------------------------------------
				
				if (
					err?.status ===
					409
					) {
					
					this.markDuplicateExternalId(
						err?.error
						?.message
					);
					
					
					this.error =
					'This external source and External ID combination already exists.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// Backend raw_payload validator
				//
				// Your controller returns 422 + message,
				// but no Laravel errors.raw_payload object.
				// -----------------------------------------------------
				
				if (
					err?.status ===
					422 &&
					String(
						err?.error
						?.message ??
						''
					)
					.toLowerCase()
					.includes(
						'raw_payload'
					)
					) {
					
					this.markBackendRawPayloadError(
						err?.error
						?.message
					);
					
					
					this.error =
					'Please correct the highlighted Raw Payload field.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// General API error
				// -----------------------------------------------------
				
				this.error =
				err?.error
				?.message ||
				(
					this.isCreate
					? 'Failed to create external risk issue.'
					: 'Failed to update external risk issue.'
				);
			},
		});
	}
	
	
	// =========================================================================
	// Payload
	// =========================================================================
	
	private normalizePayload():
	| ExternalRiskIssueUpsertPayload
	| null {
		
		const value =
		this.form
		.getRawValue();
		
		
		const rawText =
		String(
			value.raw_payload ??
			''
		)
		.trim();
		
		
		let rawPayload:
		| string
		| Record<
		string,
		unknown
		>
		| unknown[]
		| null;
		
		
		if (
			rawText ===
			''
			) {
			
			rawPayload =
			null;
			
			} else {
			
			/*
				* validateRawPayload() already checked
				* this before normalizePayload().
				*
				* Keep this defensive try/catch in case
				* this method is called independently.
			*/
			try {
				
				JSON.parse(
					rawText
				);
				
				
				rawPayload =
				rawText;
				
				} catch {
				
				this.addControlError(
					'raw_payload',
					'json',
					'Raw Payload must contain valid JSON or be left blank.'
				);
				
				
				return null;
			}
		}
		
		
		return {
			
			external_source_id:
			this.nullableNumber(
				value
				.external_source_id
			),
			
			
			external_id:
			String(
				value.external_id ??
				''
			)
			.trim(),
			
			
			project_id:
			this.nullableNumber(
				value
				.project_id
			),
			
			
			type_id:
			this.nullableNumber(
				value
				.type_id
			),
			
			
			severity_id:
			this.nullableNumber(
				value
				.severity_id
			),
			
			
			risk_issue_status_id:
			this.nullableNumber(
				value
				.risk_issue_status_id
			),
			
			
			title:
			String(
				value.title ??
				''
			)
			.trim(),
			
			
			description:
			this.nullText(
				value
				.description
			),
			
			
			owner:
			this.nullText(
				value
				.owner
			),
			
			
			source_created_at:
			value
			.source_created_at ||
			null,
			
			
			source_updated_at:
			value
			.source_updated_at ||
			null,
			
			
			last_synced_at:
			value
			.last_synced_at ||
			null,
			
			
			raw_payload:
			rawPayload,
		};
	}
	
	
	// =========================================================================
	// Navigation
	// =========================================================================
	
	cancel(): void {
		
		if (
			this.isCreate ||
			!this.id
			) {
			
			this.router
			.navigateByUrl(
				'/external-risk-issues'
			);
			
			return;
		}
		
		
		this.router
		.navigate([
			'/external-risk-issues',
			this.id,
		]);
	}
	
	
	// =========================================================================
	// Utility
	// =========================================================================
	
	private normalizeTextField(
		controlName: string
		): void {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		if (
			!control
			) {
			return;
		}
		
		
		const value =
		control.value;
		
		
		if (
			value ===
			null ||
			value ===
			undefined
			) {
			return;
		}
		
		
		control.setValue(
			String(
				value
			)
			.trim(),
			{
				emitEvent:
				false,
			}
		);
	}
	
	
	private nullableNumber(
		value: unknown
		): number | null {
		
		if (
			value ===
			null ||
			value ===
			undefined ||
			value ===
			''
			) {
			return null;
		}
		
		
		const parsed =
		Number(
			value
		);
		
		
		return (
			Number.isFinite(
				parsed
			)
			? parsed
			: null
		);
	}
	
	
	private nullText(
		value: unknown
		): string | null {
		
		const text =
		String(
			value ??
			''
		)
		.trim();
		
		
		return (
			text ||
			null
		);
	}
	
	
	private toDateTimeLocal(
		value?:
		string | null
		): string | null {
		
		if (
			!value
			) {
			return null;
		}
		
		
		const text =
		String(
			value
		);
		
		
		/*
			* HTML datetime-local expects:
			*
			* yyyy-MM-ddTHH:mm
		*/
		return (
			text.length >= 16
			? text.slice(
				0,
				16
			)
			: text
		);
	}
	
	
	private formatPayload(
		value: unknown
		): string {
		
		if (
			value ===
			null ||
			value ===
			undefined ||
			value ===
			''
			) {
			return '';
		}
		
		
		if (
			typeof value ===
			'string'
			) {
			
			try {
				
				return JSON.stringify(
					JSON.parse(
						value
					),
					null,
					2
				);
				
				} catch {
				
				/*
					* Preserve an invalid payload instead
					* of hiding it. The textarea will turn
					* red when Save is attempted.
				*/
				return value;
			}
		}
		
		
		return JSON.stringify(
			value,
			null,
			2
		);
	}
}