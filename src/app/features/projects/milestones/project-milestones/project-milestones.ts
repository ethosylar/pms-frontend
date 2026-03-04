import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import {
	ApiService,
	ApiCollection,
	ProjectDto,
	ProjectMilestoneDto,
	ApiResource,
} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-project-milestones',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './project-milestones.html',
	styleUrls: ['./project-milestones.scss'],
})
export class ProjectMilestonesComponent implements OnInit {
	loading = true;
	error: string | null = null;
	
	projectId!: number;
	project: ProjectDto | null = null;
	
	rows: ProjectMilestoneDto[] = [];
	meta = { current_page: 1, last_page: 1, per_page: 20, total: 0 };
	
	form: FormGroup;
	
	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private fb: FormBuilder,
		private cdr: ChangeDetectorRef
		) {
		this.form = this.fb.group({
			search: [''],
			status: [''],
			date_from: [''],
			date_to: [''],
		});
	}
	
	ngOnInit(): void {
		this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
		
		// Load project header + list
		this.api.getProject(this.projectId).pipe(
			finalize(() => this.cdr.detectChanges())
			).subscribe({
				next: (res: ApiResource<ProjectDto>) => {
					this.project = res.data;
					this.load(1);
				},
				error: (e) => {
					console.error(e);
					this.project = null;
					this.load(1); // still try to load milestones
				}
			});
	}
	
	load(page = 1): void {
		this.loading = true;
		this.error = null;
		
		const v = this.form.value;
		
		const params = {
			search: (v.search || '').trim() || undefined,
			status: (v.status || '').trim() ? String(v.status).trim().toUpperCase() : undefined,
			date_from: v.date_from || undefined,
			date_to: v.date_to || undefined,
			page,
			per_page: this.meta.per_page,
		};
		
		this.api.getProjectMilestones(this.projectId, params)
		.pipe(finalize(() => {
			this.loading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res: ApiCollection<ProjectMilestoneDto>) => {
				this.rows = res.data ?? [];
				const m = res.meta ?? {};
				this.meta = {
					current_page: m.current_page ?? page,
					last_page: m.last_page ?? 1,
					per_page: m.per_page ?? this.meta.per_page,
					total: m.total ?? this.rows.length,
				};
			},
			error: (e) => {
				console.error(e);
				this.error = 'Failed to load milestones.';
			}
		});
	}
	
	apply(): void {
		this.load(1);
	}
	
	clear(): void {
		this.form.reset({ search: '', status: '', date_from: '', date_to: '' });
		this.load(1);
	}
	
	create(): void {
		this.router.navigate(['/projects', this.projectId, 'milestones', 'new']);
	}
	
	edit(r: ProjectMilestoneDto): void {
		this.router.navigate(['/projects', this.projectId, 'milestones', r.id]);
	}
	
	remove(r: ProjectMilestoneDto): void {
		if (!confirm(`Delete milestone "${r.name}"?`)) return;
		
		this.api.deleteProjectMilestone(this.projectId, r.id)
		.pipe(finalize(() => this.cdr.detectChanges()))
		.subscribe({
			next: () => {
				this.toast.success('Milestone deleted.');
				this.load(this.meta.current_page);
			},
			error: (e) => {
				console.error(e);
				this.toast.error('Failed to delete milestone.');
			}
		});
	}
	
	backToProject(): void {
		this.router.navigate(['/projects', this.projectId]);
	}
	
	badgeClass(status: string): string {
		const s = (status || '').toUpperCase();
		if (s === 'DONE' || s === 'COMPLETED') return 'bg-success';
		if (s === 'CANCELLED') return 'bg-secondary';
		return 'bg-warning text-dark'; // PENDING / default
	}
}
