import {
	ChangeDetectorRef,
	Component,
	OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import {
	ApiPagedResponse,
	ApiResource,
	ApiService,
	EptwSyncMode,
	ExternalPermitDto,
	ExternalPermitQueryParams,
	IntegrationSyncRunDto,
	IntegrationSyncRunQueryParams,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';
import { AuthService } from '../../../core/auth/auth';

type EptwTab = 'permits' | 'history';

@Component({
	standalone: true,
	selector: 'app-eptw-sync',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './eptw-sync.html',
	styleUrls: ['./eptw-sync.scss'],
})
export class EptwSyncComponent implements OnInit {
	activeTab: EptwTab = 'permits';
	
	loadingPermits = false;
	loadingRuns = false;
	loadingDetail = false;
	
	syncing: EptwSyncMode | null = null;
	syncingOne = false;
	
	error: string | null = null;
	
	permits: ExternalPermitDto[] = [];
	runs: IntegrationSyncRunDto[] = [];
	
	selectedPermit: ExternalPermitDto | null = null;
	permitDetailOpen = false;
	
	//runAsync = true;
	runAsync = false;
	singleRunAsync = false;
	singleExternalFormId = '';
	
	permitPage = 1;
	runPage = 1;
	
	permitMeta = {
		current_page: 1,
		last_page: 1,
		per_page: 20,
		total: 0,
	};
	
	runMeta = {
		current_page: 1,
		last_page: 1,
		per_page: 20,
		total: 0,
	};
	
	permitFilters: ExternalPermitQueryParams = {
		search: '',
		normalized_status: '',
		is_linked: '',
		include_deleted: false,
		date_from: '',
		date_to: '',
		per_page: 20,
	};
	
	runFilters: IntegrationSyncRunQueryParams = {
		status: '',
		sync_type: '',
		date_from: '',
		date_to: '',
		per_page: 20,
	};
	
	readonly permitStatuses = [
		'',
		'PENDING',
		'ACTIVE',
		'SUSPENDED',
		'COMPLETED',
		'CANCELLED',
		'UNKNOWN',
	];
	
	readonly runStatuses = [
		'',
		'RUNNING',
		'COMPLETED',
		'PARTIAL',
		'FAILED',
	];
	
	readonly syncTypes = [
		'',
		'FULL',
		'INCREMENTAL',
		'MANUAL',
		'SINGLE',
	];
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private auth: AuthService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.loadPermits();
		this.loadRuns();
	}
	
	canSync(): boolean {
		return this.auth.hasAnyPermission([
			'permits.sync',
		]);
	}
	
	canReadPermits(): boolean {
		return this.auth.hasAnyPermission([
			'permits.read',
		]);
	}
	
	setTab(tab: EptwTab): void {
		this.activeTab = tab;
		
		if (tab === 'permits' && !this.permits.length) {
			this.loadPermits();
		}
		
		if (tab === 'history' && !this.runs.length) {
			this.loadRuns();
		}
	}
	
	loadPermits(page = this.permitPage): void {
		this.loadingPermits = true;
		this.error = null;
		this.permitPage = page;
		
		const params: ExternalPermitQueryParams = {
			...this.permitFilters,
			page: this.permitPage,
		};
		
		this.api.getExternalPermits(params)
		.pipe(
			finalize(() => {
				this.loadingPermits = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiPagedResponse<ExternalPermitDto>) => {
				this.permits = res.data ?? [];
				
				this.permitMeta = {
					current_page: res.meta?.current_page ?? 1,
					last_page: res.meta?.last_page ?? 1,
					per_page: res.meta?.per_page ?? 20,
					total: res.meta?.total ?? this.permits.length,
				};
			},
			error: (err: any) => {
				console.error(err);
				this.error = this.apiErrorMessage(
					err,
					'Failed to load ePTW permits.'
				);
				this.toast.error(this.error);
			},
		});
	}
	
	resetPermitFilters(): void {
		this.permitFilters = {
			search: '',
			normalized_status: '',
			is_linked: '',
			include_deleted: false,
			date_from: '',
			date_to: '',
			per_page: 20,
		};
		
		this.permitPage = 1;
		this.loadPermits(1);
	}
	
	loadRuns(page = this.runPage): void {
		this.loadingRuns = true;
		this.runPage = page;
		
		const params: IntegrationSyncRunQueryParams = {
			...this.runFilters,
			page: this.runPage,
		};
		
		this.api.getIntegrationSyncRuns(params)
		.pipe(
			finalize(() => {
				this.loadingRuns = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiPagedResponse<IntegrationSyncRunDto>) => {
				this.runs = res.data ?? [];
				
				this.runMeta = {
					current_page: res.meta?.current_page ?? 1,
					last_page: res.meta?.last_page ?? 1,
					per_page: res.meta?.per_page ?? 20,
					total: res.meta?.total ?? this.runs.length,
				};
			},
			error: (err: any) => {
				console.error(err);
				const message = this.apiErrorMessage(
					err,
					'Failed to load ePTW sync history.'
				);
				
				this.toast.error(message);
			},
		});
	}
	
	resetRunFilters(): void {
		this.runFilters = {
			status: '',
			sync_type: '',
			date_from: '',
			date_to: '',
			per_page: 20,
		};
		
		this.runPage = 1;
		this.loadRuns(1);
	}
	
	startSync(mode: EptwSyncMode): void {
		if (!this.canSync()) {
			this.toast.error('You do not have permission to start ePTW sync.');
			return;
		}
		
		this.syncing = mode;
		
		this.api.startEptwSync({
			mode,
			//run_async: this.runAsync,
			run_async: false,
		})
		.pipe(
			finalize(() => {
				this.syncing = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: any) => {
				if (res?.queued) {
					this.toast.info(res.message || 'ePTW sync has been queued.');
					} else {
					this.toast.success('ePTW sync completed.');
				}
				
				this.loadRuns(1);
				
				setTimeout(() => {
					this.loadRuns(1);
					this.loadPermits(1);
				}, 1500);
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to start ePTW sync.'
					)
				);
			},
		});
	}
	
	syncSinglePermit(): void {
		if (!this.canSync()) {
			this.toast.error('You do not have permission to start ePTW sync.');
			return;
		}
		
		const externalFormId = this.singleExternalFormId.trim();
		
		if (!externalFormId) {
			this.toast.warning('Please enter an ePTW form ID.');
			return;
		}
		
		this.syncingOne = true;
		
		this.api.syncOneEptwPermit({
			external_form_id: externalFormId,
			//run_async: this.singleRunAsync,
			run_async: false,
		})
		.pipe(
			finalize(() => {
				this.syncingOne = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: any) => {
				if (res?.queued) {
					this.toast.info(res.message || 'Single permit sync has been queued.');
					} else {
					this.toast.success('Single ePTW permit synced.');
				}
				
				this.singleExternalFormId = '';
				
				this.loadRuns(1);
				
				setTimeout(() => {
					this.loadRuns(1);
					this.loadPermits(1);
				}, 1500);
			},
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to sync ePTW permit.'
					)
				);
			},
		});
	}
	
	viewPermit(permit: ExternalPermitDto): void {
		this.permitDetailOpen = true;
		this.loadingDetail = true;
		this.selectedPermit = null;
		
		this.api.getExternalPermit(permit.id)
		.pipe(
			finalize(() => {
				this.loadingDetail = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (res: ApiResource<ExternalPermitDto>) => {
				// Prevent a completed request from showing after the modal was closed.
				if (this.permitDetailOpen) {
					this.selectedPermit = res.data;
				}
			},
			error: (err: any) => {
				console.error(err);
				
				this.permitDetailOpen = false;
				
				this.toast.error(
					this.apiErrorMessage(
						err,
						'Failed to load permit details.'
					)
				);
			},
		});
	}
	
	closePermitDetail(): void {
		this.permitDetailOpen = false;
		this.selectedPermit = null;
	}
	
	pagePermits(direction: -1 | 1): void {
		const nextPage = this.permitMeta.current_page + direction;
		
		if (
			nextPage < 1 ||
			nextPage > this.permitMeta.last_page
			) {
			return;
		}
		
		this.loadPermits(nextPage);
	}
	
	pageRuns(direction: -1 | 1): void {
		const nextPage = this.runMeta.current_page + direction;
		
		if (
			nextPage < 1 ||
			nextPage > this.runMeta.last_page
			) {
			return;
		}
		
		this.loadRuns(nextPage);
	}
	
	statusBadgeClass(status?: string | null): string {
		switch (this.normalize(status)) {
			case 'ACTIVE':
			return 'badge-eptw-active';
			
			case 'PENDING':
			return 'badge-eptw-pending';
			
			case 'SUSPENDED':
			return 'badge-eptw-suspended';
			
			case 'COMPLETED':
			return 'badge-eptw-completed';
			
			case 'CANCELLED':
			case 'CANCELED':
			return 'badge-eptw-cancelled';
			
			default:
			return 'badge-eptw-unknown';
		}
	}
	
	runBadgeClass(status?: string | null): string {
		switch (this.normalize(status)) {
			case 'COMPLETED':
			return 'badge-run-completed';
			
			case 'PARTIAL':
			return 'badge-run-partial';
			
			case 'FAILED':
			return 'badge-run-failed';
			
			case 'RUNNING':
			return 'badge-run-running';
			
			default:
			return 'badge-run-unknown';
		}
	}
	
	deletedBadgeClass(permit: ExternalPermitDto): string {
		return permit.is_source_deleted
		? 'badge-eptw-deleted'
		: this.statusBadgeClass(permit.normalized_status);
	}
	
	workPeriod(permit: ExternalPermitDto): string {
		const start = permit.work_start_date || '-';
		const end = permit.work_end_date || '-';
		
		if (start === '-' && end === '-') {
			return '-';
		}
		
		return `${start} to ${end}`;
	}
	
	workTime(permit: ExternalPermitDto): string {
		const start = permit.work_start_time || '-';
		const end = permit.work_end_time || '-';
		
		if (start === '-' && end === '-') {
			return '-';
		}
		
		return `${start} to ${end}`;
	}
	
	runTotalChanges(run: IntegrationSyncRunDto): number {
		return run.created_count +
		run.updated_count +
		run.deleted_count +
		run.failed_count;
	}
	
	sourceLinkLabel(permit: ExternalPermitDto): string {
		return permit.source_url
		? 'Open ePTW'
		: '-';
	}
	
	private normalize(value?: string | null): string {
		return String(value ?? '')
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
	}
	
	private apiErrorMessage(err: any, fallback: string): string {
		if (err?.status === 0) {
			return 'Cannot connect to the server. Please check if Laravel API is running.';
		}
		
		if (err?.status === 401) {
			return 'Your session has expired. Please login again.';
		}
		
		if (err?.status === 403) {
			return err?.error?.message || 'You do not have permission for this action.';
		}
		
		if (err?.status === 422) {
			const errors = err?.error?.errors;
			
			if (errors) {
				const firstKey = Object.keys(errors)[0];
				return errors[firstKey]?.[0] || 'Validation failed.';
			}
			
			return err?.error?.message || 'Validation failed.';
		}
		
		if (err?.status >= 500) {
			return err?.error?.message || 'Server error occurred. Please check Laravel logs.';
		}
		
		return err?.error?.message || fallback;
	}
}