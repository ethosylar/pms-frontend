import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule, } from '@angular/common';
import { FormsModule, } from '@angular/forms';
import { finalize, } from 'rxjs/operators';
import {
	AgreementDocumentTypeDto,
	AgreementDocumentTypeUpsertPayload,
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
	'app-agreement-document-types',
	
	imports: [
		CommonModule,
		FormsModule,
	],
	
	templateUrl:
	'./agreement-document-types.html',
	
	styleUrls: [
		'./agreement-document-types.scss',
	],
})
export class AgreementDocumentTypesComponent
implements OnInit {
	
	// =========================================================================
	// Page State
	// =========================================================================
	
	loading = true;
	
	saving = false;
	
	
	error:
	string | null = null;
	
	formError:
	string | null = null;
	
	
	// =========================================================================
	// Table
	// =========================================================================
	
	rows:
	AgreementDocumentTypeDto[] = [];
	
	
	page = 1;
	
	perPage = 20;
	
	total = 0;
	
	lastPage = 1;
	
	
	search = '';
	
	activeFilter:
	BooleanFilter = '';
	
	ocrFilter:
	BooleanFilter = '';
	
	
	// =========================================================================
	// Modal
	// =========================================================================
	
	modalOpen =
	false;
	
	
	editingId:
	number | null = null;
	
	
	editingSystemType =
	false;
	
	
	deactivatingId:
	number | null = null;
	
	
	reactivatingId:
	number | null = null;
	
	
	// =========================================================================
	// Form
	// =========================================================================
	
	form = {
		code: '',
		name: '',
		description: '',
		ocr_eligible: true,
		sort_order: 0,
		is_active: true,
	};
	
	
	/*
		* Because this page uses ngModel rather than
		* Angular Reactive Forms, field-specific
		* validation errors are maintained here.
	*/
	fieldErrors:
	Record<string, string> = {};
	
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	
	// =========================================================================
	// Initialization
	// =========================================================================
	
	ngOnInit(): void {
		
		this.fetch();
	}
	
	
	// =========================================================================
	// List
	// =========================================================================
	
	fetch(): void {
		
		this.loading =
		true;
		
		
		this.error =
		null;
		
		
		this.api
		.getAgreementDocumentTypes({
			
			search:
			this.search
			.trim() ||
			undefined,
			
			
			is_active:
			this.booleanValue(
				this.activeFilter
			),
			
			
			ocr_eligible:
			this.booleanValue(
				this.ocrFilter
			),
			
			
			page:
			this.page,
			
			
			per_page:
			this.perPage,
		})
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
			
			next: result => {
				
				this.rows =
				result.data ??
				[];
				
				
				this.total =
				result.meta
				?.total ??
				this.rows.length;
				
				
				this.page =
				result.meta
				?.current_page ??
				this.page;
				
				
				this.lastPage =
				result.meta
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
				'Failed to load agreement document types.';
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
		
		
		this.activeFilter =
		'';
		
		
		this.ocrFilter =
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
	// Modal
	// =========================================================================
	
	openCreate(): void {
		
		this.modalOpen =
		true;
		
		
		this.editingId =
		null;
		
		
		this.editingSystemType =
		false;
		
		
		this.formError =
		null;
		
		
		this.fieldErrors =
		{};
		
		
		/*
			* These match the backend defaults:
			*
			* OCR Eligible = true
			* Sort Order   = 0
			* Active       = true
		*/
		this.form = {
			
			code:
			'',
			
			name:
			'',
			
			description:
			'',
			
			ocr_eligible:
			true,
			
			sort_order:
			0,
			
			is_active:
			true,
		};
		
		
		this.cdr
		.detectChanges();
	}
	
	
	openEdit(
		row:
		AgreementDocumentTypeDto
		): void {
		
		this.modalOpen =
		true;
		
		
		this.editingId =
		row.id;
		
		
		this.editingSystemType =
		row.is_system_type;
		
		
		this.formError =
		null;
		
		
		this.fieldErrors =
		{};
		
		
		this.form = {
			
			code:
			row.code,
			
			name:
			row.name,
			
			description:
			row.description ??
			'',
			
			ocr_eligible:
			row.ocr_eligible,
			
			sort_order:
			row.sort_order,
			
			is_active:
			row.is_active,
		};
		
		
		this.cdr
		.detectChanges();
	}
	
	
	closeModal(): void {
		
		if (
			this.saving
			) {
			return;
		}
		
		
		this.modalOpen =
		false;
		
		
		this.editingId =
		null;
		
		
		this.editingSystemType =
		false;
		
		
		this.formError =
		null;
		
		
		this.fieldErrors =
		{};
		
		
		this.cdr
		.detectChanges();
	}
	
	
	// =========================================================================
	// Field Validation Helpers
	// =========================================================================
	
	isFieldInvalid(
		field: string
		): boolean {
		
		return !!this
		.fieldErrors[
			field
		];
	}
	
	
	fieldError(
		field: string
		): string {
		
		return (
			this
			.fieldErrors[
				field
			] ??
			''
		);
	}
	
	
	clearFieldError(
		field: string
		): void {
		
		delete this
		.fieldErrors[
			field
		];
		
		
		/*
			* Remove the generic validation message once
			* there are no field errors remaining.
		*/
		if (
			Object.keys(
				this.fieldErrors
			).length === 0 &&
			this.formError ===
			'Please correct the highlighted fields.'
			) {
			
			this.formError =
			null;
		}
	}
	
	
	// =========================================================================
	// Code
	// =========================================================================
	
	normaliseCode(): void {
		
		/*
			* System document type codes are protected,
			* so do not manipulate a disabled/protected
			* code during edit.
		*/
		if (
			this.editingSystemType
			) {
			return;
		}
		
		
		this.form.code =
		String(
			this.form.code ??
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
			60
		);
		
		
		this.clearFieldError(
			'code'
		);
	}
	
	
	// =========================================================================
	// Save
	// =========================================================================
	
	save(): void {
		
		this.formError =
		null;
		
		
		this.fieldErrors =
		{};
		
		
		// -----------------------------------------------------------------
		// Normalize values
		// -----------------------------------------------------------------
		
		if (
			!this.editingSystemType
			) {
			this.normaliseCode();
		}
		
		
		this.form.name =
		String(
			this.form.name ??
			''
		)
		.trim();
		
		
		this.form.description =
		String(
			this.form.description ??
			''
		)
		.trim();
		
		
		// -----------------------------------------------------------------
		// Frontend validation
		// -----------------------------------------------------------------
		
		this.validateForm();
		
		
		if (
			Object.keys(
				this.fieldErrors
			).length > 0
			) {
			
			this.formError =
			'Please correct the highlighted fields.';
			
			
			this.focusFirstInvalidField();
			
			
			this.cdr
			.detectChanges();
			
			
			return;
		}
		
		
		// -----------------------------------------------------------------
		// Payload
		// -----------------------------------------------------------------
		
		const payload:
		AgreementDocumentTypeUpsertPayload = {
			
			name:
			this.form.name,
			
			
			description:
			this.form
			.description ||
			null,
			
			
			ocr_eligible:
			!!this.form
			.ocr_eligible,
			
			
			sort_order:
			this.nonNegativeInteger(
				this.form
				.sort_order
			),
		};
		
		
		/*
			* System document types:
			*
			* - cannot change Code
			* - cannot be deactivated
			*
			* Therefore omit both fields from the update
			* entirely rather than sending protected
			* values back to Laravel.
		*/
		if (
			!this.editingSystemType
			) {
			
			payload.code =
			this.form.code;
			
			
			payload.is_active =
			!!this.form
			.is_active;
		}
		
		
		this.saving =
		true;
		
		
		const request$ =
		this.editingId ===
		null
		
		? this.api
		.createAgreementDocumentType(
			payload
		)
		
		: this.api
		.updateAgreementDocumentType(
			this.editingId,
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
			
			next: () => {
				
				const wasEditing =
				this.editingId !==
				null;
				
				
				this.toast
				.success(
					
					wasEditing
					? 'Agreement document type updated.'
					: 'Agreement document type created.'
				);
				
				
				this.closeModal();
				
				
				this.fetch();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				// -----------------------------------------------------
				// Standard Laravel field validation
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
				// Protected system-type error
				//
				// Normally the UI prevents this, but keep
				// a defensive fallback for backend errors.
				// -----------------------------------------------------
				
				if (
					this.applyProtectedSystemError(
						err
					)
					) {
					
					this.formError =
					err?.error
					?.message ||
					'The protected system document type cannot be changed in that way.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				// -----------------------------------------------------
				// General API error
				// -----------------------------------------------------
				
				this.formError =
				err?.error
				?.message ||
				(
					this.editingId ===
					null
					? 'Failed to create agreement document type.'
					: 'Failed to update agreement document type.'
				);
			},
		});
	}
	
	
	private validateForm(): void {
		
		// -----------------------------------------------------------------
		// Code
		// -----------------------------------------------------------------
		
		if (
			!this.editingSystemType
			) {
			
			const code =
			String(
				this.form.code ??
				''
			)
			.trim();
			
			
			if (
				!code
				) {
				
				this.fieldErrors[
					'code'
				] =
				'Code is required.';
				
				} else if (
				code.length >
				60
				) {
				
				this.fieldErrors[
					'code'
				] =
				'Code cannot exceed 60 characters.';
				
				} else if (
				!/^[A-Z][A-Z0-9_]*$/
				.test(
					code
				)
				) {
				
				this.fieldErrors[
					'code'
				] =
				'Code must begin with a letter and contain only uppercase letters, numbers and underscores.';
			}
		}
		
		
		// -----------------------------------------------------------------
		// Name
		// -----------------------------------------------------------------
		
		const name =
		String(
			this.form.name ??
			''
		)
		.trim();
		
		
		if (
			!name
			) {
			
			this.fieldErrors[
				'name'
			] =
			'Name is required.';
			
			} else if (
			name.length >
			150
			) {
			
			this.fieldErrors[
				'name'
			] =
			'Name cannot exceed 150 characters.';
		}
		
		
		// -----------------------------------------------------------------
		// Sort Order
		// -----------------------------------------------------------------
		
		const sortOrder =
		Number(
			this.form
			.sort_order
		);
		
		
		if (
			!Number.isFinite(
				sortOrder
			)
			) {
			
			this.fieldErrors[
				'sort_order'
			] =
			'Sort Order must be a valid number.';
			
			} else if (
			!Number.isInteger(
				sortOrder
			)
			) {
			
			this.fieldErrors[
				'sort_order'
			] =
			'Sort Order must be a whole number.';
			
			} else if (
			sortOrder < 0
			) {
			
			this.fieldErrors[
				'sort_order'
			] =
			'Sort Order must be zero or greater.';
		}
	}
	
	
	// =========================================================================
	// Backend Validation
	// =========================================================================
	
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
			
			const field =
			String(
				backendField
			)
			.split('.')[0];
			
			
			if (
				![
					'code',
					'name',
					'description',
					'ocr_eligible',
					'sort_order',
					'is_active',
				]
				.includes(
					field
				)
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
			
			
			this.fieldErrors[
				field
			] =
			message;
			
			
			applied =
			true;
		}
		
		
		return applied;
	}
	
	
	private applyProtectedSystemError(
		err: any
		): boolean {
		
		if (
			err?.status !==
			422
			) {
			return false;
		}
		
		
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
		
		
		const lower =
		message
		.toLowerCase();
		
		
		if (
			lower.includes(
				'code'
			) &&
			lower.includes(
				'system'
			)
			) {
			
			this.fieldErrors[
				'code'
			] =
			message;
			
			
			return true;
		}
		
		
		if (
			lower.includes(
				'deactivat'
			) &&
			lower.includes(
				'system'
			)
			) {
			
			this.fieldErrors[
				'is_active'
			] =
			message;
			
			
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
					'.management-modal .is-invalid'
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
				
				
				/*
					* Disabled system controls cannot
					* receive focus.
				*/
				if (
					!element.hasAttribute(
						'disabled'
					)
					) {
					element.focus();
				}
				
			},
			50
		);
	}
	
	
	// =========================================================================
	// Deactivate / Reactivate
	// =========================================================================
	
	deactivate(
		row:
		AgreementDocumentTypeDto
		): void {
		
		if (
			row.is_system_type ||
			!row.is_active ||
			this.deactivatingId !==
			null
			) {
			return;
		}
		
		
		const confirmed =
		window.confirm(
			
			`Deactivate document type "${row.code} - ${row.name}"?\n\n` +
			
			'Existing agreement documents can continue referencing this type, but it should no longer be available for new document uploads.'
		);
		
		
		if (
			!confirmed
			) {
			return;
		}
		
		
		this.deactivatingId =
		row.id;
		
		
		this.api
		.deactivateAgreementDocumentType(
			row.id
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
					'Agreement document type deactivated.'
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
					
					err?.error
					?.message ||
					
					'Failed to deactivate agreement document type.'
				);
			},
		});
	}
	
	
	reactivate(
		row:
		AgreementDocumentTypeDto
		): void {
		
		if (
			row.is_system_type ||
			row.is_active ||
			this.reactivatingId !==
			null
			) {
			return;
		}
		
		
		this.reactivatingId =
		row.id;
		
		
		this.api
		.updateAgreementDocumentType(
			row.id,
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
					'Agreement document type reactivated.'
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
					
					err?.error
					?.message ||
					
					'Failed to reactivate agreement document type.'
				);
			},
		});
	}
	
	
	// =========================================================================
	// Helpers
	// =========================================================================
	
	private booleanValue(
		value:
		BooleanFilter
	):
	boolean | undefined {
		
		if (
			value ===
			''
			) {
			return undefined;
		}
		
		
		return (
			value ===
			'1'
		);
	}
	
	
	private nonNegativeInteger(
		value: unknown
		): number {
		
		const number =
		Number(
			value
		);
		
		
		if (
			!Number.isFinite(
				number
			) ||
			number < 0
			) {
			return 0;
		}
		
		
		return Math.floor(
			number
		);
	}
}