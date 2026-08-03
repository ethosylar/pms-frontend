import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, } from '@angular/forms';
import { RouterModule, } from '@angular/router';
import { Observable, } from 'rxjs';
import { finalize, } from 'rxjs/operators';

import {
	AgreementStatusDto,
	AgreementStatusListParams,
	AgreementStatusUpsertPayload,
	ApiCollection,
	ApiResource,
	ApiService,
} from '../../../core/services/api.service';

import { ToastService, } from '../../../shared/ui/toast/toast';

type BooleanFilter =
| ''
| '1'
| '0';

@Component({
	standalone: true,
	
	selector:
	'app-agreement-statuses',
	
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
	],
	
	templateUrl:
	'./agreement-statuses.html',
	
	styleUrls: [
		'./agreement-statuses.scss',
	],
})
export class AgreementStatusesComponent
implements OnInit {
	
	// -------------------------------------------------------------------------
	// Loading / access
	// -------------------------------------------------------------------------
	
	loadingAccess = true;
	
	loading = false;
	
	saving = false;
	
	
	error:
	string | null = null;
	
	formError:
	string | null = null;
	
	
	canManage =
	false;
	
	
	// -------------------------------------------------------------------------
	// Table
	// -------------------------------------------------------------------------
	
	rows:
	AgreementStatusDto[] = [];
	
	
	page = 1;
	
	perPage = 25;
	
	total = 0;
	
	lastPage = 1;
	
	
	search = '';
	
	isActiveFilter:
	BooleanFilter = '';
	
	isTerminalFilter:
	BooleanFilter = '';
	
	isSystemFilter:
	BooleanFilter = '';
	
	
	// -------------------------------------------------------------------------
	// Editor
	// -------------------------------------------------------------------------
	
	editorOpen =
	false;
	
	
	editingStatus:
	AgreementStatusDto | null =
	null;
	
	
	deactivatingId:
	number | null = null;
	
	
	reactivatingId:
	number | null = null;
	
	
	form:
	FormGroup;
	
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		
		this.form =
		this.fb.group({
			
			// ---------------------------------------------------------
			// Required by backend during create
			// ---------------------------------------------------------
			
			code: [
				'',
				[
					Validators.required,
					
					Validators.maxLength(
						50
					),
					
					Validators.pattern(
						/^[A-Z][A-Z0-9_]*$/
					),
				],
			],
			
			
			name: [
				'',
				[
					Validators.required,
					
					/*
						* Prevent whitespace-only
						* status names.
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
			// Optional backend fields
			// ---------------------------------------------------------
			
			description: [
				'',
			],
			
			
			sort_order: [
				0,
				[
					Validators.min(
						0
					),
				],
			],
			
			
			is_terminal: [
				false,
			],
			
			
			is_active: [
				true,
			],
		});
		
		
		/*
			* Backend validation errors are attached
			* directly to controls.
			*
			* When the user modifies that field, only
			* the server-side validation error is removed.
		*/
		this.enableServerErrorClearing();
	}
	
	
	// =========================================================================
	// Initialization
	// =========================================================================
	
	ngOnInit(): void {
		
		this.loadAccess();
	}
	
	
	private loadAccess(): void {
		
		this.loadingAccess =
		true;
		
		
		this.error =
		null;
		
		
		this.api
		.me()
		.pipe(
			
			finalize(
				() => {
					
					this.loadingAccess =
					false;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: (
				response: any
				) => {
				
				this.canManage =
				this.hasManagementAccess(
					response
				);
				
				
				if (
					!this.canManage
					) {
					
					this.error =
					'You do not have permission to manage agreement statuses.';
					
					
					return;
				}
				
				
				this.fetch();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.error =
				'Unable to verify agreement-status permissions.';
			},
		});
	}
	
	
	// =========================================================================
	// List
	// =========================================================================
	
	fetch(): void {
		
		if (
			!this.canManage
			) {
			return;
		}
		
		
		this.loading =
		true;
		
		
		this.error =
		null;
		
		
		const params:
		AgreementStatusListParams = {
			
			search:
			this.search
			.trim() ||
			undefined,
			
			
			is_active:
			this.booleanFilterValue(
				this.isActiveFilter
			),
			
			
			is_terminal:
			this.booleanFilterValue(
				this.isTerminalFilter
			),
			
			
			is_system_status:
			this.booleanFilterValue(
				this.isSystemFilter
			),
			
			
			page:
			this.page,
			
			
			per_page:
			this.perPage,
		};
		
		
		this.api
		.getAgreementStatuses(
			params
		)
		.pipe(
			
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
				ApiCollection<
				AgreementStatusDto
				>
				) => {
				
				this.rows =
				response.data ??
				[];
				
				
				this.total =
				response.meta
				?.total ??
				this.rows.length;
				
				
				this.page =
				response.meta
				?.current_page ??
				this.page;
				
				
				this.lastPage =
				response.meta
				?.last_page ??
				1;
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
				'Failed to load agreement statuses.';
			},
		});
	}
	
	
	applyFilters(): void {
		
		this.page =
		1;
		
		
		this.fetch();
	}
	
	
	resetFilters(): void {
		
		this.search =
		'';
		
		
		this.isActiveFilter =
		'';
		
		
		this.isTerminalFilter =
		'';
		
		
		this.isSystemFilter =
		'';
		
		
		this.page =
		1;
		
		
		this.fetch();
	}
	
	
	changePage(
		nextPage: number
		): void {
		
		if (
			nextPage < 1 ||
			nextPage >
			this.lastPage
			) {
			return;
		}
		
		
		this.page =
		nextPage;
		
		
		this.fetch();
	}
	
	
	// =========================================================================
	// Editor
	// =========================================================================
	
	openCreate(): void {
		
		if (
			!this.canManage
			) {
			return;
		}
		
		
		this.editingStatus =
		null;
		
		
		this.formError =
		null;
		
		
		/*
			* A previous System Status edit may
			* have disabled Code / Active.
		*/
		this.form.enable({
			emitEvent:
			false,
		});
		
		
		this.form.reset({
			
			code:
			'',
			
			name:
			'',
			
			description:
			'',
			
			sort_order:
			this.nextSortOrder(),
			
			is_terminal:
			false,
			
			is_active:
			true,
		});
		
		
		this.form
		.markAsPristine();
		
		
		this.form
		.markAsUntouched();
		
		
		this.editorOpen =
		true;
		
		
		this.cdr
		.detectChanges();
	}
	
	
	openEdit(
		status:
		AgreementStatusDto
		): void {
		
		if (
			!this.canManage
			) {
			return;
		}
		
		
		this.editingStatus =
		status;
		
		
		this.formError =
		null;
		
		
		/*
			* Ensure controls previously disabled by
			* another System Status are re-enabled
			* before resetting.
		*/
		this.form.enable({
			emitEvent:
			false,
		});
		
		
		this.form.reset({
			
			code:
			status.code,
			
			name:
			status.name,
			
			description:
			status.description ??
			'',
			
			sort_order:
			status.sort_order,
			
			is_terminal:
			status.is_terminal,
			
			is_active:
			status.is_active,
		});
		
		
		/*
			* The backend explicitly protects these two
			* fields on system lifecycle statuses:
			*
			* - code cannot be changed
			* - status cannot be deactivated
		*/
		if (
			status
			.is_system_status
			) {
			
			this.form
			.get(
				'code'
			)
			?.disable({
				emitEvent:
				false,
			});
			
			
			this.form
			.get(
				'is_active'
			)
			?.disable({
				emitEvent:
				false,
			});
		}
		
		
		this.form
		.markAsPristine();
		
		
		this.form
		.markAsUntouched();
		
		
		this.editorOpen =
		true;
		
		
		this.cdr
		.detectChanges();
	}
	
	
	closeEditor(): void {
		
		if (
			this.saving
			) {
			return;
		}
		
		
		this.editorOpen =
		false;
		
		
		this.editingStatus =
		null;
		
		
		this.formError =
		null;
		
		
		/*
			* Restore all controls so the next Create
			* operation starts normally.
		*/
		this.form.enable({
			emitEvent:
			false,
		});
		
		
		this.cdr
		.detectChanges();
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
		// Backend / Laravel validation
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
		// Whitespace / supported format
		// -------------------------------------------------------------
		
		if (
			errors[
				'pattern'
			]
			) {
			
			if (
				controlName ===
				'code'
				) {
				
				return (
					'Code must begin with a letter and contain only uppercase letters, numbers and underscores.'
				);
			}
			
			
			if (
				controlName ===
				'name'
				) {
				
				return (
					'Name cannot be blank or contain only spaces.'
				);
			}
			
			
			return (
				`${label} has an unsupported format.`
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
		// Minimum numeric value
		// -------------------------------------------------------------
		
		if (
			errors[
				'min'
			]
			) {
			
			return (
				`${label} must be ` +
				`${errors[
				'min'
				].min} or greater.`
			);
		}
		
		
		// -------------------------------------------------------------
		// Integer
		// -------------------------------------------------------------
		
		if (
			errors[
				'integer'
			]
			) {
			
			return (
				`${label} must be a whole number.`
			);
		}
		
		
		return (
			`${label} is invalid.`
		);
	}
	
	
	/*
		* Normalizes the Code in the same general
		* style as StoreAgreementStatusRequest and
		* UpdateAgreementStatusRequest:
		*
		* "legal review"
		*
		* becomes:
		*
		* "LEGAL_REVIEW"
	*/
	onCodeInput(): void {
		
		const control =
		this.form.get(
			'code'
		);
		
		
		if (
			!control ||
			control.disabled
			) {
			return;
		}
		
		
		const normalized =
		this.normalizeCode(
			control.value
		);
		
		
		if (
			normalized !==
			control.value
			) {
			
			control.setValue(
				normalized,
				{
					emitEvent:
					false,
				}
			);
		}
		
		
		/*
			* Because normalization above uses
			* emitEvent:false, explicitly remove an
			* old backend error when the user edits Code.
		*/
		this.clearControlError(
			'code',
			'server'
		);
		
		
		control
		.updateValueAndValidity({
			emitEvent:
			false,
		});
	}
	
	
	private enableServerErrorClearing():
	void {
		
		for (
			const control of
			Object.values(
				this.form.controls
			)
			) {
			
			control
			.valueChanges
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
	
	
	private applyApiFieldErrors(
		err: any
		): boolean {
		
		const errors =
		err?.error
		?.errors;
		
		
		if (
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
			
			
			const fieldName =
			candidates.find(
				name =>
				!!name &&
				!!this.form
				.get(
					name
				)
			);
			
			
			if (
				!fieldName
				) {
				continue;
			}
			
			
			const control =
			this.form.get(
				fieldName
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
	
	
	/*
		* The controller's protected-system-status
		* responses use a general ApiResponse error,
		* not Laravel errors.code / errors.is_active.
		*
		* The UI already disables those controls, but
		* this keeps the frontend defensive in case a
		* malformed request is ever sent.
	*/
	private applyProtectedSystemError(
		err: any
		): boolean {
		
		const message =
		String(
			err?.error
			?.message ??
			''
		)
		.trim();
		
		
		if (
			!message
			) {
			return false;
		}
		
		
		const lowered =
		message
		.toLowerCase();
		
		
		if (
			lowered.includes(
				'code'
			) &&
			lowered.includes(
				'system'
			)
			) {
			
			this.addControlError(
				'code',
				'server',
				message
			);
			
			
			return true;
		}
		
		
		if (
			lowered.includes(
				'deactivat'
			) &&
			lowered.includes(
				'system'
			)
			) {
			
			/*
				* is_active is normally disabled on a
				* system status, so this will mainly act
				* as a general defensive validation path.
			*/
			this.addControlError(
				'is_active',
				'server',
				message
			);
			
			
			return true;
		}
		
		
		return false;
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
					'.status-modal-panel .is-invalid'
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
		
		this.formError =
		null;
		
		
		// -----------------------------------------------------------------
		// Normalize Code
		// -----------------------------------------------------------------
		
		if (
			!this.form
			.get(
				'code'
			)
			?.disabled
			) {
			
			const codeControl =
			this.form.get(
				'code'
			);
			
			
			codeControl
			?.setValue(
				
				this.normalizeCode(
					codeControl.value
				),
				
				{
					emitEvent:
					false,
				}
			);
		}
		
		
		// -----------------------------------------------------------------
		// Normalize Name
		// -----------------------------------------------------------------
		
		const nameControl =
		this.form.get(
			'name'
		);
		
		
		nameControl
		?.setValue(
			
			String(
				nameControl.value ??
				''
			)
			.trim(),
			
			{
				emitEvent:
				false,
			}
		);
		
		
		this.form
		.updateValueAndValidity();
		
		
		// -----------------------------------------------------------------
		// Validate
		// -----------------------------------------------------------------
		
		if (
			this.form.invalid
			) {
			
			this.form
			.markAllAsTouched();
			
			
			this.formError =
			'Please correct the highlighted fields before submitting.';
			
			
			this.focusFirstInvalidField();
			
			
			this.cdr
			.detectChanges();
			
			
			return;
		}
		
		
		const raw =
		this.form
		.getRawValue();
		
		
		// -----------------------------------------------------------------
		// Shared payload
		// -----------------------------------------------------------------
		
		const basePayload:
		AgreementStatusUpsertPayload = {
			
			name:
			String(
				raw.name ??
				''
			)
			.trim(),
			
			
			description:
			String(
				raw.description ??
				''
			)
			.trim() ||
			null,
			
			
			sort_order:
			this.nonNegativeInteger(
				raw.sort_order
			),
			
			
			is_terminal:
			!!raw.is_terminal,
		};
		
		
		let request$:
		Observable<
		ApiResource<
		AgreementStatusDto
		>
		>;
		
		
		// -----------------------------------------------------------------
		// Create
		// -----------------------------------------------------------------
		
		if (
			!this.editingStatus
			) {
			
			const payload:
			AgreementStatusUpsertPayload = {
				
				...basePayload,
				
				
				code:
				this.normalizeCode(
					raw.code
				),
				
				
				is_active:
				!!raw.is_active,
			};
			
			
			request$ =
			this.api
			.createAgreementStatus(
				payload
			);
			
			} else {
			
			// -----------------------------------------------------------------
			// Update
			// -----------------------------------------------------------------
			
			const payload:
			AgreementStatusUpsertPayload = {
				
				...basePayload,
			};
			
			
			/*
				* System statuses cannot have Code or
				* Active modified.
				*
				* Omit both from the request entirely.
			*/
			if (
				!this.editingStatus
				.is_system_status
				) {
				
				payload.code =
				this.normalizeCode(
					raw.code
				);
				
				
				payload.is_active =
				!!raw.is_active;
			}
			
			
			request$ =
			this.api
			.updateAgreementStatus(
				this.editingStatus.id,
				payload
			);
		}
		
		
		this.saving =
		true;
		
		
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
			
			next: () => {
				
				const wasEditing =
				!!this.editingStatus;
				
				
				this.toast
				.success(
					
					wasEditing
					? 'Agreement status updated.'
					: 'Agreement status created.'
				);
				
				
				this.editorOpen =
				false;
				
				
				this.editingStatus =
				null;
				
				
				this.formError =
				null;
				
				
				/*
					* Reset protected controls for
					* the next Create/Edit.
				*/
				this.form.enable({
					emitEvent:
					false,
				});
				
				
				this.fetch();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				// -----------------------------------------------------
				// Standard Laravel validation
				// -----------------------------------------------------
				
				if (
					this.applyApiFieldErrors(
						err
					)
					) {
					
					this.formError =
					'Please correct the highlighted fields.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// Protected system-status response
				// -----------------------------------------------------
				
				if (
					err?.status ===
					422 &&
					this.applyProtectedSystemError(
						err
					)
					) {
					
					this.formError =
					err?.error
					?.message ||
					'The protected system status cannot be changed in that way.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// General error
				// -----------------------------------------------------
				
				this.formError =
				this.apiErrorMessage(
					
					err,
					
					this.editingStatus
					
					? 'Failed to update agreement status.'
					
					: 'Failed to create agreement status.'
				);
			},
		});
	}
	
	
	// =========================================================================
	// Deactivate / Reactivate
	// =========================================================================
	
	deactivate(
		status:
		AgreementStatusDto
		): void {
		
		if (
			!this.canManage ||
			status.is_system_status ||
			!status.is_active ||
			this.deactivatingId !==
			null
			) {
			return;
		}
		
		
		const confirmed =
		window.confirm(
			
			`Deactivate agreement status "${status.code} - ${status.name}"?\n\n` +
			
			'Existing records can retain this status, but it should no longer be selected for new or updated agreements.'
		);
		
		
		if (
			!confirmed
			) {
			return;
		}
		
		
		this.deactivatingId =
		status.id;
		
		
		this.api
		.deactivateAgreementStatus(
			status.id
		)
		.pipe(
			
			finalize(
				() => {
					
					this.deactivatingId =
					null;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: () => {
				
				this.toast
				.success(
					'Agreement status deactivated.'
				);
				
				
				this.fetch();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.toast
				.error(
					this.apiErrorMessage(
						
						err,
						
						'Failed to deactivate agreement status.'
					)
				);
			},
		});
	}
	
	
	reactivate(
		status:
		AgreementStatusDto
		): void {
		
		if (
			!this.canManage ||
			status.is_system_status ||
			status.is_active ||
			this.reactivatingId !==
			null
			) {
			return;
		}
		
		
		this.reactivatingId =
		status.id;
		
		
		this.api
		.updateAgreementStatus(
			status.id,
			{
				is_active:
				true,
			}
		)
		.pipe(
			
			finalize(
				() => {
					
					this.reactivatingId =
					null;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: () => {
				
				this.toast
				.success(
					'Agreement status reactivated.'
				);
				
				
				this.fetch();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.toast
				.error(
					this.apiErrorMessage(
						
						err,
						
						'Failed to reactivate agreement status.'
					)
				);
			},
		});
	}
	
	
	// =========================================================================
	// Display helpers
	// =========================================================================
	
	statusTypeLabel(
		status:
		AgreementStatusDto
		): string {
		
		return (
			status
			.is_system_status
			
			? 'System'
			
			: 'Custom'
		);
	}
	
	
	private nextSortOrder():
	number {
		
		if (
			!this.rows.length
			) {
			return 10;
		}
		
		
		const maxSortOrder =
		Math.max(
			
			...this.rows
			.map(
				status =>
				Number(
					status
					.sort_order ??
					0
				)
			)
		);
		
		
		return (
			maxSortOrder +
			10
		);
	}
	
	
	private booleanFilterValue(
		value:
		BooleanFilter
	):
	boolean | undefined {
		
		if (
			value ===
			'1'
			) {
			return true;
		}
		
		
		if (
			value ===
			'0'
			) {
			return false;
		}
		
		
		return undefined;
	}
	
	
	private normalizeCode(
		value: unknown
		): string {
		
		return String(
			value ??
			''
		)
		.trim()
		.toUpperCase()
		.replace(
			/[^A-Z0-9]+/g,
			'_'
		)
		.replace(
			/^_+|_+$/g,
			''
		)
		.slice(
			0,
			50
		);
	}
	
	
	private nonNegativeInteger(
		value: unknown
		): number {
		
		const parsed =
		Number(
			value
		);
		
		
		/*
			* sort_order is optional on the backend
			* and defaults to 0.
		*/
		if (
			!Number.isFinite(
				parsed
			) ||
			parsed < 0
			) {
			
			return 0;
		}
		
		
		return Math.trunc(
			parsed
		);
	}
	
	
	// =========================================================================
	// Permission helper
	// =========================================================================
	
	private hasManagementAccess(
		response: any
		): boolean {
		
		const principal =
		response?.data?.user ??
		response?.data ??
		response ??
		{};
		
		
		const directPermissions =
		principal?.permissions ??
		response?.permissions ??
		[];
		
		
		const roles =
		principal?.roles ??
		response?.roles ??
		[];
		
		
		const permissionCodes =
		[
			
			...(
				Array.isArray(
					directPermissions
				)
				? directPermissions
				: []
			),
			
			
			...(
				Array.isArray(
					roles
				)
				
				? roles.flatMap(
					(
						role: any
					) =>
					role
					?.permissions ??
					[]
				)
				
				: []
			),
		]
		.map(
			(
				permission: any
			) =>
			String(
				
				typeof permission ===
				'string'
				
				? permission
				
				: (
					permission
					?.code ??
					
					permission
					?.name ??
					
					''
				)
			)
		)
		.filter(
			Boolean
		);
		
		
		if (
			permissionCodes.includes(
				'system.all'
			) ||
			permissionCodes.includes(
				'agreements.status.manage'
			)
			) {
			
			return true;
		}
		
		
		const roleCodes =
		(
			Array.isArray(
				roles
			)
			? roles
			: []
		)
		.map(
			(
				role: any
			) =>
			String(
				
				typeof role ===
				'string'
				
				? role
				
				: (
					role
					?.code ??
					
					role
					?.name ??
					
					''
				)
			)
			.toUpperCase()
		);
		
		
		return (
			roleCodes.includes(
				'ADMIN'
			) ||
			roleCodes.includes(
				'AGREEMENT_ADMIN'
			)
		);
	}
	
	
	// =========================================================================
	// Generic API error
	// =========================================================================
	
	private apiErrorMessage(
		err: any,
		fallback: string
		): string {
		
		if (
			err?.status ===
			422
			) {
			
			const errors =
			err?.error
			?.errors;
			
			
			if (
				errors &&
				typeof errors ===
				'object'
				) {
				
				const firstKey =
				Object.keys(
					errors
				)[0];
				
				
				const firstValue =
				errors[
					firstKey
				];
				
				
				if (
					Array.isArray(
						firstValue
					) &&
					firstValue.length
					) {
					
					return String(
						firstValue[0]
					);
				}
			}
		}
		
		
		return (
			err?.error
			?.message ||
			fallback
		);
	}
}