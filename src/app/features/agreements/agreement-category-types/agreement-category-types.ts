import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
	ApiCollection,
	ApiResource,
	ApiService,
	AgreementCategoryDto,
	AgreementCategoryUpsertPayload,
	AgreementTypeDto,
	AgreementTypeUpsertPayload,
} from '../../../core/services/api.service';

import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../shared/ui/toast/toast';

type ManagementTab =
| 'categories'
| 'types';

type ActiveFilter =
| ''
| '1'
| '0';

type ModalMode =
| 'category'
| 'type'
| null;

type CategoryFormModel = {
	code: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

type TypeFormModel = {
	agreement_category_id: number | null;
	code: string;
	name: string;
	description: string;
	sort_order: number;
	is_active: boolean;
};

@Component({
	standalone: true,
	selector: 'app-agreement-category-types',
	imports: [
		CommonModule,
		FormsModule,
	],
	templateUrl: './agreement-category-types.html',
	styleUrls: ['./agreement-category-types.scss'],
})
export class AgreementCategoryTypesComponent
implements OnInit {
	
	activeTab: ManagementTab = 'categories';
	
	canManageCategories = false;
	canManageTypes = false;
	
	categoryLoading = false;
	categoryError: string | null = null;
	categoryRows: AgreementCategoryDto[] = [];
	
	categoryPage = 1;
	categoryPerPage = 20;
	categoryTotal = 0;
	categoryLastPage = 1;
	
	categorySearch = '';
	categoryActiveFilter: ActiveFilter = '';
	
	typeLoading = false;
	typeError: string | null = null;
	typeRows: AgreementTypeDto[] = [];
	
	typePage = 1;
	typePerPage = 20;
	typeTotal = 0;
	typeLastPage = 1;
	
	typeSearch = '';
	typeCategoryFilter: number | null = null;
	typeActiveFilter: ActiveFilter = '';
	
	/*
		* Used by the Type filter and Type form.
		* The category API returns types_count as well.
	*/
	categoryOptions: AgreementCategoryDto[] = [];
	categoryOptionsLoading = false;
	
	modalMode: ModalMode = null;
	saving = false;
	formError: string | null = null;
	
	editingCategoryId: number | null = null;
	editingTypeId: number | null = null;
	
	editingCategoryIsSystem = false;
	editingTypeIsSystem = false;
	
	originalTypeCategoryId: number | null = null;
	
	categoryForm: CategoryFormModel =
	this.emptyCategoryForm();
	
	typeForm: TypeFormModel =
	this.emptyTypeForm();
	
	deactivatingCategoryId: number | null = null;
	reactivatingCategoryId: number | null = null;
	
	deactivatingTypeId: number | null = null;
	reactivatingTypeId: number | null = null;
	
	constructor(
		private api: ApiService,
		private auth: AuthService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.canManageCategories =
		this.auth.hasAnyPermission([
			'system.all',
			'agreements.categories.manage',
		]);
		
		this.canManageTypes =
		this.auth.hasAnyPermission([
			'system.all',
			'agreements.types.manage',
		]);
		
		if (!this.canManageCategories && this.canManageTypes) {
			this.activeTab = 'types';
		}
		
		if (this.canManageCategories) {
			this.loadCategories();
		}
		
		if (this.canManageTypes) {
			this.loadTypes();
			this.loadCategoryOptions();
		}
	}
	
	get modalOpen(): boolean {
		return this.modalMode !== null;
	}
	
	get categoryModalTitle(): string {
		return this.editingCategoryId === null ? 'Add Agreement Category' : 'Edit Agreement Category';
	}
	
	get typeModalTitle(): string {
		return this.editingTypeId === null ? 'Add Agreement Type' : 'Edit Agreement Type';
	}
	
	setTab(tab: ManagementTab): void {
		if (tab === 'categories' && !this.canManageCategories) {
			return;
		}
		
		if (tab === 'types' && !this.canManageTypes) {
			return;
		}
		
		this.activeTab = tab;
		
		if (tab === 'categories' && !this.categoryRows.length ) {
			this.loadCategories();
		}
		
		if (tab === 'types' && !this.typeRows.length) {
			this.loadTypes();
		}
	}
	
	// -------------------------------------------------------------------------
	// Categories
	// -------------------------------------------------------------------------
	
	loadCategories(): void {
		if (!this.canManageCategories) {
			return;
		}
		
		this.categoryLoading = true;
		this.categoryError = null;
		
		this.api.getAgreementCategories({
			search: this.categorySearch.trim() || undefined,
			is_active: this.activeFilterValue(this.categoryActiveFilter),
			page: this.categoryPage,
			per_page: this.categoryPerPage,
		})
		.pipe(
			finalize(() => {
				this.categoryLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiCollection<AgreementCategoryDto>
				) => {
				this.categoryRows = res.data ?? [];
				this.categoryTotal = res.meta?.total ?? this.categoryRows.length;
				this.categoryLastPage = res.meta?.last_page ?? 1;
				this.categoryPage = res.meta?.current_page ?? this.categoryPage;
			},
			error: (err: any) => {
				console.error(err);
				
				this.categoryError = err?.error?.message || 'Failed to load agreement categories.';
			},
		});
	}
	
	applyCategoryFilters(): void {
		this.categoryPage = 1;
		this.loadCategories();
	}
	
	resetCategoryFilters(): void {
		this.categorySearch = '';
		this.categoryActiveFilter = '';
		this.categoryPage = 1;
		
		this.loadCategories();
	}
	
	changeCategoryPage(nextPage: number): void {
		if (nextPage < 1 || nextPage > this.categoryLastPage) {
			return;
		}
		
		this.categoryPage = nextPage;
		this.loadCategories();
	}
	
	openCreateCategory(): void {
		this.modalMode = 'category';
		this.editingCategoryId = null;
		this.editingCategoryIsSystem = false;
		this.formError = null;
		
		this.categoryForm =
		this.emptyCategoryForm();
	}
	
	openEditCategory(
		category: AgreementCategoryDto
		): void {
		this.modalMode = 'category';
		this.editingCategoryId = category.id;
		
		this.editingCategoryIsSystem = category.is_system_category;
		
		this.formError = null;
		
		this.categoryForm = {
			code: category.code,
			name: category.name,
			description: category.description ?? '',
			sort_order: category.sort_order ?? 0,
			is_active: category.is_active,
		};
	}
	
	saveCategory(): void {
		this.formError = null;
		
		const payload =
		this.buildCategoryPayload();
		
		if (!payload) {
			this.cdr.detectChanges();
			return;
		}
		
		this.saving = true;
		
		const isCreate =
		this.editingCategoryId === null;
		
		const request$ = isCreate ? this.api.createAgreementCategory( payload )
		: this.api.updateAgreementCategory(
			this.editingCategoryId!,
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
				_res: ApiResource<AgreementCategoryDto>
				) => {
				this.toast.success(
					isCreate
					? 'Agreement category created.'
					: 'Agreement category updated.'
				);
				
				this.closeModal();
				this.loadCategories();
				this.loadCategoryOptions();
				
				/*
					* Category name changes are also shown
					* in the Agreement Types tab.
				*/
				if (this.canManageTypes) {
					this.loadTypes();
				}
			},
			error: (err: any) => {
				console.error(err);
				
				this.formError =
				this.apiErrorMessage(
					err,
					isCreate
					? 'Failed to create agreement category.'
					: 'Failed to update agreement category.'
				);
			},
		});
	}
	
	deactivateCategory(
		category: AgreementCategoryDto
		): void {
		if (category.is_system_category || this.deactivatingCategoryId !== null) {
			return;
		}
		
		const confirmed = window.confirm(
			`Deactivate agreement category "${category.name}"?\n\n` +
			'The category cannot be deactivated while it still contains active agreement types.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.deactivatingCategoryId =
		category.id;
		
		this.api.deactivateAgreementCategory(
			category.id
		)
		.pipe(
			finalize(() => {
				this.deactivatingCategoryId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Agreement category deactivated.'
				);
				
				this.loadCategories();
				this.loadCategoryOptions();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					this.apiErrorMessage(err, 'Failed to deactivate agreement category.')
				);
			},
		});
	}
	
	reactivateCategory(
		category: AgreementCategoryDto
		): void {
		if (category.is_system_category || this.reactivatingCategoryId !== null) {
			return;
		}
		
		this.reactivatingCategoryId = category.id;
		
		this.api.updateAgreementCategory(
			category.id,
			{
				is_active: true,
			}
		)
		.pipe(
			finalize(() => {
				this.reactivatingCategoryId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Agreement category reactivated.'
				);
				
				this.loadCategories();
				this.loadCategoryOptions();
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					err?.error?.message ||
					'Failed to reactivate agreement category.'
				);
			},
		});
	}
	
	// -------------------------------------------------------------------------
	// Types
	// -------------------------------------------------------------------------
	
	loadTypes(): void {
		if (!this.canManageTypes) {
			return;
		}
		
		this.typeLoading = true;
		this.typeError = null;
		
		this.api.getAgreementTypes({
			search: this.typeSearch.trim() || undefined,
			agreement_category_id: this.typeCategoryFilter ?? undefined,
			is_active: this.activeFilterValue(this.typeActiveFilter),
			page: this.typePage,
			per_page: this.typePerPage,
		})
		.pipe(
			finalize(() => {
				this.typeLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiCollection<AgreementTypeDto>
				) => {
				this.typeRows =res.data ?? [];
				this.typeTotal = res.meta?.total ?? this.typeRows.length;
				this.typeLastPage = res.meta?.last_page ?? 1;
				this.typePage = res.meta?.current_page ?? this.typePage;
			},
			error: (err: any) => {
				console.error(err);
				
				this.typeError = err?.error?.message || 'Failed to load agreement types.';
			},
		});
	}
	
	applyTypeFilters(): void {
		this.typePage = 1;
		this.loadTypes();
	}
	
	resetTypeFilters(): void {
		this.typeSearch = '';
		this.typeCategoryFilter = null;
		this.typeActiveFilter = '';
		this.typePage = 1;
		
		this.loadTypes();
	}
	
	changeTypePage(nextPage: number): void {
		if (nextPage < 1 || nextPage > this.typeLastPage) {
			return;
		}
		
		this.typePage = nextPage;
		this.loadTypes();
	}
	
	loadCategoryOptions(): void {
		this.categoryOptionsLoading = true;
		
		this.api.getAgreementCategories({
			per_page: 100,
		})
		.pipe(
			finalize(() => {
				this.categoryOptionsLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (
				res: ApiCollection<AgreementCategoryDto>
				) => {
				this.categoryOptions =
				res.data ?? [];
			},
			error: (err: any) => {
				console.error(err);
				
				this.categoryOptions = [];
				
				this.toast.error('Failed to load agreement category options.');
			},
		});
	}
	
	openCreateType(): void {
		this.modalMode = 'type';
		this.editingTypeId = null;
		this.editingTypeIsSystem = false;
		this.originalTypeCategoryId = null;
		this.formError = null;
		
		this.typeForm =
		this.emptyTypeForm();
		
		const firstActiveCategory =
		this.categoryOptions.find(
			category => category.is_active
		);
		
		if (firstActiveCategory) {
			this.typeForm.agreement_category_id =
			firstActiveCategory.id;
		}
	}
	
	openEditType(
		type: AgreementTypeDto
		): void {
		this.modalMode = 'type';
		this.editingTypeId = type.id;
		
		this.editingTypeIsSystem =
		type.is_system_type;
		
		this.originalTypeCategoryId =
		type.agreement_category_id ??
		null;
		
		this.formError = null;
		
		this.typeForm = {
			agreement_category_id: type.agreement_category_id ?? null,
			code: type.code,
			name: type.name,
			description: type.description ?? '',
			sort_order: type.sort_order ?? 0,
			is_active: type.is_active,
		};
	}
	
	saveType(): void {
		this.formError = null;
		
		const payload =
		this.buildTypePayload();
		
		if (!payload) {
			this.cdr.detectChanges();
			return;
		}
		
		this.saving = true;
		
		const isCreate =
		this.editingTypeId === null;
		
		const request$ = isCreate
		? this.api.createAgreementType(
			payload
		)
		: this.api.updateAgreementType(
			this.editingTypeId!,
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
				_res: ApiResource<AgreementTypeDto>
				) => {
				this.toast.success(
					isCreate
					? 'Agreement type created.'
					: 'Agreement type updated.'
				);
				
				this.closeModal();
				this.loadTypes();
				
				if (this.canManageCategories) {
					this.loadCategories();
				}
				
				this.loadCategoryOptions();
			},
			error: (err: any) => {
				console.error(err);
				
				this.formError =
				this.apiErrorMessage(
					err,
					isCreate
					? 'Failed to create agreement type.'
					: 'Failed to update agreement type.'
				);
			},
		});
	}
	
	deactivateType(
		type: AgreementTypeDto
		): void {
		if (type.is_system_type || this.deactivatingTypeId !== null) {
			return;
		}
		
		const confirmed = window.confirm(
			`Deactivate agreement type "${type.name}"?\n\n` +
			'The record will remain available for historical agreements.'
		);
		
		if (!confirmed) {
			return;
		}
		
		this.deactivatingTypeId =
		type.id;
		
		this.api.deactivateAgreementType(
			type.id
		)
		.pipe(
			finalize(() => {
				this.deactivatingTypeId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Agreement type deactivated.'
				);
				
				this.loadTypes();
				
				if (this.canManageCategories) {
					this.loadCategories();
				}
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to deactivate agreement type.'
					)
				);
			},
		});
	}
	
	reactivateType(
		type: AgreementTypeDto
		): void {
		if (type.is_system_type || this.reactivatingTypeId !== null) {
			return;
		}
		
		this.reactivatingTypeId =
		type.id;
		
		this.api.updateAgreementType(
			type.id,
			{
				is_active: true,
			}
		)
		.pipe(
			finalize(() => {
				this.reactivatingTypeId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Agreement type reactivated.');
				this.loadTypes();
				
				if (this.canManageCategories) {
					this.loadCategories();
				}
			},
			error: (err: any) => {
				console.error(err);
				
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to reactivate agreement type.'
					)
				);
			},
		});
	}
	
	categoryOptionDisabled(
		category: AgreementCategoryDto
		): boolean {
		if (category.is_active) {
			return false;
		}
		
		/*
			* Keep an inactive current category visible while
			* editing. The category field is omitted from the
			* update request when it has not changed.
		*/
		return (category.id !== this.originalTypeCategoryId);
	}
	
	categoryLabel(
		type: AgreementTypeDto
		): string {
		if (type.category) {
			return (
				`${type.category.code} - ` +
				type.category.name
			);
		}
		
		if (type.agreement_category_id) {
			return (
				`Category #` +
				type.agreement_category_id
			);
		}
		
		return '-';
	}
	
	// -------------------------------------------------------------------------
	// Shared modal and form helpers
	// -------------------------------------------------------------------------
	
	closeModal(): void {
		if (this.saving) {
			return;
		}
		
		this.modalMode = null;
		this.formError = null;
		
		this.editingCategoryId = null;
		this.editingTypeId = null;
		
		this.editingCategoryIsSystem = false;
		this.editingTypeIsSystem = false;
		
		this.originalTypeCategoryId = null;
		
		this.categoryForm =
		this.emptyCategoryForm();
		
		this.typeForm =
		this.emptyTypeForm();
	}
	
	normaliseCategoryCode(): void {
		this.categoryForm.code =
		this.normaliseCode(
			this.categoryForm.code
		);
	}
	
	normaliseTypeCode(): void {
		this.typeForm.code = this.normaliseCode(this.typeForm.code);
	}
	
	private emptyCategoryForm():
	CategoryFormModel {
		return {
			code: '',
			name: '',
			description: '',
			sort_order: 0,
			is_active: true,
		};
	}
	
	private emptyTypeForm():
	TypeFormModel {
		return {
			agreement_category_id: null,
			code: '',
			name: '',
			description: '',
			sort_order: 0,
			is_active: true,
		};
	}
	
	private buildCategoryPayload():
	AgreementCategoryUpsertPayload | null {
		const code = this.normaliseCode(this.categoryForm.code);
		const name = this.categoryForm.name.trim();
		
		if (!code) {
			this.formError = 'Category Code is required.';
			return null;
		}
		
		if (!this.isValidCode(code)) {
			this.formError = 'Category Code must begin with a letter and contain only uppercase letters, numbers and underscores.';
			return null;
		}
		
		if (!name) {
			this.formError = 'Category Name is required.';
			return null;
		}
		
		if (code.length > 60) {
			this.formError = 'Category Code cannot exceed 60 characters.';
			return null;
		}
		
		if (name.length > 150) {
			this.formError = 'Category Name cannot exceed 150 characters.';
			return null;
		}
		
		const payload: AgreementCategoryUpsertPayload = {
			name,
			description: this.nullText(this.categoryForm.description),
			sort_order: this.nonNegativeInteger(this.categoryForm.sort_order),
			is_active: this.editingCategoryIsSystem ? true : this.categoryForm.is_active,
		};
		
		/*
			* System category codes cannot be changed.
		*/
		if (!this.editingCategoryIsSystem) {
			payload.code = code;
		}
		
		return payload;
	}
	
	private buildTypePayload():
	AgreementTypeUpsertPayload | null {
		const code =
		this.normaliseCode(
			this.typeForm.code
		);
		
		const name =
		this.typeForm.name.trim();
		
		if (this.editingTypeId === null && !this.typeForm.agreement_category_id ) {
			this.formError = 'Agreement Category is required.';
			return null;
		}
		
		if (!code) {
			this.formError = 'Type Code is required.';
			return null;
		}
		
		if (!this.isValidCode(code)) {
			this.formError = 'Type Code must begin with a letter and contain only uppercase letters, numbers and underscores.';
			return null;
		}
		
		if (!name) {
			this.formError = 'Type Name is required.';
			return null;
		}
		
		if (code.length > 60) {
			this.formError = 'Type Code cannot exceed 60 characters.';
			return null;
		}
		
		if (name.length > 150) {
			this.formError = 'Type Name cannot exceed 150 characters.';
			return null;
		}
		
		const payload:
		AgreementTypeUpsertPayload = {
			name,
			description:
			this.nullText(
				this.typeForm.description
			),
			
			sort_order:
			this.nonNegativeInteger(
				this.typeForm.sort_order
			),
			
			is_active:
			this.editingTypeIsSystem
			? true
			: this.typeForm.is_active,
		};
		
		if (!this.editingTypeIsSystem) {
			payload.code = code;
		}
		
		/*
			* Category is required during creation.
			* During update it is only sent when changed.
			*
			* This prevents an unrelated update from failing
			* when a historical type currently belongs to an
			* inactive category.
		*/
		if (this.editingTypeId === null || this.typeForm.agreement_category_id !== this.originalTypeCategoryId) {
			payload.agreement_category_id = this.typeForm.agreement_category_id;
		}
		
		return payload;
	}
	
	private activeFilterValue(filter: ActiveFilter): boolean | undefined {
		if (filter === '') {
			return undefined;
		}
		
		return filter === '1';
	}
	
	private normaliseCode(value: string): string {
		return value.trim().toUpperCase().replace(
			/[^A-Z0-9]+/g,
			'_'
		).replace(
			/^_+|_+$/g,
			''
		).slice(0, 60);
	}
	
	private isValidCode(value: string): boolean {
		return /^[A-Z][A-Z0-9_]*$/.test(value);
	}
	
	private nullText(value: string): string | null {
		const trimmed = value.trim();
		return trimmed || null;
	}
	
	private nonNegativeInteger(value: unknown): number {
		const parsed = Number(value);
		if (!Number.isFinite(parsed) || parsed < 0 ) {
			return 0;
		}
		return Math.floor(parsed);
	}
	
	private apiErrorMessage(err: any, fallback: string): string {
		if (err?.status === 409) {
			return (err?.error?.message || 'The record is currently in use.');
		}
		
		if (err?.status === 422) {
			const errors = err?.error?.errors;
			
			if (errors) {
				const firstKey = Object.keys(errors)[0];
				
				return (errors[firstKey]?.[0] || err?.error?.message || 'Validation failed.');
			}
			
			return (err?.error?.message || 'Validation failed.');
		}
		
		return (err?.error?.message || fallback);
	}
}