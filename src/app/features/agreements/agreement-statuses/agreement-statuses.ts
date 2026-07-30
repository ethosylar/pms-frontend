import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
	AgreementStatusDto,
	AgreementStatusListParams,
	AgreementStatusUpsertPayload,
	ApiCollection,
	ApiResource,
	ApiService,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

type BooleanFilter = '' | '1' | '0';

@Component({
	standalone: true,
	selector: 'app-agreement-statuses',
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		RouterModule,
	],
	templateUrl: './agreement-statuses.html',
	styleUrls: ['./agreement-statuses.scss'],
})
export class AgreementStatusesComponent implements OnInit {
	loadingAccess = true;
	loading = false;
	saving = false;
	
	error: string | null = null;
	formError: string | null = null;
	
	canManage = false;
	
	rows: AgreementStatusDto[] = [];
	
	page = 1;
	perPage = 25;
	total = 0;
	lastPage = 1;
	
	search = '';
	isActiveFilter: BooleanFilter = '';
	isTerminalFilter: BooleanFilter = '';
	isSystemFilter: BooleanFilter = '';
	
	editorOpen = false;
	editingStatus: AgreementStatusDto | null = null;
	deactivatingId: number | null = null;
	reactivatingId: number | null = null;
	
	form: FormGroup;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		this.form = this.fb.group({
			code: [
				'',
				[
					Validators.required,
					Validators.maxLength(50),
					Validators.pattern(
						/^[A-Z][A-Z0-9_]*$/
					),
				],
			],
			name: [
				'',
				[
					Validators.required,
					Validators.maxLength(120),
				],
			],
			description: [''],
			sort_order: [
				0,
				[
					Validators.required,
					Validators.min(0),
				],
			],
			is_terminal: [false],
			is_active: [true],
		});
	}
	
	ngOnInit(): void {
		this.loadAccess();
	}
	
	private loadAccess(): void {
		this.loadingAccess = true;
		this.error = null;
		
		this.api.me()
		.pipe(
			finalize(() => {
				this.loadingAccess = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (response: any) => {
				this.canManage =
				this.hasManagementAccess(
					response
				);
				
				if (!this.canManage) {
					this.error =
					'You do not have permission to manage agreement statuses.';
					return;
				}
				
				this.fetch();
			},
			error: err => {
				console.error(err);
				this.error =
				'Unable to verify agreement-status permissions.';
			},
		});
	}
	
	fetch(): void {
		if (!this.canManage) {
			return;
		}
		
		this.loading = true;
		this.error = null;
		
		const params:
		AgreementStatusListParams = {
			search:
			this.search.trim() ||
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
			page: this.page,
			per_page: this.perPage,
		};
		
		this.api.getAgreementStatuses(
			params
		)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				response:
				ApiCollection<AgreementStatusDto>
				) => {
				this.rows =
				response.data ?? [];
				
				this.total =
				response.meta?.total ??
				this.rows.length;
				
				this.page =
				response.meta?.current_page ??
				this.page;
				
				this.lastPage =
				response.meta?.last_page ??
				1;
			},
			error: (err: any) => {
				console.error(err);
				this.error =
				err?.error?.message ||
				'Failed to load agreement statuses.';
			},
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	resetFilters(): void {
		this.search = '';
		this.isActiveFilter = '';
		this.isTerminalFilter = '';
		this.isSystemFilter = '';
		this.page = 1;
		this.fetch();
	}
	
	changePage(nextPage: number): void {
		if (
			nextPage < 1 ||
			nextPage > this.lastPage
			) {
			return;
		}
		
		this.page = nextPage;
		this.fetch();
	}
	
	openCreate(): void {
		if (!this.canManage) {
			return;
		}
		
		this.editingStatus = null;
		this.formError = null;
		
		this.form.enable({
			emitEvent: false,
		});
		
		this.form.reset({
			code: '',
			name: '',
			description: '',
			sort_order: this.nextSortOrder(),
			is_terminal: false,
			is_active: true,
		});
		
		this.editorOpen = true;
		this.cdr.detectChanges();
	}
	
	openEdit(
		status: AgreementStatusDto
		): void {
		if (!this.canManage) {
			return;
		}
		
		this.editingStatus = status;
		this.formError = null;
		
		this.form.enable({
			emitEvent: false,
		});
		
		this.form.reset({
			code: status.code,
			name: status.name,
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
		
		if (status.is_system_status) {
			this.form.get('code')?.disable({
				emitEvent: false,
			});
			
			this.form.get('is_active')?.disable({
				emitEvent: false,
			});
		}
		
		this.editorOpen = true;
		this.cdr.detectChanges();
	}
	
	closeEditor(): void {
		if (this.saving) {
			return;
		}
		
		this.editorOpen = false;
		this.editingStatus = null;
		this.formError = null;
		
		this.form.enable({
			emitEvent: false,
		});
		
		this.cdr.detectChanges();
	}
	
	onCodeInput(): void {
		const control =
		this.form.get('code');
		
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
			normalized !== control.value
			) {
			control.setValue(
				normalized,
				{ emitEvent: false }
			);
		}
	}
	
	save(): void {
		this.formError = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const raw =
		this.form.getRawValue();
		
		const basePayload:
		AgreementStatusUpsertPayload = {
			name:
			String(
				raw.name ??
				''
			).trim(),
			description:
			String(
				raw.description ??
				''
			).trim() ||
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
		ApiResource<AgreementStatusDto>
		>;
		
		if (!this.editingStatus) {
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
			this.api.createAgreementStatus(
				payload
			);
			} else {
			const payload:
			AgreementStatusUpsertPayload = {
				...basePayload,
			};
			
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
			this.api.updateAgreementStatus(
				this.editingStatus.id,
				payload
			);
		}
		
		this.saving = true;
		
		request$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				const wasEditing =
				!!this.editingStatus;
				
				this.toast.success(
					wasEditing
					? 'Agreement status updated.'
					: 'Agreement status created.'
				);
				
				this.editorOpen = false;
				this.editingStatus = null;
				this.formError = null;
				
				this.form.enable({
					emitEvent: false,
				});
				
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				
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
	
	deactivate(
		status: AgreementStatusDto
		): void {
		if (
			!this.canManage ||
			status.is_system_status ||
			!status.is_active ||
			this.deactivatingId !== null
			) {
			return;
		}
		
		const confirmed =
		window.confirm(
			`Deactivate agreement status "${status.code} - ${status.name}"?\n\n` +
			'Existing records can retain this status, but it should no longer be selected for new or updated agreements.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.deactivatingId =
		status.id;
		
		this.api.deactivateAgreementStatus(
			status.id
		)
		.pipe(
			finalize(() => {
				this.deactivatingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Agreement status deactivated.'
				);
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to deactivate agreement status.'
					)
				);
			},
		});
	}
	
	reactivate(
		status: AgreementStatusDto
		): void {
		if (
			!this.canManage ||
			status.is_system_status ||
			status.is_active ||
			this.reactivatingId !== null
			) {
			return;
		}
		
		this.reactivatingId =
		status.id;
		
		this.api.updateAgreementStatus(
			status.id,
			{ is_active: true }
		)
		.pipe(
			finalize(() => {
				this.reactivatingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Agreement status reactivated.'
				);
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to reactivate agreement status.'
					)
				);
			},
		});
	}
	
	statusTypeLabel(
		status: AgreementStatusDto
		): string {
		if (status.is_system_status) {
			return 'System';
		}
		
		return 'Custom';
	}
	
	private nextSortOrder(): number {
		if (!this.rows.length) {
			return 10;
		}
		
		const maxSortOrder =
		Math.max(
			...this.rows.map(
				status =>
				Number(
					status.sort_order ??
					0
				)
			)
		);
		
		return maxSortOrder + 10;
	}
	
	private booleanFilterValue(
		value: BooleanFilter
		): boolean | undefined {
		if (value === '1') {
			return true;
		}
		
		if (value === '0') {
			return false;
		}
		
		return undefined;
	}
	
	private normalizeCode(
		value: unknown
		): string {
		return String(value ?? '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	}
	
	private nonNegativeInteger(
		value: unknown
		): number {
		const parsed =
		Number(value);
		
		if (
			!Number.isFinite(parsed) ||
			parsed < 0
			) {
			return 0;
		}
		
		return Math.trunc(parsed);
	}
	
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
			...(Array.isArray(
				directPermissions
			)
			? directPermissions
			: []),
			...(
				Array.isArray(roles)
				? roles.flatMap(
					(role: any) =>
					role?.permissions ??
					[]
				)
				: []
			),
		]
		.map((permission: any) =>
			String(
				typeof permission ===
				'string'
				? permission
				: (
					permission?.code ??
					permission?.name ??
					''
				)
			)
		)
		.filter(Boolean);
		
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
		(Array.isArray(roles)
			? roles
		: [])
		.map((role: any) =>
			String(
				typeof role ===
				'string'
				? role
				: (
					role?.code ??
					role?.name ??
					''
				)
			)
			.toUpperCase()
		);
		
		return (
			roleCodes.includes('ADMIN') ||
			roleCodes.includes(
				'AGREEMENT_ADMIN'
			)
		);
	}
	
	private apiErrorMessage(
		err: any,
		fallback: string
		): string {
		if (err?.status === 422) {
			const errors =
			err?.error?.errors;
			
			if (
				errors &&
				typeof errors === 'object'
				) {
				const firstKey =
				Object.keys(errors)[0];
				
				const firstValue =
				errors[firstKey];
				
				if (
					Array.isArray(firstValue) &&
					firstValue.length
					) {
					return String(
						firstValue[0]
					);
				}
			}
		}
		
		return (
			err?.error?.message ||
			fallback
		);
	}
}
