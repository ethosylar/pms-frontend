import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { catchError, finalize, } from 'rxjs/operators';
import { forkJoin, of, } from 'rxjs';

import {
	AgreementDocumentDto,
	AgreementDocumentQueryParams,
	AgreementDocumentTypeDto,
	AgreementDto,
	AgreementLifecycleEventDto,
	AgreementNotesPayload,
	AgreementProjectDto,
	ApiCollection,
	ApiResource,
	ApiService,
	ProjectDto,
} from '../../../core/services/api.service';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../shared/ui/toast/toast';

type AgreementDetailTab =
| 'overview'
| 'lifecycle'
| 'documents'
| 'projects'
| 'versions';

type LifecycleAction =
| 'review'
| 'submit'
| 'approve'
| 'activate'
| 'cancel'
| 'archive'
| 'amend'
| 'renew'
| 'terminate'
| null;

@Component({
	standalone: true,
	selector: 'app-agreement-detail',
	imports: [
		CommonModule,
		FormsModule,
		RouterModule,
	],
	templateUrl: './agreement-detail.html',
	styleUrls: ['./agreement-detail.scss'],
})
export class AgreementDetailComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	agreementId = 0;
	row: AgreementDto | null = null;
	
	activeTab: AgreementDetailTab = 'overview';
	
	action: LifecycleAction = null;
	actionSaving = false;
	actionError: string | null = null;
	
	actionForm = {
		reason: '',
		notes: '',
		
		title: '',
		amendment_reason: '',
		
		renewal_reason: '',
		effective_date: '',
		expiry_date: '',
		
		contract_value: null as number | null,
		currency_code: 'MYR',
		notice_period_days: null as number | null,
		auto_renewal: false,
		
		copy_project_links: true,
		
		termination_reason: '',
		terminated_on: '',
	};
	
	documentRows: AgreementDocumentDto[] = [];
	documentTypes: AgreementDocumentTypeDto[] = [];
	supersedeCandidates: AgreementDocumentDto[] = [];
	
	documentsLoading = false;
	documentSaving = false;
	documentError: string | null = null;
	
	documentTypeFilter: number | null = null;
	documentCurrentFilter = '';
	documentExecutedFilter = '';
	documentOcrFilter = '';
	
	documentModalMode:
	| 'upload'
	| 'edit'
	| null = null;
	
	editingDocument: AgreementDocumentDto | null = null;
	selectedUploadFile: File | null = null;
	
	documentForm = {
		document_type_id: null as number | null,
		document_version: '',
		document_date: '',
		is_current: true,
		is_executed_copy: false,
		supersedes_agreement_file_id:
		null as number | null,
		notes: '',
	};
	
	projectsLoading = false;
	projectLinkSaving = false;
	projectError: string | null = null;
	
	projectOptions: ProjectDto[] = [];
	
	projectLinkForm = {
		project_id: null as number | null,
		notes: '',
	};
	
	unlinkingProjectId: number | null = null;
	removingDocumentId: number | null = null;
	requestingOcrId: number | null = null;
	
	readonly workflowSteps = [
		{
			code: 'DRAFT',
			name: 'Draft',
			description: 'Agreement preparation',
		},
		{
			code: 'UNDER_REVIEW',
			name: 'Review',
			description: 'Department or stakeholder review',
		},
		{
			code: 'PENDING_APPROVAL',
			name: 'Approval',
			description: 'Awaiting authorised approval',
		},
		{
			code: 'APPROVED',
			name: 'Approved',
			description: 'Approved but not necessarily active',
		},
		{
			code: 'ACTIVE',
			name: 'Active',
			description: 'Agreement is in force',
		},
	];
	
	constructor(
		private api: ApiService,
		private auth: AuthService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
	) {}
	
	ngOnInit(): void {
		const parsed = Number(this.route.snapshot.paramMap.get('id'));
		
		if (!Number.isInteger(parsed) || parsed <= 0) {
			this.error = 'Invalid agreement ID.';
			this.loading = false;
			return;
		}
		
		this.agreementId = parsed;
		
		this.loadAgreement();
		this.loadDocumentTypes();
		
		if (this.canLinkProjects()) {
			this.loadProjectOptions();
		}
	}
	
	loadAgreement(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getAgreement(
			this.agreementId
		)
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.row = result.data;
				
				this.documentRows = result.data.documents ?? [];
				this.loadSupersedeCandidates();
			},
			error: (err: any) => {
				console.error(err);
				this.error = err?.error?.message || 'Failed to load agreement.';
			},
		});
	}
	
	setTab(tab: AgreementDetailTab): void {
		this.activeTab = tab;
		if (tab === 'documents') {
			this.loadDocuments();
		}
	}
	
	canEdit(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.edit',
		]);
	}
	
	canSubmit(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.submit',
		]);
	}
	
	canApprove(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.approve',
		]);
	}
	
	canAmend(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.amend',
		]);
	}
	
	canRenew(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.renew',
		]);
	}
	
	canTerminate(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.terminate',
		]);
	}
	
	canArchive(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.archive',
		]);
	}
	
	canLinkProjects(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.projects.link',
		]);
	}
	
	canUploadDocuments(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.documents.upload',
		]);
	}
	
	canRequestOcr(): boolean {
		return this.auth.hasAnyPermission([
			'system.all',
			'agreements.documents.ocr',
		]);
	}
	
	statusCode(): string {
		return this.row?.status?.code ?? '';
	}
	
	canDirectEdit(): boolean {
		return (this.canEdit() && ['DRAFT','UNDER_REVIEW',].includes(this.statusCode()));
	}
	
	canReview(): boolean {
		return (this.canEdit() && this.statusCode() === 'DRAFT');
	}
	
	canSubmitCurrent(): boolean {
		return (this.canSubmit() && ['DRAFT','UNDER_REVIEW',].includes(this.statusCode()));
	}
	
	canApproveCurrent(): boolean {
		return (this.canApprove() && this.statusCode() === 'PENDING_APPROVAL');
	}
	
	canActivateCurrent(): boolean {
		return (this.canApprove() && this.statusCode() === 'APPROVED');
	}
	
	canAmendCurrent(): boolean {
		return (this.canAmend() && ['APPROVED','ACTIVE','EXPIRING_SOON',].includes(this.statusCode()));
	}
	
	canRenewCurrent(): boolean {
		return (this.canRenew() && ['ACTIVE','EXPIRING_SOON','EXPIRED',].includes(this.statusCode()));
	}
	
	canTerminateCurrent(): boolean {
		return (this.canTerminate() && ['APPROVED','ACTIVE','EXPIRING_SOON','EXPIRED',].includes(this.statusCode()));
	}
	
	canArchiveCurrent(): boolean {
		return (this.canArchive() && ['EXPIRED','RENEWED','TERMINATED','CANCELLED',].includes(this.statusCode()));
	}
	
	canCancelCurrent(): boolean {
		return (this.canEdit() && ['DRAFT','UNDER_REVIEW','PENDING_APPROVAL','APPROVED',].includes(this.statusCode()));
	}
	
	hasLifecycleAction(): boolean {
		return (
			this.canReview() ||
			this.canSubmitCurrent() ||
			this.canApproveCurrent() ||
			this.canActivateCurrent() ||
			this.canAmendCurrent() ||
			this.canRenewCurrent() ||
			this.canTerminateCurrent() ||
			this.canArchiveCurrent() ||
			this.canCancelCurrent()
		);
	}
	
	edit(): void {
		this.router.navigate(['/agreements', this.agreementId, 'edit',]);
	}
	
	openAction(action: Exclude<LifecycleAction, null>): void {
		this.action = action;
		this.actionError = null;
		
		this.actionForm = {
			reason: '',
			notes: '',
			title: '',
			amendment_reason: '',
			renewal_reason: '',
			effective_date: this.row?.effective_date ?? '',
			expiry_date: this.row?.expiry_date ?? '',
			contract_value: this.row?.contract_value === null || this.row?.contract_value === undefined ? null : Number(this.row.contract_value),
			currency_code: this.row?.currency_code || 'MYR',
			notice_period_days: this.row?.notice_period_days ?? null,
			auto_renewal: this.row?.auto_renewal ?? false,
			copy_project_links: true,
			termination_reason: '',
			terminated_on: new Date().toISOString().slice(0, 10),
		};
	}
	
	closeAction(): void {
		if (this.actionSaving) {
			return;
		}
		
		this.action = null;
		this.actionError = null;
	}
	
	executeAction(): void {
		if (!this.action || !this.row) {
			return;
		}
		
		this.actionError = null;
		let request$: ReturnType<ApiService['reviewAgreement']>;
		
		const notesPayload: AgreementNotesPayload = {
			reason: this.nullText(this.actionForm.reason),
			notes: this.nullText(this.actionForm.notes),
		};
		
		switch (this.action) {
			case 'review':
			request$ = this.api.reviewAgreement(this.agreementId, notesPayload);
			break;
			
			case 'submit':
			request$ = this.api.submitAgreement(this.agreementId, notesPayload);
			break;
			
			case 'approve':
			request$ = this.api.approveAgreement(this.agreementId, notesPayload);
			break;
			
			case 'activate':
			request$ = this.api.activateAgreement(this.agreementId, notesPayload);
			break;
			
			case 'cancel':
			request$ = this.api.cancelAgreement(this.agreementId, notesPayload);
			break;
			
			case 'archive':
			request$ = this.api.archiveAgreement(this.agreementId, notesPayload);
			break;
			
			case 'amend':
			if (!this.actionForm.amendment_reason.trim()) {
				this.actionError = 'Amendment Reason is required.';
				return;
			}
			
			request$ =
			this.api.amendAgreement(
				this.agreementId,
				{
					title: this.nullText(this.actionForm.title),
					amendment_reason: this.actionForm.amendment_reason.trim(),
					effective_date: this.actionForm.effective_date || null,
					expiry_date: this.actionForm.expiry_date || null,
					copy_project_links: this.actionForm.copy_project_links,
				}
			);
			break;
			
			case 'renew':
			if (!this.actionForm.effective_date || !this.actionForm.expiry_date) {
				this.actionError = 'Renewal Effective Date and Expiry Date are required.';
				return;
			}
			
			if (this.actionForm.expiry_date <= this.actionForm.effective_date) {
				this.actionError = 'Renewal Expiry Date must be after the Effective Date.';
				return;
			}
			
			request$ = this.api.renewAgreement(
				this.agreementId,
				{
					title: this.nullText(this.actionForm.title),
					renewal_reason: this.nullText(this.actionForm.renewal_reason),
					effective_date: this.actionForm.effective_date,
					expiry_date: this.actionForm.expiry_date,
					contract_value: this.actionForm.contract_value,
					currency_code: this.actionForm.currency_code.trim().toUpperCase(),
					notice_period_days: this.actionForm.notice_period_days,
					auto_renewal: this.actionForm.auto_renewal,
					copy_project_links: this.actionForm.copy_project_links,
				}
			);
			break;
			
			case 'terminate':
			if (!this.actionForm.termination_reason.trim()) {
				this.actionError = 'Termination Reason is required.';
				return;
			}
			
			request$ = this.api.terminateAgreement(
				this.agreementId,
				{
					termination_reason: this.actionForm.termination_reason.trim(),
					terminated_on: this.actionForm.terminated_on || null,
				}
			);
			break;
		}
		
		this.actionSaving = true;
		
		request$
		.pipe(
			finalize(() => {
				this.actionSaving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				const createdNewVersion = ['amend','renew',].includes(this.action!);
				this.toast.success(this.actionSuccessMessage(this.action!));
				this.closeAction();
				
				if (createdNewVersion && result.data.id !== this.agreementId) {
					this.router.navigate(['/agreements',result.data.id,]);
					return;
				}
				
				this.row = result.data;
				this.documentRows = result.data.documents ?? [];
			},
			error: (err: any) => {
				console.error(err);
				this.actionError = this.apiErrorMessage(err, 'Failed to perform agreement lifecycle action.'
				);
			},
		});
	}
	
	actionTitle(): string {
		const titles: Record<Exclude<LifecycleAction, null>,
		string> = {
			review: 'Move to Review',
			submit: 'Submit for Approval',
			approve: 'Approve Agreement',
			activate: 'Activate Agreement',
			cancel: 'Cancel Agreement',
			archive: 'Archive Agreement',
			amend: 'Create Amendment',
			renew: 'Create Renewal',
			terminate: 'Terminate Agreement',
		};
		
		return this.action ? titles[this.action] : '';
	}
	
	actionButtonClass(): string {
		switch (this.action) {
			case 'cancel':
			case 'terminate':
			return 'btn-danger';
			
			case 'archive':
			return 'btn-secondary';
			
			default:
			return 'btn-primary';
		}
	}
	
	nextActionMessage(): string {
		switch (this.statusCode()) {
			case 'DRAFT':
			return 'Complete the agreement details, review the documents, then move it to review or submit it for approval.';
			
			case 'UNDER_REVIEW':
			return 'Resolve review comments and submit the agreement for approval.';
			
			case 'PENDING_APPROVAL':
			return 'The agreement is waiting for an authorised approver.';
			
			case 'APPROVED':
			return 'The agreement is approved. Activate it when the effective date has arrived.';
			
			case 'ACTIVE':
			return 'The agreement is active. Monitor its expiry date, obligations and renewal requirements.';
			
			case 'EXPIRING_SOON':
			return 'The agreement is approaching expiry. Consider renewal, amendment or termination.';
			
			case 'EXPIRED':
			return 'The agreement has expired. It may be renewed or archived.';
			
			default:
			return 'This agreement is in a terminal or historical lifecycle state.';
		}
	}
	
	workflowStepClass(stepCode: string): string {
		const order = [
			'DRAFT',
			'UNDER_REVIEW',
			'PENDING_APPROVAL',
			'APPROVED',
			'ACTIVE',
		];
		
		const currentCode = this.statusCode();
		let currentIndex = order.indexOf(currentCode);
		
		if (['EXPIRING_SOON','EXPIRED','RENEWED','TERMINATED','ARCHIVED',].includes(currentCode)) {
			currentIndex = 4;
		}
		
		const stepIndex = order.indexOf(stepCode);
		
		if (stepCode === currentCode) {
			return 'current';
		}
		
		if (currentIndex >= 0 && stepIndex < currentIndex) {
			return 'completed';
		}
		
		return 'future';
	}
	
	statusBadgeClass(): string {
		switch (this.statusCode()) {
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
	
	moneyLabel(): string {
		if (this.row?.contract_value === null || this.row?.contract_value === undefined) {
			return '-';
		}
		
		return new Intl.NumberFormat('en-MY',{ style: 'currency', currency: this.row.currency_code || 'MYR', }).format(Number(this.row.contract_value));
	}
	
	// -------------------------------------------------------------------------
	// Documents
	// -------------------------------------------------------------------------
	
	loadDocumentTypes(): void {
		this.api.getAgreementDocumentTypes({
			is_active: true,
			per_page: 100,
		})
		.pipe(
			catchError(() =>
				of({
					data: [],
				} as ApiCollection<AgreementDocumentTypeDto>)
			)
		)
		.subscribe(result => {
			this.documentTypes =
			result.data ?? [];
		});
	}
	
	loadDocuments(): void {
		this.documentsLoading = true;
		this.documentError = null;
		
		const params:
		AgreementDocumentQueryParams = {
			document_type_id: this.documentTypeFilter ?? undefined,
			is_current: this.booleanFilter(this.documentCurrentFilter),
			is_executed_copy: this.booleanFilter(this.documentExecutedFilter),
			ocr_status: (this.documentOcrFilter || undefined) as any,
			per_page: 100,
		};
		
		this.api.getAgreementDocuments(this.agreementId, params)
		.pipe(
			finalize(() => {
				this.documentsLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.documentRows = result.data ?? [];
			},
			error: (err: any) => {
				this.documentError = err?.error?.message || 'Failed to load agreement documents.';
			},
		});
	}
	
	resetDocumentFilters(): void {
		this.documentTypeFilter = null;
		this.documentCurrentFilter = '';
		this.documentExecutedFilter = '';
		this.documentOcrFilter = '';
		
		this.loadDocuments();
	}
	
	openUploadDocument(): void {
		this.documentModalMode = 'upload';
		this.editingDocument = null;
		this.selectedUploadFile = null;
		this.documentError = null;
		
		this.documentForm = {
			document_type_id: null,
			document_version: '',
			document_date: '',
			is_current: true,
			is_executed_copy: false,
			supersedes_agreement_file_id: null,
			notes: '',
		};
	}
	
	openEditDocument(document: AgreementDocumentDto): void {
		this.documentModalMode = 'edit';
		this.editingDocument = document;
		this.documentError = null;
		
		this.documentForm = {
			document_type_id: document.document_type_id,
			document_version: document.document_version ?? '',			
			document_date: document.document_date ?? '',
			is_current: document.is_current,
			is_executed_copy: document.is_executed_copy,
			supersedes_agreement_file_id: document.supersedes_agreement_file_id ?? null,
			notes: document.notes ?? '',
		};
	}
	
	closeDocumentModal(): void {
		if (this.documentSaving) {
			return;
		}
		
		this.documentModalMode = null;
		this.editingDocument = null;
		this.selectedUploadFile = null;
		this.documentError = null;
	}
	
	onDocumentFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		this.selectedUploadFile = input.files?.[0] ?? null;
	}
	
	saveDocument(): void {
		this.documentError = null;
		
		if (!this.documentForm.document_type_id) {
			this.documentError = 'Document Type is required.';
			return;
		}
		
		if (this.documentModalMode === 'upload' && !this.selectedUploadFile) {
			this.documentError = 'Select a document file.';
			return;
		}
		
		this.documentSaving = true;
		const request$ = this.documentModalMode === 'upload' ? this.api.uploadAgreementDocument(
			this.agreementId,
			{
				file: this.selectedUploadFile!,
				document_type_id: this.documentForm.document_type_id,
				document_version: this.nullText(this.documentForm.document_version),
				document_date: this.documentForm.document_date || null,
				is_current: this.documentForm.is_current,
				is_executed_copy: this.documentForm.is_executed_copy,
				supersedes_agreement_file_id: this.documentForm.supersedes_agreement_file_id,
				notes: this.nullText(this.documentForm.notes),
			}
			) : this.api.updateAgreementDocument(
			this.agreementId,
			this.editingDocument!.id,
			{
				document_type_id:this.documentForm.document_type_id,
				document_version: this.nullText(this.documentForm.document_version),
				document_date: this.documentForm.document_date || null,
				is_current: this.documentForm.is_current,
				is_executed_copy: this.documentForm.is_executed_copy,
				supersedes_agreement_file_id: this.documentForm.supersedes_agreement_file_id,
				notes: this.nullText(this.documentForm.notes),
			}
		);
		
		request$
		.pipe(
			finalize(() => {
				this.documentSaving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(this.documentModalMode === 'upload' ? 'Agreement document uploaded.' : 'Agreement document metadata updated.');
				this.closeDocumentModal();
				this.loadAgreement();
				this.loadDocuments();
			},
			error: (err: any) => {
				this.documentError = this.apiErrorMessage(err, 'Failed to save agreement document.');
			},
		});
	}
	
	removeDocument(document: AgreementDocumentDto): void {
		if (!window.confirm(`Remove "${document.file?.original_name || 'this document'}" from the agreement?`)) {
			return;
		}
		
		this.removingDocumentId = document.id;
		
		this.api.removeAgreementDocument(this.agreementId, document.id)
		.pipe(
			finalize(() => {
				this.removingDocumentId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Agreement document removed.');
				this.loadDocuments();
			},
			error: (err: any) => {
				this.toast.error(err?.error?.message || 'Failed to remove agreement document.');
			},
		});
	}
	
	downloadDocument(documentRow: AgreementDocumentDto): void {
		this.api.downloadAgreementDocument(this.agreementId, documentRow.id)
		.subscribe({
			next: blob => {
				const url = URL.createObjectURL(blob);
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = documentRow.file?.original_name || 'agreement-document';
				anchor.click();
				URL.revokeObjectURL(url);
			},
			error: () => {
				this.toast.error('Failed to download agreement document.');
			},
		});
	}
	
	previewDocument(documentRow: AgreementDocumentDto): void {
		this.api.downloadAgreementDocument(this.agreementId, documentRow.id)
		.subscribe({
			next: blob => {
				const url =
				URL.createObjectURL(blob);
				window.open(url, '_blank', 'noopener');
				setTimeout(() => URL.revokeObjectURL(url),60000);
			},
			error: () => {
				this.toast.error('Failed to preview agreement document.');
			},
		});
	}
	
	requestOcr(document: AgreementDocumentDto): void {
		this.requestingOcrId = document.id;
		
		this.api.requestAgreementDocumentOcr(this.agreementId, document.id)
		.pipe(
			finalize(() => {
				this.requestingOcrId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('OCR request queued.');
				this.loadDocuments();
			},
			error: (err: any) => {
				this.toast.error(err?.error?.message || 'Failed to request OCR.');
			},
		});
	}
	
	canQueueOcr(document: AgreementDocumentDto): boolean {
		return (this.canRequestOcr() && document.ocr.feature_enabled && document.ocr.eligible === true && !['PENDING','PROCESSING',].includes(document.ocr.status));
	}
	
	fileSize(size?: number | null): string {
		if (!size) {
			return '-';
		}
		
		if (size < 1024) {
			return `${size} B`;
		}
		
		if (size < 1024 * 1024) {
			return `${( size / 1024 ).toFixed(1)} KB`;
		}
		
		return `${( size / 1024 / 1024 ).toFixed(1)} MB`;
	}
	
	private loadSupersedeCandidates(): void {
		if (!this.row) {
			return;
		}
		
		const ids = new Set<number>([this.agreementId,]);
		
		if (this.row.lifecycle.parent_agreement_id) {
			ids.add(this.row.lifecycle.parent_agreement_id);
		}
		
		for (const child of this.row.child_agreements ?? []) {
			ids.add(child.id);
		}
		
		forkJoin(Array.from(ids).map(id => this.api.getAgreementDocuments(id,{ per_page: 100, })
			.pipe(
				catchError(() =>
					of({
						data: [],
					} as ApiCollection<AgreementDocumentDto>)
				)
			)
		)
		)
		.subscribe(results => {
			const map = new Map<number, AgreementDocumentDto>();
			
			for (const result of results) {
				for (const document of result.data ?? []) {
					map.set(document.id, document);
				}
			}
			
			this.supersedeCandidates = Array.from(map.values());
		});
	}
	
	// -------------------------------------------------------------------------
	// Projects
	// -------------------------------------------------------------------------
	
	loadProjectOptions(): void {
		this.projectsLoading = true;
		
		this.api.getProjects({
			per_page: 100,
		})
		.pipe(
			finalize(() => {
				this.projectsLoading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: result => {
				this.projectOptions = result.data ?? [];
			},
			error: () => {
				this.projectError = 'Project options could not be loaded.';
			},
		});
	}
	
	linkProject(): void {
		if (!this.projectLinkForm.project_id) {
			this.projectError = 'Select a project.';
			return;
		}
		
		this.projectLinkSaving = true;
		this.projectError = null;
		
		this.api.linkProjectToAgreement(
			this.agreementId,
			{
				project_id: this.projectLinkForm.project_id,
				notes: this.nullText(this.projectLinkForm.notes),
			}
		)
		.pipe(
			finalize(() => {
				this.projectLinkSaving = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success(
					'Project linked to agreement.'
				);
				
				this.projectLinkForm = {
					project_id: null,
					notes: '',
				};
				
				this.loadAgreement();
			},
			error: (err: any) => {
				this.projectError = this.apiErrorMessage(err, 'Failed to link project.');
			},
		});
	}
	
	unlinkProject(project: AgreementProjectDto): void {
		if (!window.confirm(`Unlink project "${project.code} - ${project.name}"?`)) {
			return;
		}
		
		this.unlinkingProjectId = project.link_id;
		
		this.api.unlinkProjectFromAgreement(this.agreementId, project.link_id)
		.pipe(
			finalize(() => {
				this.unlinkingProjectId = null;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: () => {
				this.toast.success('Project unlinked.');
				this.loadAgreement();
			},
			error: (err: any) => {
				this.toast.error(err?.error?.message || 'Failed to unlink project.');
			},
		});
	}
	
	eventStatusLabel(event: AgreementLifecycleEventDto): string {
		if (event.from_status && event.to_status) {
			return (`${event.from_status.name} → ` + event.to_status.name);
		}
		
		return (event.to_status?.name || event.from_status?.name || '-');
	}
	
	metadataText(value: unknown): string {
		if (value === null || value === undefined) {
			return '-';
		}
		try {
			return JSON.stringify(value, null, 2);
		} catch {
			return String(value);
		}
	}
	
	private booleanFilter(value: string): boolean | undefined {
		if (value === '') {
			return undefined;
		}
		
		return value === '1';
	}
	
	private nullText(value: unknown): string | null {
		const text = String(value ?? '').trim();
		return text || null;
	}
	
	private actionSuccessMessage(action: Exclude<LifecycleAction, null>): string {
		const messages = {
			review: 'Agreement moved to review.',
			submit: 'Agreement submitted for approval.',
			approve: 'Agreement approved.',
			activate: 'Agreement activated.',
			cancel: 'Agreement cancelled.',
			archive: 'Agreement archived.',
			amend: 'Amendment draft created.',
			renew: 'Renewal draft created.',
			terminate: 'Agreement terminated.',
		};
		return messages[action];
	}
	
	private apiErrorMessage(err: any, fallback: string): string {
		if (err?.status === 409 || err?.status === 422) {
			return (err?.error?.message || fallback);
		}
		
		const errors = err?.error?.errors;
		
		if (errors) {
			const key = Object.keys(errors)[0];
			return ( errors[key]?.[0] || fallback);
		}
		
		return (err?.error?.message || fallback);
	}
}