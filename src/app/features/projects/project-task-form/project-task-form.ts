import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import {
	ApiService,
	ApiCollection,
	TaskStatusDto,
	UserDto,
	ProjectTaskGanttDto,
	ProjectTaskUpsertPayload,
	ProjectMilestoneDto,
	StoredFileDto,
} from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	selector: 'app-project-task-form',
	imports: [CommonModule, RouterModule, ReactiveFormsModule],
	templateUrl: './project-task-form.html',
	styleUrls: ['./project-task-form.scss'],
})
export class ProjectTaskFormComponent implements OnInit {
	loading = true;
	saving = false;
	error: string | null = null;
	
	projectId!: number;
	taskId: number | null = null;
	isCreate = true;
	
	statuses: TaskStatusDto[] = [];
	users: Array<{ id: number; name: string }> = [];
	taskOptions: Array<{ id: number; name: string }> = [];
	
	milestones: ProjectMilestoneDto[] = [];
	milestone: Array<{ id: number; name: string }> = [];
	
	taskFiles: StoredFileDto[] = [];
	taskFilesLoading = false;
	taskFilesError: string | null = null;
	uploadingTaskFile = false;
	
	selectedTaskFile: File | null = null;
	selectedTaskFileName = '';
	
	form: FormGroup;
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef
		) {
		this.form = this.fb.group({
			name: ['', [Validators.required]],
			task_status_id: [null], // add Validators.required if backend requires
			assigned_to_user_id: [null],
			
			start_date: [null],
			end_date: [null],
			
			progress: [0],
			sort_order: [0],
			
			parent_task_id: [null],
			depends_on_task_id: [null],
			milestone_id: [null],
			
			description: [null],
			actual_task_status_id: [null],
			actual_start_date: [null],
			actual_end_date: [null],
			duration: [0],
			task_color: [null],
		});
	}
	
	ngOnInit(): void {
		this.projectId = Number(this.route.snapshot.paramMap.get('id'));
		
		const taskIdParam = this.route.snapshot.paramMap.get('taskId');
		this.isCreate = !taskIdParam || taskIdParam === 'new';
		this.taskId = this.isCreate ? null : Number(taskIdParam);
		
		if (this.taskId) {
			this.loadTaskFiles();
		}
		
		this.loading = true;
		
		forkJoin({
			statuses: this.api.getTaskStatuses({ per_page: 200, is_active: 1 }).pipe(catchError(() => of({ data: [] } as any))),
			users: this.api.getUsers({ per_page: 200 }).pipe(catchError(() => of({ data: [] } as any))),
			gantt: this.api.getProjectGantt(this.projectId).pipe(catchError(() => of({ project_id: this.projectId, tasks: [] } as any))),
			milestones: this.api.getProjectMilestones(this.projectId, { per_page: 200 }).pipe(catchError(() => of({ data: [] } as ApiCollection<ProjectMilestoneDto>))),
		})
		.pipe(
			switchMap((lk) => {
				this.statuses = (lk.statuses as ApiCollection<TaskStatusDto>)?.data ?? [];
				const u = (lk.users as ApiCollection<UserDto>)?.data ?? [];
				this.users = u.map(x => ({ id: x.id, name: x.name }));
				
				const tasks = (lk.gantt as { tasks: ProjectTaskGanttDto[] })?.tasks ?? [];
				this.taskOptions = tasks.map(t => ({ id: t.id, name: t.name }));
				
				const milestoneList =
				(lk.milestones as ApiCollection<ProjectMilestoneDto>)?.data ?? [];
				
				this.milestones = milestoneList; // keep full objects if you want
				
				this.milestone = milestoneList.map((m: ProjectMilestoneDto) => ({
					id: m.id,
					name: m.name
				}));
				
				
				if (this.isCreate) return of(null);
				
				const found = tasks.find(t => t.id === this.taskId);
				return of(found ?? null);
			}),
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			})
		)
		.subscribe({
			next: (t: ProjectTaskGanttDto | null) => {
				if (!t) return;
				
				this.form.patchValue({
					name: t.name,
					description: t.description ?? null,
					
					task_status_id: t.task_status_id ?? null,
					actual_task_status_id: t.actual_task_status_id ?? null,
					assigned_to_user_id: t.assigned_to_user_id ?? null,
					
					start_date: t.start_date ?? null,
					end_date: t.end_date ?? null,
					actual_start_date: t.actual_start_date ?? null,
					actual_end_date: t.actual_end_date ?? null,
					
					duration: t.duration ?? 0,
					task_color: t.task_color ?? null,
					
					progress: t.progress ?? 0,
					sort_order: t.sort_order ?? 0,
					
					parent_task_id: t.parent_task_id ?? null,
					depends_on_task_id: t.depends_on_task_id ?? null,
					milestone_id: t.milestone_id ?? null,
				});
				
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error(err);
				this.error = 'Failed to load task.';
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
		
		const payload: ProjectTaskUpsertPayload = {
			name: String(v.name).trim(),
			description: v.description || null,
			
			task_status_id: v.task_status_id ?? null,
			actual_task_status_id: v.actual_task_status_id ?? null,
			assigned_to_user_id: v.assigned_to_user_id ?? null,
			
			start_date: v.start_date || null,
			end_date: v.end_date || null,
			actual_start_date: v.actual_start_date || null,
			actual_end_date: v.actual_end_date || null,
			
			duration: Number.isFinite(Number(v.duration)) ? Number(v.duration) : 0,
			task_color: v.task_color || null,
			
			progress: Number.isFinite(Number(v.progress)) ? Number(v.progress) : 0,
			sort_order: Number.isFinite(Number(v.sort_order)) ? Number(v.sort_order) : 0,
			
			parent_task_id: v.parent_task_id ?? null,
			depends_on_task_id: v.depends_on_task_id ?? null,
			milestone_id: v.milestone_id ?? null,
		};
		
		this.saving = true;
		
		const id$ = this.isCreate
		? this.api.createProjectTask(this.projectId, payload).pipe(map(r => r.id))
		: this.api.updateProjectTask(this.taskId!, payload).pipe(map(() => this.taskId!));
		
		id$
		.pipe(finalize(() => {
			this.saving = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? 'Task created.' : 'Task updated.');
				this.router.navigate(['/projects', this.projectId, 'gantt']);
			},
			error: (err) => {
				console.error(err);
				this.error = this.isCreate ? 'Failed to create task.' : 'Failed to update task.';
				this.cdr.detectChanges();
			}
		});
	}
	
	cancel(): void {
		this.router.navigate(['/projects', this.projectId, 'gantt']);
	}
	
	private loadTaskFiles(): void {
		if (!this.taskId) {
			this.taskFiles = [];
			return;
		}
		
		this.taskFilesLoading = true;
		this.taskFilesError = null;
		
		this.api.getTaskFiles(this.taskId, { per_page: 100 })
		.pipe(finalize(() => {
			this.taskFilesLoading = false;
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: (res) => {
				this.taskFiles = res.data ?? [];
			},
			error: (err) => {
				console.error(err);
				this.taskFilesError = 'Failed to load task files.';
			}
		});
	}
	
	onTaskFileSelected(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;
		
		this.selectedTaskFile = file;
		this.selectedTaskFileName = file?.name ?? '';
		this.cdr.detectChanges();
	}
	
	downloadTaskFile(file: StoredFileDto): void {
		if (!this.taskId) return;
		
		this.api.downloadTaskFile(this.taskId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = file.original_name || `task-file-${file.id}`;
				a.click();
				window.URL.revokeObjectURL(url);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to download task file.');
			}
		});
	}
	
	removeTaskFile(file: StoredFileDto): void {
		if (!this.taskId) return;
		if (!confirm(`Remove file "${file.original_name}"?`)) return;
		
		this.api.detachTaskFile(this.taskId, file.id).subscribe({
			next: () => {
				this.toast.success('Task file removed.');
				this.loadTaskFiles();
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to remove task file.');
			}
		});
	}
	
	formatBytes(size?: number | null): string {
		const bytes = Number(size ?? 0);
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	}
	
	uploadSelectedTaskFile(): void {
		if (!this.taskId || !this.selectedTaskFile) return;
		
		this.uploadingTaskFile = true;
		this.taskFilesError = null;
		
		this.api.uploadTaskFile(this.taskId, this.selectedTaskFile)
		.pipe(finalize(() => {
			this.uploadingTaskFile = false;
			this.selectedTaskFile = null;
			this.selectedTaskFileName = '';
			this.cdr.detectChanges();
		}))
		.subscribe({
			next: () => {
				this.toast.success('Task file uploaded.');
				this.loadTaskFiles();
			},
			error: (err) => {
				console.error(err);
				this.taskFilesError = 'Failed to upload task file.';
			}
		});
	}
	
	canPreviewFile(file: StoredFileDto): boolean {
		const mime = (file.mime_type || '').toLowerCase();
		return (
			mime.startsWith('image/') ||
			mime === 'application/pdf' ||
			mime.startsWith('text/')
		);
	}
	
	previewTaskFile(file: StoredFileDto): void {
		if (!this.taskId) return;
		
		this.api.downloadTaskFile(this.taskId, file.id).subscribe({
			next: (blob) => {
				const url = window.URL.createObjectURL(blob);
				window.open(url, '_blank', 'noopener,noreferrer');
				setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
			},
			error: (err) => {
				console.error(err);
				this.toast.error('Failed to open task file.');
			}
		});
	}
}
