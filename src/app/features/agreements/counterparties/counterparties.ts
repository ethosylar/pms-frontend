import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
	ApiCollection,
	ApiResource,
	ApiService,
	CounterpartyDto,
	CounterpartyType,
	CounterpartyUpsertPayload,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

type ActiveFilter = '' | '1' | '0';

type CounterpartyFormModel = {
	code: string;
	counterparty_type: CounterpartyType;
	
	legal_name: string;
	trading_name: string;
	
	registration_no: string;
	tax_no: string;
	vendor_no: string;
	
	contact_person: string;
	contact_position: string;
	email: string;
	phone: string;
	alternate_phone: string;
	
	address_line_1: string;
	address_line_2: string;
	city: string;
	state: string;
	postcode: string;
	country: string;
	
	notes: string;
	is_active: boolean;
};

@Component({
	standalone: true,
	selector: 'app-counterparties',
	imports: [
		CommonModule,
		FormsModule,
	],
	templateUrl: './counterparties.html',
	styleUrls: ['./counterparties.scss'],
})
export class CounterpartiesComponent implements OnInit {
	loading = true;
	saving = false;
	
	error: string | null = null;
	formError: string | null = null;
	
	rows: CounterpartyDto[] = [];
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	search = '';
	typeFilter: CounterpartyType | '' = '';
	activeFilter: ActiveFilter = '1';
	
	modalOpen = false;
	editingId: number | null = null;
	
	deactivatingId: number | null = null;
	reactivatingId: number | null = null;
	
	form: CounterpartyFormModel =
	this.emptyForm();
	
	readonly counterpartyTypes: Array<{
		value: CounterpartyType;
		label: string;
		}> = [
		{
			value: 'COMPANY',
			label: 'Company',
		},
		{
			value: 'VENDOR',
			label: 'Vendor',
		},
		{
			value: 'GOVERNMENT_AGENCY',
			label: 'Government Agency',
		},
		{
			value: 'INDIVIDUAL',
			label: 'Individual',
		},
		{
			value: 'OTHER',
			label: 'Other',
		},
	];
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	get isCreate(): boolean {
		return this.editingId === null;
	}
	
	get modalTitle(): string {
		return this.isCreate ? 'Add Counterparty' : 'Edit Counterparty';
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getCounterparties({
			search: this.search.trim() || undefined,
			counterparty_type: this.typeFilter || undefined,
			is_active: this.activeFilter === '' ? undefined : this.activeFilter === '1',
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiCollection<CounterpartyDto>) => {
				this.rows = res.data ?? [];
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.page = res.meta?.current_page ?? this.page;
			},
			error: (err: any) => {
				console.error(err);
				this.error = err?.error?.message || 'Failed to load counterparties.';
			},
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	resetFilters(): void {
		this.search = '';
		this.typeFilter = '';
		this.activeFilter = '1';
		this.page = 1;
		
		this.fetch();
	}
	
	changePage(nextPage: number): void {
		if (nextPage < 1 || nextPage > this.lastPage) {
			return;
		}
		
		this.page = nextPage;
		this.fetch();
	}
	
	openCreate(): void {
		this.editingId = null;
		this.formError = null;
		this.form = this.emptyForm();
		this.modalOpen = true;
	}
	
	openEdit(
		row: CounterpartyDto
		): void {
		this.editingId = row.id;
		this.formError = null;
		
		this.form = {
			code: row.code ?? '',
			counterparty_type: row.counterparty_type,
			legal_name: row.legal_name ?? '',
			trading_name: row.trading_name ?? '',
			registration_no: row.registration_no ?? '',
			tax_no: row.tax_no ?? '',
			vendor_no: row.vendor_no ?? '',
			contact_person: row.contact_person ?? '',
			contact_position: row.contact_position ?? '',
			email: row.email ?? '',
			phone: row.phone ?? '',
			alternate_phone: row.alternate_phone ?? '',
			address_line_1: row.address_line_1 ?? '',
			address_line_2: row.address_line_2 ?? '',
			city: row.city ?? '',
			state: row.state ?? '',
			postcode: row.postcode ?? '',
			country: row.country ?? 'Malaysia',
			notes: row.notes ?? '',
			is_active: row.is_active,
		};
		
		this.modalOpen = true;
	}
	
	closeModal(): void {
		if (this.saving) {
			return;
		}
		
		this.modalOpen = false;
		this.editingId = null;
		this.formError = null;
		this.form = this.emptyForm();
	}
	
	normaliseCodeField(): void {
		this.form.code =
		this.normaliseCode(
			this.form.code
		);
	}
	
	save(): void {
		this.formError = null;
		
		const payload = this.buildPayload();
		
		if (!payload) {
			this.cdr.detectChanges();
			return;
		}
		
		this.saving = true;
		
		const request$ = 
		this.editingId === null ? this.api.createCounterparty( payload )
		: this.api.updateCounterparty(
			this.editingId,
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
				_res: ApiResource<CounterpartyDto>
				) => {
				this.toast.success(
					this.isCreate ? 'Counterparty created.' : 'Counterparty updated.'
				);
				
				this.modalOpen = false;
				this.editingId = null;
				this.form = this.emptyForm();
				
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				
				this.formError =
				this.apiErrorMessage(
					err,
					this.isCreate ? 'Failed to create counterparty.' : 'Failed to update counterparty.'
				);
			},
		});
	}
	
