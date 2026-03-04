import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ApiService, AuditLogDto, AuditLogListResponse } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-audit-logs',
	imports: [CommonModule, RouterModule, FormsModule],
	templateUrl: './audit-logs.html',
	styleUrls: ['./audit-logs.scss'],
})
export class AuditLogsComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	rows: AuditLogDto[] = [];
	
	// pagination
	page = 1;
	perPage = 20;
	total = 0;
	lastPage = 1;
	
	// filters
	search = '';
	entityType = '';
	action = '';
	entityId: number | null = null;
	userId: number | null = null;
	from = '';
	to = '';
	
	constructor(
		private api: ApiService,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
	) {}
	
	ngOnInit(): void {
		this.fetch();
	}
	
	private normalizeList(res: AuditLogListResponse): AuditLogDto[] {
		const d: unknown = res.data as unknown;
		if (Array.isArray(d)) return d as AuditLogDto[];
		if (d && typeof d === 'object' && Array.isArray((d as any).data)) return (d as any).data as AuditLogDto[];
		return [];
	}
	
	fetch(): void {
		this.loading = true;
		this.error = null;
		
		this.api.getAuditLogs({
			search: this.search || undefined,
			entity_type: this.entityType || undefined,
			action: this.action || undefined,
			entity_id: this.entityId ?? undefined,
			user_id: this.userId ?? undefined,
			from: this.from || undefined,
			to: this.to || undefined,
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges(); // ✅ keep as norm (prevents “needs sidebar click”)
		}))
		.subscribe({
			next: (res) => {
				this.rows = this.normalizeList(res);
				this.total = res.meta?.total ?? this.rows.length;
				this.lastPage = res.meta?.last_page ?? 1;
				this.cdr.detectChanges();
			},
			error: (err: unknown) => {
				console.error(err);
				this.error = 'Failed to load audit logs.';
				this.toast.error(this.error);
				this.cdr.detectChanges();
			}
		});
	}
	
	applyFilters(): void {
		this.page = 1;
		this.fetch();
	}
	
	clearFilters(): void {
		this.search = '';
		this.entityType = '';
		this.action = '';
		this.entityId = null;
		this.userId = null;
		this.from = '';
		this.to = '';
		this.page = 1;
		this.fetch();
	}
	
	changePage(next: number): void {
		if (next < 1 || next > this.lastPage) return;
		this.page = next;
		this.fetch();
	}
	
	badgeClass(action: string): string {
		const a = (action || '').toUpperCase();
		if (a === 'CREATE') return 'bg-success';
		if (a === 'UPDATE') return 'bg-primary';
		if (a === 'DELETE') return 'bg-danger';
		if (a === 'SYNC') return 'bg-warning text-dark';
		return 'bg-secondary';
	}
	
	entityLabel(r: AuditLogDto): string {
		const id = r.entity_id != null ? `#${r.entity_id}` : '';
		return `${r.entity_type}${id}`;
	}
	
	actorLabel(r: AuditLogDto): string {
		return r.user?.name ?? `User#${r.performed_by_user_id ?? '-'}`;
	}
}
