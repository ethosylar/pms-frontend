import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { ApiService, AuditLogDto, AuditLogShowResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-audit-log-detail',
	imports: [CommonModule, RouterModule],
	templateUrl: './audit-log-detail.html',
	styleUrls: ['./audit-log-detail.scss'],
})
export class AuditLogDetailComponent implements OnInit {
	loading = true;
	error: string | null = null;
	row: AuditLogDto | null = null;
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	private normalizeOne(res: AuditLogShowResponse): AuditLogDto | null {
		const d: unknown = res.data as unknown;
		if (d && typeof d === 'object' && (d as any).data) return (d as any).data as AuditLogDto;
		return d as AuditLogDto;
	}
	
	ngOnInit(): void {
		const id = Number(this.route.snapshot.paramMap.get('id'));
		if (!Number.isFinite(id)) {
			this.error = 'Invalid audit log id.';
			this.loading = false;
			return;
		}
		
		this.api.getAuditLog(id)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => {
				this.row = this.normalizeOne(res);
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load audit log.';
				this.toast.error(this.error);
				this.cdr.detectChanges();
			}
		});
	}
	
	actorLabel(): string {
		return this.row?.user?.name ?? `User#${(this.row as any)?.performed_by_user_id ?? '-'}`;
	}
}