	deactivate(
		row: CounterpartyDto
		): void {
		if (
			this.deactivatingId !== null
			) {
			return;
		}
		
		const confirmed = window.confirm(
			`Deactivate "${row.legal_name}"?\n\n` +
			'The counterparty will remain in the database and can be reactivated later.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.deactivatingId = row.id;
		
		this.api.deactivateCounterparty(
			row.id
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
					'Counterparty deactivated.'
				);
				
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to deactivate counterparty.'
				);
			},
		});
	}
	
	reactivate(
		row: CounterpartyDto
		): void {
		if (this.reactivatingId !== null) {
			return;
		}
		
		this.reactivatingId = row.id;
		
		this.api.updateCounterparty(row.id,{ is_active: true, })
		.pipe(
			finalize(() => {
				this.reactivatingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Counterparty reactivated.');
				this.fetch();
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(err?.error?.message || 'Failed to reactivate counterparty.');
			},
		});
	}
	
	typeLabel(
		type?: CounterpartyType | null
		): string {
		return (
			this.counterpartyTypes.find(
				item => item.value === type
			)?.label ??
			type ??
			'-'
		);
	}
	
	typeBadgeClass(
		type?: CounterpartyType | null
		): string {
		switch (type) {
			case 'COMPANY':
			return 'bg-primary';
			
			case 'VENDOR':
			return 'bg-success';
			
			case 'GOVERNMENT_AGENCY':
			return 'bg-info text-dark';
			
			case 'INDIVIDUAL':
			return 'bg-warning text-dark';
			
			default:
			return 'bg-secondary';
		}
	}
	
	locationLabel(
		row: CounterpartyDto
		): string {
		const parts = [
			row.city,
			row.state,
			row.country,
		]
		.filter((value): value is string => !! value);
		
		return parts.join(', ') || '-';
	}
	
	private emptyForm():
	CounterpartyFormModel {
		return {
			code: '',
			counterparty_type: 'COMPANY',
			
			legal_name: '',
			trading_name: '',
			
			registration_no: '',
			tax_no: '',
			vendor_no: '',
			
			contact_person: '',
			contact_position: '',
			email: '',
			phone: '',
			alternate_phone: '',
			
			address_line_1: '',
			address_line_2: '',
			city: '',
			state: '',
			postcode: '',
			country: 'Malaysia',
			
			notes: '',
			is_active: true,
		};
	}
	
	private buildPayload():
	CounterpartyUpsertPayload | null {
		const legalName =
		this.form.legal_name.trim();
		
		if (!legalName) {
			this.formError = 'Legal Name is required.';
			return null;
		}
		
		const code = this.normaliseCode(this.form.code);
		
		if (code && !/^[A-Z0-9][A-Z0-9_-]*$/.test(code)) {
			this.formError = 'Code can contain only uppercase letters, numbers, hyphens and underscores.';
			return null;
		}
		
		if (this.form.email.trim() && !this.isValidEmail(this.form.email.trim())) {
			this.formError = 'Enter a valid email address.';
			return null;
		}
		
		const payload:
		CounterpartyUpsertPayload = {
			counterparty_type:
			this.form.counterparty_type,
			
			legal_name:
			legalName,
			
			trading_name:
			this.nullText(
				this.form.trading_name
			),
			
			registration_no:
			this.nullText(
				this.form.registration_no
			),
			
			tax_no:
			this.nullText(
				this.form.tax_no
			),
			
			vendor_no:
			this.nullText(
				this.form.vendor_no
			),
			
			contact_person:
			this.nullText(
				this.form.contact_person
			),
			
			contact_position:
			this.nullText(
				this.form.contact_position
			),
			
			email:
			this.nullText(
				this.form.email
			),
			
			phone:
			this.nullText(
				this.form.phone
			),
			
			alternate_phone:
			this.nullText(
				this.form.alternate_phone
			),
			
			address_line_1:
			this.nullText(
				this.form.address_line_1
			),
			
			address_line_2:
			this.nullText(
				this.form.address_line_2
			),
			
			city:
			this.nullText(
				this.form.city
			),
			
			state:
			this.nullText(
				this.form.state
			),
			
			postcode:
			this.nullText(
				this.form.postcode
			),
			
			country:
			this.nullText(
				this.form.country
			),
			
			notes:
			this.nullText(
				this.form.notes
			),
			
			is_active:
			this.form.is_active,
		};
		
		/*
			* Code is optional during creation.
			* The backend generates it when it is omitted.
		*/
		if (code) {
			payload.code = code;
		}
		
		return payload;
	}
	
	private normaliseCode(
		value: string
		): string {
		return value
		.trim()
		.toUpperCase()
		.replace(
			/[^A-Z0-9_-]+/g,
			'-'
		)
		.replace(
			/^[^A-Z0-9]+/,
			''
		)
		.slice(0, 50);
	}
	
	private nullText(
		value: string
		): string | null {
		const trimmed = value.trim();
		
		return trimmed || null;
	}
	
	private isValidEmail(
		value: string
		): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
			value
		);
	}
	
	private apiErrorMessage(
		err: any,
		fallback: string
		): string {
		if (err?.status === 409) {
			const existing =
			err?.error?.details
			?.existing_counterparty ??
			err?.error?.data
			?.existing_counterparty ??
			err?.error
			?.existing_counterparty;
			
			if (existing) {
				return (
					'A counterparty with the same legal name ' +
					'or registration number already exists: ' +
					`${existing.code ?? ''} ` +
					`${existing.legal_name ?? ''}` +
					(
						existing.is_active === false
						? ' (Inactive)'
						: ''
					)
				).trim();
			}
			
			return (err?.error?.message || 'A counterparty with the same legal name or registration number already exists.');
		}
		
		if (err?.status === 422) {
			const errors =
			err?.error?.errors;
			
			if (errors) {
				const firstKey = Object.keys(errors)[0];
				
				return (errors[firstKey]?.[0] || err?.error?.message || 'Validation failed.');
			}
			
			return (err?.error?.message || 'Validation failed.');
		}
		
		return (err?.error?.message || fallback);
	}
}