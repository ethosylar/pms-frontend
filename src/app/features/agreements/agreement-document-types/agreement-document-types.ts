import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
	AgreementDocumentTypeDto,
	AgreementDocumentTypeUpsertPayload,
	ApiService,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

type BooleanFilter = '' | '1' | '0';

@Component({
	standalone: true,
	selector: 'app-agreement-document-types',
	imports: [
		CommonModule,
		FormsModule,
	],
	templateUrl: './agreement-document-types.html',
	styleUrls: ['./agreement-document-types.scss'],
})
export class AgreementDocumentTypesComponent
implements OnInit {
	
	loading = true;
	saving = false;
	
	error: string | null = null;
	formError: string | null = null;
	
	rows: AgreementDocumentTypeDto[] = [];
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	search = '';
	activeFilter: BooleanFilter = '';
	ocrFilter: BooleanFilter = '';
	
	modalOpen = false;
	editingId: number | null = null;
	editingSystemType = false;
	
	deactivatingId: number | null = null;
	reactivatingId: number | null = null;
	
	form = {
		code: '',
		name: '',
		description: '',
		ocr_eligible: true,
		sort_order: 0,
		is_active: true,
	};
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getAgreementDocumentTypes({
			search: this.search.trim() || undefined,
			is_active: this.booleanValue(this.activeFilter),
			ocr_eligible: this.booleanValue(this.ocrFilter),
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
			next: result => {
				this.rows = result.data ?? [];
				this.total = result.meta?.total ?? this.rows.length;
				this.lastPage = result.meta?.last_page ?? 1;
			},
			error: (err: any) => {
				this.error = err?.error?.message || 'Failed to load agreement document types.';
			},
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	resetFilters(): void {
		this.search = '';
		this.activeFilter = '';
		this.ocrFilter = '';
		this.page = 1;
		
		this.fetch();
	}
	
	changePage(next: number): void {
		if (next < 1 || next > this.lastPage) {
			return;
		}
		this.page = next;
		this.fetch();
	}
	
	openCreate(): void {
		this.modalOpen = true;
		this.editingId = null;
		this.editingSystemType = false;
		this.formError = null;
		
		this.form = {
			code: '',
			name: '',
			description: '',
			ocr_eligible: true,
			sort_order: 0,
			is_active: true,
		};
	}
	
	openEdit(row: AgreementDocumentTypeDto): void {
		this.modalOpen = true;
		this.editingId = row.id;
		this.editingSystemType = row.is_system_type;
		this.formError = null;
		
		this.form = {
			code: row.code,
			name: row.name,
			description: row.description ?? '',
			ocr_eligible: row.ocr_eligible,
			sort_order: row.sort_order,
			is_active: row.is_active,
		};
	}
	
	closeModal(): void {
		if (this.saving) {
			return;
		}
		this.modalOpen = false;
		this.formError = null;
	}
	
	normaliseCode(): void {
		this.form.code = this.form.code
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 60);
	}
	
	save(): void {
		this.formError = null;
		this.normaliseCode();
		
		if (!this.form.code || !/^[A-Z][A-Z0-9_]*$/.test(this.form.code)) {
			this.formError = 'Code must begin with a letter and contain only uppercase letters, numbers and underscores.';
			return;
		}
		
		if (!this.form.name.trim()) {
			this.formError = 'Name is required.';
			return;
		}
		
		const payload:
		AgreementDocumentTypeUpsertPayload = {
			name: this.form.name.trim(),
			description: this.form.description.trim() || null,
			ocr_eligible: this.form.ocr_eligible,
			sort_order: Math.max(0, Math.floor(Number(this.form.sort_order) || 0)),
			is_active: this.editingSystemType ? true : this.form.is_active,
		};
		
		if (!this.editingSystemType) {
			payload.code = this.form.code;
		}
		
		this.saving = true;
		const request$ = this.editingId === null ? this.api.createAgreementDocumentType(payload)
		: this.api.updateAgreementDocumentType(
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
			next: () => {
				this.toast.success(this.editingId === null ? 'Document type created.' : 'Document type updated.');
				this.closeModal();
				this.fetch();
			},
			error: (err: any) => {
				this.formError = this.apiErrorMessage(err);
			},
		});
	}
	
	deactivate(row: AgreementDocumentTypeDto): void {
		if (row.is_system_type || !window.confirm(`Deactivate document type "${row.name}"?`)) {
			return;
		}
		
		this.deactivatingId = row.id;
		this.api.deactivateAgreementDocumentType(row.id)
		.pipe(
			finalize(() => {
				this.deactivatingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Document type deactivated.');
				this.fetch();
			},
			error: (err: any) => {
				this.toast.error(err?.error?.message || 'Failed to deactivate document type.');
			},
		});
	}
	
	reactivate(row: AgreementDocumentTypeDto): void {
		this.reactivatingId = row.id;
		this.api.updateAgreementDocumentType(row.id, { is_active: true, })
		.pipe(
			finalize(() => {
				this.reactivatingId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Document type reactivated.');
				this.fetch();
			},
			error: (err: any) => {
				this.toast.error(err?.error?.message || 'Failed to reactivate document type.');
			},
		});
	}
	
	private booleanValue(value: BooleanFilter): boolean | undefined {
		if (value === '') {
			return undefined;
		}
		
		return value === '1';
	}
	
	private apiErrorMessage(err: any): string {
		if (err?.status === 422 && err?.error?.errors) {
			const key = Object.keys(err.error.errors)[0];
			return (err.error.errors[key]?.[0] || 'Validation failed.');
		}
		return (err?.error?.message || 'Failed to save document type.');
	}
}