import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { catchError, finalize, switchMap, } from 'rxjs/operators';
import { forkJoin, of, } from 'rxjs';

import {
	AgreementDto,
	AgreementUpsertPayload,
	ApiCollection,
	ApiResource,
	ApiService,
	LookupAgreementCategoryDto,
	LookupAgreementTypeDto,
	LookupCounterpartyDto,
	LookupDepartmentDto,
	LookupUserDto,
} from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-agreement-form',
	imports: [
		CommonModule,
		ReactiveFormsModule,
		RouterModule,
	],
	templateUrl: './agreement-form.html',
	styleUrls: ['./agreement-form.scss'],
})
export class AgreementFormComponent implements OnInit {
	loading = true;
	saving = false;
	
	error: string | null = null;
	lookupWarning: string | null = null;
	
	isCreate = true;
	agreementId: number | null = null;
	
	original: AgreementDto | null = null;
	
	departments: LookupDepartmentDto[] = [];
	owners: LookupUserDto[] = [];
	counterparties: LookupCounterpartyDto[] = [];
	categories: LookupAgreementCategoryDto[] = [];
	allTypes: LookupAgreementTypeDto[] = [];
	filteredTypes: LookupAgreementTypeDto[] = [];
	
	form: FormGroup;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private auth: AuthService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		this.form = this.fb.group({
			agreement_no: [
				'',
				[
					Validators.maxLength(80),
					Validators.pattern(
						/^[A-Z0-9][A-Z0-9_\/-]*$/
					),
				],
			],
			
			title: [
				'',
				[
					Validators.required,
					Validators.maxLength(255),
				],
			],
			
			department_id: [
				null,
				Validators.required,
			],
			
			owner_user_id: [
				null,
				Validators.required,
			],
			
			counterparty_id: [
				null,
				Validators.required,
			],
			
			agreement_category_id: [
				null,
				Validators.required,
			],
			
			agreement_type_id: [null],
			
			description: [''],
			purpose: [''],
			scope: [''],
			
			effective_date: [null],
			expiry_date: [null],
			signed_date: [null],
			
			notice_period_days: [
				null,
				[
					Validators.min(0),
					Validators.max(3650),
				],
			],
			
			auto_renewal: [false],
			
			contract_value: [
				null,
				Validators.min(0),
			],
			
			currency_code: [
				'MYR',
				[
					Validators.required,
					Validators.pattern(/^[A-Z]{3}$/),
				],
			],
		});
	}
	
	ngOnInit(): void {
		const idParam = this.route.snapshot.paramMap.get('id');
		
		this.isCreate = !idParam || idParam === 'new';
		
		if (!this.isCreate) {
			const parsed = Number(idParam);
			if (!Number.isInteger(parsed) || parsed <= 0) {
				this.error = 'Invalid agreement ID.';
				this.loading = false;
				return;
			}
			this.agreementId = parsed;
		}
		this.loadForm();
	}
	
	canCreate(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.create',
		]);
	}
	
	canEdit(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.edit',
		]);
	}
	
	loadForm(): void {
		this.loading = true;
		
		forkJoin({
			me:
			this.api.me().pipe(
				catchError(() => of(null))
			),
			
			departments: this.api
			.getLookupDepartments()
			.pipe(catchError(() => of({ data: [], } as ApiCollection<LookupDepartmentDto>))
			),
			
			owners: this.api
			.getLookupUsers()
			.pipe(catchError(() => of({ data: [], } as ApiCollection<LookupUserDto>))
			),
			
			counterparties: this.api
			.getLookupCounterparties()
			.pipe(catchError(() => of({ data: [], } as ApiCollection<LookupCounterpartyDto>))
			),
			
			categories: this.api
			.getLookupAgreementCategories()
			.pipe(catchError(() => of({ data: [], } as ApiCollection<LookupAgreementCategoryDto>))
			),
			
			types: this.api
			.getLookupAgreementTypes()
			.pipe(catchError(() => of({ data: [], } as ApiCollection<LookupAgreementTypeDto>))
			),
		})
		.pipe(
			switchMap(result => {
				this.departments = result.departments.data ?? [];
				this.owners = result.owners.data ?? [];
				this.counterparties = result.counterparties.data ?? [];
				this.categories = result.categories.data ?? [];
				this.allTypes = result.types.data ?? [];
				this.applyCurrentUserFallback(result.me);
				if (this.isCreate) {
					this.onCategoryChange();
					return of(null);
				}
				return this.api.getAgreement(this.agreementId!);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				result:
				| ApiResource<AgreementDto>
				| null
				) => {
				if (!result) {
					return;
				}
				const agreement = result.data;
				this.original = agreement;
				const statusCode = agreement.status?.code ?? '';
				if (!['DRAFT','UNDER_REVIEW',].includes(statusCode)) {
					this.error = 'Only Draft or Under Review agreements can be edited directly. Use Amendment or Renewal from the Agreement Detail page.';
					this.form.disable();
				}
				
				this.ensureExistingOptions(agreement);
				
				this.form.patchValue({
					agreement_no: agreement.agreement_no,
					title: agreement.title,
					department_id: agreement.department_id,
					owner_user_id: agreement.owner_user_id,
					counterparty_id: agreement.counterparty_id,
					agreement_category_id: agreement.agreement_category_id,
					agreement_type_id: agreement.agreement_type_id ?? null,
					description: agreement.description ?? '',
					purpose: agreement.purpose ?? '',
					scope: agreement.scope ?? '',
					effective_date: agreement.effective_date ?? null,
					expiry_date: agreement.expiry_date ?? null,
					signed_date: agreement.signed_date ?? null,
					notice_period_days: agreement.notice_period_days ?? null,
					auto_renewal: agreement.auto_renewal,
					contract_value: agreement.contract_value ?? null,
					currency_code: agreement.currency_code || 'MYR',
				});
				this.onCategoryChange(false);
			},
			error: (err: any) => {
				console.error(err);
				this.error = err?.error?.message || 'Failed to load agreement form.';
			},
		});
	}
	
	onCategoryChange(clearType = true): void {
		const categoryId = Number(this.form.get('agreement_category_id')?.value);
		
		this.filteredTypes = this.allTypes.filter(type => Number(type.agreement_category_id) === categoryId);
		
		if (clearType) {
			this.form.patchValue({agreement_type_id: null,});
		}
	}
	
	normaliseAgreementNo(): void {
		const control = this.form.get('agreement_no');
		const value =String(control?.value ?? '').trim().toUpperCase();
		control?.setValue(value);
	}
	
	normaliseCurrency(): void {
		const control = this.form.get('currency_code');
		control?.setValue(String(control.value ?? 'MYR').trim().toUpperCase().slice(0, 3)
		);
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const raw = this.form.getRawValue();
		
		if (raw.effective_date && raw.expiry_date && raw.expiry_date < raw.effective_date) {
			this.error = 'Expiry Date must be on or after Effective Date.';
			return;
		}
		
		const payload = this.buildPayload(raw);
		this.saving = true;
		const request$ = this.isCreate 
		? this.api.createAgreement(payload) 
		: this.api.updateAgreement(this.agreementId!, this.buildChangedPayload(payload));
		
		request$
		.pipe(
			finalize(() => {
				this.saving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.toast.success(this.isCreate ? 'Agreement created as Draft.' : 'Agreement updated.');
				this.router.navigate(['/agreements',result.data.id,]);
			},
			error: (err: any) => {
				console.error(err);
				this.error = this.apiErrorMessage(err);
			},
		});
	}
	
	cancel(): void {
		if (this.agreementId) {
			this.router.navigate(['/agreements', this.agreementId,]);
			return;
		}
		this.router.navigateByUrl('/agreements');
	}
	
	private buildPayload(raw: any): AgreementUpsertPayload {
		return {
			agreement_no: this.nullText(raw.agreement_no),
			title: String(raw.title).trim(),
			department_id: Number(raw.department_id),
			owner_user_id: Number(raw.owner_user_id),
			counterparty_id: Number(raw.counterparty_id),
			agreement_category_id: Number(raw.agreement_category_id),
			agreement_type_id: raw.agreement_type_id ? Number(raw.agreement_type_id) : null,
			description: this.nullText(raw.description),
			purpose: this.nullText(raw.purpose),
			scope: this.nullText(raw.scope),
			effective_date: raw.effective_date || null,
			expiry_date: raw.expiry_date || null,
			signed_date: raw.signed_date || null,
			notice_period_days: raw.notice_period_days === null || raw.notice_period_days === '' ? null : Number(raw.notice_period_days),
			auto_renewal: !!raw.auto_renewal,
			contract_value: raw.contract_value === null || raw.contract_value === '' ? null : Number(raw.contract_value),
			currency_code: String(raw.currency_code || 'MYR').trim().toUpperCase(),
		};
	}
	
	private buildChangedPayload(payload: AgreementUpsertPayload): AgreementUpsertPayload {
		if (!this.original) {
			return payload;
		}
		
		const original:
		AgreementUpsertPayload = {
			agreement_no: this.original.agreement_no,
			title: this.original.title,
			department_id: this.original.department_id,
			owner_user_id: this.original.owner_user_id,
			counterparty_id: this.original.counterparty_id,
			agreement_category_id: this.original.agreement_category_id,
			agreement_type_id: this.original.agreement_type_id ?? null,
			description: this.original.description ?? null,
			purpose: this.original.purpose ?? null,
			scope: this.original.scope ?? null,
			effective_date: this.original.effective_date ?? null,
			expiry_date: this.original.expiry_date ?? null,
			signed_date: this.original.signed_date ?? null,
			notice_period_days: this.original.notice_period_days ?? null,
			auto_renewal: this.original.auto_renewal,
			contract_value: this.original.contract_value === null || this.original.contract_value === undefined ? null : Number(this.original.contract_value),
			currency_code: this.original.currency_code || 'MYR',
		};
		
		const changed:
		AgreementUpsertPayload = {};
		
		for (const key of Object.keys(payload) as Array<keyof AgreementUpsertPayload>) {
			if (JSON.stringify(payload[key]) !== JSON.stringify(original[key])) {
				(changed as any)[key] = payload[key];
			}
		}
		
		return changed;
	}
	
	private applyCurrentUserFallback(response: any): void {
		const me = response?.data ?? response;
		
		if (!me?.id) {
			return;
		}
		
		if (!this.owners.length) {
			this.owners = [
				{
					id: Number(me.id),
					
					name: me.name || 'Current User',
					
					department_id: me.department_id ?? me.department?.id ?? null,
				},
			];
		}
		
		const department = me.department;
		
		if (!this.departments.length && department?.id) {
			this.departments = [
				department,
			];
		}
		
		if (this.isCreate) {
			this.form.patchValue({
				owner_user_id: Number(me.id),
				department_id: me.department_id ?? department?.id ?? null,
			});
		}
		
		if (!this.departments.length || !this.owners.length) {
			this.lookupWarning = 'The complete Department or Owner list is unavailable for your current permissions.';
		}
	}
	
	private ensureExistingOptions(agreement: AgreementDto): void {
		if (agreement.department && !this.departments.some(item => item.id === agreement.department_id)) {
			this.departments.push({
				id: agreement.department.id,
				code: agreement.department.code,
				name: agreement.department.name,
			});
		}
		
		if (agreement.owner && !this.owners.some(item => item.id === agreement.owner_user_id)) {
			this.owners.push({
				id: agreement.owner.id,
				name: agreement.owner.name,
			});
		}
	}
	
	private nullText(value: unknown): string | null {
		const text = String(value ?? '').trim();
		return text || null;
	}
	
	private apiErrorMessage(err: any): string {
		if (err?.status === 409) {
			return (err?.error?.message || 'The agreement cannot be changed in its current lifecycle state.');
		}
		
		if (err?.status === 422) {
			const errors = err?.error?.errors;
			
			if (errors) {
				const key = Object.keys(errors)[0];
				return (errors[key]?.[0] || 'Validation failed.');
			}
		}
		
		return (err?.error?.message || (this.isCreate ? 'Failed to create agreement.' : 'Failed to update agreement.'));
	}
	
	
}