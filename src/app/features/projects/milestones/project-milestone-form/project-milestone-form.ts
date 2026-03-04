import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import {
	ApiService,
	ApiResource,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectMilestoneUpsertPayload
} from '../../../../core/services/api.service';
import { ToastService } from '../../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-project-milestone-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './project-milestone-form.html',
	styleUrls: ['./project-milestone-form.scss'],
})
export class ProjectMilestoneFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	projectId!: number;
	milestoneId: number | null = null;
	isCreate = true;
	
	project: ProjectDto | null = null;
	
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
			name: ['', [Validators.required]],
			milestone_date: [null, [Validators.required]],
			status: ['PENDING', [Validators.required]],
		});
	}
	
	ngOnInit(): void {
		this.projectId = Number(this.route.snapshot.paramMap.get('projectId'));
		const mid = this.route.snapshot.paramMap.get('milestoneId');
		
		this.isCreate = !mid || mid === 'new';
		this.milestoneId = this.isCreate ? null : Number(mid);
		
		this.loading = true;
		
		// load project header, then milestone (if edit)
		this.api.getProject(this.projectId).subscribe({
			next: (res: ApiResource<ProjectDto>) => {
				this.project = res.data;
				
				if (this.isCreate) {
					this.loading = false;
					this.cdr.detectChanges();
					return;
				}
				
				this.api.getProjectMilestone(this.projectId, this.milestoneId!)
				.pipe(finalize(() => {
					this.loading = false;
					this.cdr.detectChanges();
				}))
				.subscribe({
					next: (mres: ApiResource<ProjectMilestoneDto>) => {
						const m = mres.data;
						this.form.patchValue({
							name: m.name,
							milestone_date: m.milestone_date ?? null,
							status: (m.status || 'PENDING').toUpperCase(),
						});
						this.cdr.detectChanges();
					},
					error: (e) => {
						console.error(e);
						this.error = 'Failed to load milestone.';
					}
				});
			},
			error: (e) => {
				console.error(e);
				this.project = null;
				// still allow create/edit attempt
				this.loading = false;
				this.cdr.detectChanges();
			}
		});
	}
	
	save(): void {
		this.error = null;
		
		if (this.form.invalid) {
			this.form.markAllAsTouched();
			return;
		}
		
		const v = this.form.value;
		
		const payload: ProjectMilestoneUpsertPayload = {
			name: String(v.name).trim(),
			milestone_date: v.milestone_date || null,
			status: String(v.status).trim().toUpperCase(),
		};
		
		this.saving = true;
		
		const req$ = this.isCreate
		? this.api.createProjectMilestone(this.projectId, payload)
		: this.api.updateProjectMilestone(this.projectId, this.milestoneId!, payload);
		
		req$.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Milestone created.' : 'Milestone updated.');
				this.router.navigate(['/projects', this.projectId, 'milestones']);
			},
			error: (e) => {
				console.error(e);
				this.error = this.isCreate ? 'Failed to create milestone.' : 'Failed to update milestone.';
			}
		});
	}
	
	cancel(): void {
		this.router.navigate(['/projects', this.projectId, 'milestones']);
	}
}
