import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, } from '@angular/router';
import { catchError, finalize, } from 'rxjs/operators';
import { forkJoin, of, } from 'rxjs';

import {
	AgreementCategoryDto,
	AgreementDto,
	AgreementLifecycleType,
	AgreementQueryParams,
	AgreementTypeDto,
	ApiCollection,
	ApiService,
	CounterpartyDto,
	DepartmentDto,
	UserDto,
} from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth';

type BooleanFilter = '' | '1' | '0';

@Component({
	standalone: true,
	selector: 'app-agreements',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './agreements.html',
	styleUrls: ['./agreements.scss'],
})
export class AgreementsComponent implements OnInit {
	loading = true;
	loadingLookups = true;
	
	error: string | null = null;
	
	rows: AgreementDto[] = [];
	
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	showAdvancedFilters = false;
	
	search = '';
	departmentId: number | null = null;
	ownerUserId: number | null = null;
	counterpartyId: number | null = null;
	categoryId: number | null = null;
	typeId: number | null = null;
	statusCode = '';
	lifecycleType: AgreementLifecycleType | '' = '';
	
	effectiveFrom = '';
	effectiveTo = '';
	expiryFrom = '';
	expiryTo = '';
	
	currentVersionFilter: BooleanFilter = '';
	includeArchived = false;
	
	departments: DepartmentDto[] = [];
	owners: UserDto[] = [];
	counterparties: CounterpartyDto[] = [];
	categories: AgreementCategoryDto[] = [];
	types: AgreementTypeDto[] = [];
	
	readonly statuses = [
		{ code: '', name: 'All Statuses' },
		{ code: 'DRAFT', name: 'Draft' },
		{ code: 'UNDER_REVIEW', name: 'Under Review' },
		{ code: 'PENDING_APPROVAL', name: 'Pending Approval' },
		{ code: 'APPROVED', name: 'Approved' },
		{ code: 'ACTIVE', name: 'Active' },
		{ code: 'EXPIRING_SOON', name: 'Expiring Soon' },
		{ code: 'EXPIRED', name: 'Expired' },
		{ code: 'RENEWED', name: 'Renewed' },
		{ code: 'TERMINATED', name: 'Terminated' },
		{ code: 'ARCHIVED', name: 'Archived' },
		{ code: 'CANCELLED', name: 'Cancelled' },
	];
	
	constructor(
		private api: ApiService,
		private auth: AuthService,
		private router: Router,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		this.loadLookups();
		this.fetch();
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
	
	loadLookups(): void {
		this.loadingLookups = true;
		
		forkJoin({
			departments:
			this.api.getDepartments({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<DepartmentDto>)
				)
			),
			
			owners:
			this.api.getUsers({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<UserDto>)
				)
			),
			
			counterparties:
			this.api.getCounterparties({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<CounterpartyDto>)
				)
			),
			
			categories:
			this.api.getAgreementCategories({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<AgreementCategoryDto>)
				)
			),
			
			types:
			this.api.getAgreementTypes({
				per_page: 100,
			})
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<AgreementTypeDto>)
				)
			),
		})
		.pipe(
			finalize(() => {
				this.loadingLookups = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe(result => {
			this.departments = result.departments.data ?? [];
			
			this.owners = result.owners.data ?? [];
			
			this.counterparties = result.counterparties.data ?? [];
			
			this.categories = result.categories.data ?? [];
			
			this.types = result.types.data ?? [];
		});
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		const params: AgreementQueryParams = {
			search:
			this.search.trim() || undefined,
			department_id: this.departmentId ?? undefined,
			owner_user_id: this.ownerUserId ?? undefined,
			counterparty_id: this.counterpartyId ?? undefined,
			agreement_category_id: this.categoryId ?? undefined,
			agreement_type_id: this.typeId ?? undefined,
			status_code: this.statusCode || undefined,
			lifecycle_type: this.lifecycleType || undefined,
			effective_from: this.effectiveFrom || undefined,
			effective_to: this.effectiveTo || undefined,
			expiry_from: this.expiryFrom || undefined,
			expiry_to: this.expiryTo || undefined,
			is_current_version:
			this.booleanFilterValue(
				this.currentVersionFilter
			),
			include_archived: this.includeArchived,
			page: this.page,
			per_page: this.perPage,
		};
		
		this.api.getAgreements(params)
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
				this.page = result.meta?.current_page ?? this.page;
			},
			error: (err: any) => {
				console.error(err);
				this.error = err?.error?.message || 'Failed to load agreements.';
			},
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	resetFilters(): void {
		this.search = '';
		this.departmentId = null;
		this.ownerUserId = null;
		this.counterpartyId = null;
		this.categoryId = null;
		this.typeId = null;
		this.statusCode = '';
		this.lifecycleType = '';
		
		this.effectiveFrom = '';
		this.effectiveTo = '';
		this.expiryFrom = '';
		this.expiryTo = '';
		
		this.currentVersionFilter = '1';
		this.includeArchived = false;
		
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
	
	view(row: AgreementDto): void {
		this.router.navigate(['/agreements',row.id,]);
	}
	
	create(): void {
		this.router.navigate(['/agreements/new',]);
	}
	
	edit(row: AgreementDto): void {
		this.router.navigate(['/agreements',row.id,'edit',]);
	}
	
	isDirectlyEditable(row: AgreementDto): boolean {
		return (this.canEdit() && [
				'DRAFT',
				'UNDER_REVIEW',
				].includes(row.status?.code ?? ''));
	}
	
	statusBadgeClass(
		code?: string | null
		): string {
		switch (code) {
			case 'ACTIVE':
			return 'bg-success';
			
			case 'APPROVED':
			return 'bg-info text-dark';
			
			case 'UNDER_REVIEW':
			case 'PENDING_APPROVAL':
			return 'bg-primary';
			
			case 'EXPIRING_SOON':
			return 'bg-warning text-dark';
			
			case 'EXPIRED':
			case 'TERMINATED':
			return 'bg-danger';
			
			case 'ARCHIVED':
			case 'CANCELLED':
			case 'RENEWED':
			return 'bg-secondary';
			
			default:
			return 'bg-light text-dark border';
		}
	}
	
	counterpartyLabel(row: AgreementDto): string {
		return (row.counterparty?.trading_name || row.counterparty?.legal_name || '-');
	}
	
	classificationLabel(row: AgreementDto): string {
		const category = row.category?.name ?? '-';
		const type =row.type?.name;
		return type ? `${category} / ${type}` : category;
	}
	
	moneyLabel(row: AgreementDto): string {
		if (row.contract_value === null || row.contract_value === undefined) {
			return '-';
		}
		
		return new Intl.NumberFormat('en-MY',{
				style: 'currency',
				currency: row.currency_code || 'MYR',
			}).format(Number(row.contract_value));
	}
	
	private booleanFilterValue(value: BooleanFilter): boolean | undefined {
		if (value === '') {
			return undefined;
		}
		return value === '1';
	}
	
	onStatusChange(statusCode: string): void {
		this.statusCode = statusCode;
		
		/*
			* Archived agreements are excluded
			* by the backend unless this flag
			* is enabled.
		*/
		if (statusCode === 'ARCHIVED') {
			this.includeArchived = true;
		}
		
		if (statusCode !== 'ARCHIVED') {
			this.includeArchived = false;
		}
	}
}