import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ApiService, ApiResource, ExternalRiskIssueDto } from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-external-risk-issue-detail',
	imports: [CommonModule, RouterModule],
	templateUrl: './external-risk-issue-detail.html',
	styleUrls: ['./external-risk-issue-detail.scss'],
})
export class ExternalRiskIssueDetailComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	id!: number;
	row: ExternalRiskIssueDto | null = null;
	
	showPayload = false;
	payloadText = '';
	
	canWrite = false;
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.id = Number(this.route.snapshot.paramMap.get('id'));
		
		// best-effort write permission
		this.api.me().subscribe({
			next: (me: any) => {
				const roles = (me?.roles ?? me?.data?.roles ?? []) as any[];
				const codes = roles.map((r: any) => String(r?.code ?? r?.name ?? r)).map(s => s.toUpperCase());
				this.canWrite = codes.includes('ADMIN') || codes.includes('PMO') || codes.includes('PM');
				this.cdr.detectChanges();
			},
			error: () => (this.canWrite = false),
		});
		
		this.fetch(false);
	}
	
	fetch(includePayload: boolean): void {
		this.loading = true;
		this.error = null;
		
		this.api.getExternalRiskIssue(this.id, includePayload)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiResource<ExternalRiskIssueDto>) => {
				this.row = res.data;
				if (includePayload) {
					const p: any = (this.row as any).raw_payload;
					this.payloadText = typeof p === 'string' ? p : JSON.stringify(p ?? null, null, 2);
				}
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load issue.';
				this.cdr.detectChanges();
			}
		});
	}
	
	togglePayload(): void {
		this.showPayload = !this.showPayload;
		if (this.showPayload && !this.payloadText) {
			this.fetch(true);
		}
	}
	
	back(): void {
		this.router.navigateByUrl('/external-risk-issues');
	}
	
	edit(): void {
		if (!this.canWrite) {
			this.toast.warning('You do not have permission to edit.');
			return;
		}
		this.router.navigate(['/external-risk-issues', this.id, 'edit']);
	}
}
