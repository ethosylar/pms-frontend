import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { forkJoin, of, } from 'rxjs';
import { catchError, finalize, map, switchMap, } from 'rxjs/operators';

import {
	ApiCollection,
	ApiService,
	ProjectMilestoneDto,
	ProjectTaskGanttDto,
	ProjectTaskUpsertPayload,
	StoredFileDto,
	TaskStatusDto,
	UserDto,
} from '../../../core/services/api.service';

import { ToastService, } from '../../../shared/ui/toast/toast';

@Component({
	standalone: true,
	
	selector:
	'app-project-task-form',
	
	imports: [
		CommonModule,
		RouterModule,
		ReactiveFormsModule,
	],
	
	templateUrl:
	'./project-task-form.html',
	
	styleUrls: [
		'./project-task-form.scss',
	],
})
export class ProjectTaskFormComponent
implements OnInit {
	
	loading = true;
	saving = false;
	
	error:
	string | null = null;
	
	
	projectId!: number;
	
	taskId:
	number | null = null;
	
	isCreate = true;
	
	
	// -------------------------------------------------------------------------
	// Lookup data
	// -------------------------------------------------------------------------
	
	statuses:
	TaskStatusDto[] = [];
	
	users:
	Array<{
		id: number;
		name: string;
	}> = [];
	
	taskOptions:
	Array<{
		id: number;
		name: string;
	}> = [];
	
	milestones:
	ProjectMilestoneDto[] = [];
	
	
	// -------------------------------------------------------------------------
	// Task Files
	// -------------------------------------------------------------------------
	
	taskFiles:
	StoredFileDto[] = [];
	
	taskFilesLoading =
	false;
	
	taskFilesError:
	string | null = null;
	
	uploadingTaskFile =
	false;
	
	selectedTaskFile:
	File | null = null;
	
	selectedTaskFileName =
	'';
	
	
	// -------------------------------------------------------------------------
	// Main form
	// -------------------------------------------------------------------------
	
	form: FormGroup;
	
	
	constructor(
		private fb: FormBuilder,
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private cdr: ChangeDetectorRef,
		) {
		
		this.form =
		this.fb.group({
			
			name: [
				'',
				[
					Validators.required,
					Validators.pattern(/\S/),
				],
			],
			
			description: [
				null,
			],
			
			/*
				* These remain optional because your
				* current frontend does not mark them
				* required.
			*/
			task_status_id: [
				null,
	[
		Validators.required,
	],
			],
			
			actual_task_status_id: [
				null,
			],
			
			assigned_to_user_id: [
				null,
			],
			
			
			// Planned schedule
			
			start_date: [
				null,
	[
		Validators.required,
	],
			],
			
			end_date: [
				null,
	[
		Validators.required,
	],
			],
			
			
			// Actual schedule
			
			actual_start_date: [
				null,
			],
			
			actual_end_date: [
				null,
			],
			
			
			progress: [
				0,
				[
					Validators.min(0),
					Validators.max(100),
				],
			],
			
			duration: [
				0,
				[
					Validators.min(0),
				],
			],
			
			sort_order: [
				0,
				[
					Validators.min(0),
				],
			],
			
			task_color: [
				null,
				[
					/*
						* HTML colour fields normally
						* generate this format.
					*/
					Validators.pattern(
						/^#[0-9A-Fa-f]{6}$/
					),
				],
			],
			
			
			// Relationships
			
			parent_task_id: [
				null,
			],
			
			depends_on_task_id: [
				null,
			],
			
			milestone_id: [
				null,
			],
		});
		
		
		/*
			* Laravel 422 errors can be attached to
			* individual controls.
			*
			* When a user edits that field afterward,
			* remove only the server-side error.
		*/
		this.enableServerErrorClearing();
	}
	
	
	// =========================================================================
	// Initialization
	// =========================================================================
	
	ngOnInit(): void {
		
		// -----------------------------------------------------------------
		// Project ID
		// -----------------------------------------------------------------
		
		const projectId =
		Number(
			this.route.snapshot
			.paramMap
			.get('id')
		);
		
		
		if (
			!Number.isInteger(
				projectId
			) ||
			projectId <= 0
			) {
			
			this.error =
			'Invalid project ID.';
			
			this.loading =
			false;
			
			return;
		}
		
		
		this.projectId =
		projectId;
		
		
		// -----------------------------------------------------------------
		// Task ID / mode
		// -----------------------------------------------------------------
		
		const taskIdParam =
		this.route.snapshot
		.paramMap
		.get(
			'taskId'
		);
		
		
		this.isCreate =
		!taskIdParam ||
		taskIdParam ===
		'new';
		
		
		if (
			!this.isCreate
			) {
			
			const parsedTaskId =
			Number(
				taskIdParam
			);
			
			
			if (
				!Number.isInteger(
					parsedTaskId
				) ||
				parsedTaskId <= 0
				) {
				
				this.error =
				'Invalid task ID.';
				
				this.loading =
				false;
				
				return;
			}
			
			
			this.taskId =
			parsedTaskId;
			
			
			this.loadTaskFiles();
		}
		
		
		this.loadForm();
	}
	
	
	// =========================================================================
	// Load lookups + task
	// =========================================================================
	
	private loadForm(): void {
		
		this.loading =
		true;
		
		this.error =
		null;
		
		
		forkJoin({
			
			statuses:
			this.api
			.getTaskStatuses({
				per_page:
				200,
				
				is_active:
				1,
			})
			.pipe(
				catchError(
					() =>
					of({
						data:
						[],
					} as any)
				)
			),
			
			
			users:
			this.api
			.getUsers({
				per_page:
				200,
			})
			.pipe(
				catchError(
					() =>
					of({
						data:
						[],
					} as any)
				)
			),
			
			
			gantt:
			this.api
			.getProjectGantt(
				this.projectId
			)
			.pipe(
				catchError(
					() =>
					of({
						project_id:
						this.projectId,
						
						tasks:
						[],
					} as any)
				)
			),
			
			
			milestones:
			this.api
			.getProjectMilestones(
				this.projectId,
				{
					per_page:
					200,
				}
			)
			.pipe(
				catchError(
					() =>
					of({
						data:
						[],
					} as
					ApiCollection<
					ProjectMilestoneDto
					>)
				)
			),
		})
		.pipe(
			
			switchMap(
				result => {
					
					// -----------------------------------------------------
					// Statuses
					// -----------------------------------------------------
					
					this.statuses =
					(
						result.statuses as
						ApiCollection<
						TaskStatusDto
						>
					)
					?.data ??
					[];
					
					
					// -----------------------------------------------------
					// Users
					// -----------------------------------------------------
					
					const users =
					(
						result.users as
						ApiCollection<
						UserDto
						>
					)
					?.data ??
					[];
					
					
					this.users =
					users.map(
						user => ({
							id:
							user.id,
							
							name:
							user.name,
						})
					);
					
					
					// -----------------------------------------------------
					// Tasks / Gantt
					// -----------------------------------------------------
					
					const tasks =
					this.normalizeTasks(
						(
							result.gantt as
							{
								tasks:
								ProjectTaskGanttDto[];
							}
						)
						?.tasks
					);
					
					
					/*
						* Do not allow an edited task to
						* select itself as its own Parent
						* or Dependency.
					*/
					this.taskOptions =
					tasks
					.filter(
						task =>
						task.id !==
						this.taskId
					)
					.map(
						task => ({
							id:
							task.id,
							
							name:
							task.name,
						})
					);
					
					
					// -----------------------------------------------------
					// Milestones
					// -----------------------------------------------------
					
					this.milestones =
					(
						result.milestones as
						ApiCollection<
						ProjectMilestoneDto
						>
					)
					?.data ??
					[];
					
					
					// -----------------------------------------------------
					// Create mode
					// -----------------------------------------------------
					
					if (
						this.isCreate
						) {
						return of(
							null
						);
					}
					
					
					// -----------------------------------------------------
					// Edit mode
					// -----------------------------------------------------
					
					const found =
					tasks.find(
						task =>
						task.id ===
						this.taskId
					);
					
					
					return of(
						found ??
						null
					);
				}
			),
			
			
			finalize(
				() => {
					
					this.loading =
					false;
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: (
				task:
				ProjectTaskGanttDto |
				null
				) => {
				
				if (
					this.isCreate
					) {
					return;
				}
				
				
				if (!task) {
					
					this.error =
					'Task could not be found in this project.';
					
					return;
				}
				
				
				this.form
				.patchValue({
					
					name:
					task.name,
					
					description:
					task.description ??
					null,
					
					
					task_status_id:
					task.task_status_id ??
					null,
					
					actual_task_status_id:
					task.actual_task_status_id ??
					null,
					
					assigned_to_user_id:
					task.assigned_to_user_id ??
					null,
					
					
					start_date:
					this.toDateInput(
						task.start_date
					),
					
					end_date:
					this.toDateInput(
						task.end_date
					),
					
					actual_start_date:
					this.toDateInput(
						task.actual_start_date
					),
					
					actual_end_date:
					this.toDateInput(
						task.actual_end_date
					),
					
					
					duration:
					task.duration ??
					0,
					
					task_color:
					task.task_color ??
					null,
					
					progress:
					task.progress ??
					0,
					
					sort_order:
					task.sort_order ??
					0,
					
					
					parent_task_id:
					task.parent_task_id ??
					null,
					
					depends_on_task_id:
					task.depends_on_task_id ??
					null,
					
					milestone_id:
					task.milestone_id ??
					null,
				});
				
				
				/*
					* Existing records should not immediately
					* look like edited/invalid fields.
				*/
				this.form
				.markAsPristine();
				
				this.form
				.markAsUntouched();
				
				
				this.cdr
				.detectChanges();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.error =
				err?.error
				?.message ||
				'Failed to load task.';
			},
		});
	}
	
	
	// =========================================================================
	// Validation
	// =========================================================================
	
	isInvalid(
		controlName: string
		): boolean {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		return !!control &&
		control.invalid &&
		(
			control.touched ||
			control.dirty
		);
	}
	
	
	fieldError(
		controlName: string,
		label: string
		): string {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		if (
			!control?.errors
			) {
			return '';
		}
		
		
		const errors =
		control.errors;
		
		
		// Laravel / backend error
		
		if (
			errors['server']
			) {
			return String(
				errors[
					'server'
				]
			);
		}
		
		
		if (
			errors['required']
			) {
			return (
				`${label} is required.`
			);
		}
		
		
		if (
			errors['pattern']
			) {
			
			if (
				controlName ===
				'name'
				) {
				return (
					'Name cannot be blank or contain only spaces.'
				);
			}
			
			
			if (
				controlName ===
				'task_color'
				) {
				return (
					'Task Color must use a valid hexadecimal colour such as #0D6EFD.'
				);
			}
			
			
			return (
				`${label} has an unsupported format.`
			);
		}
		
		
		if (
			errors['min']
			) {
			return (
				`${label} must be ` +
				`${errors['min'].min} or greater.`
			);
		}
		
		
		if (
			errors['max']
			) {
			return (
				`${label} cannot exceed ` +
				`${errors['max'].max}.`
			);
		}
		
		
		if (
			errors['dateOrder']
			) {
			return String(
				errors[
					'dateOrder'
				]
			);
		}
		
		
		if (
			errors['selfReference']
			) {
			return String(
				errors[
					'selfReference'
				]
			);
		}
		
		
		if (
			errors['relationship']
			) {
			return String(
				errors[
					'relationship'
				]
			);
		}
		
		
		return (
			`${label} is invalid.`
		);
	}
	
	
	private enableServerErrorClearing():
	void {
		
		for (
			const control of
			Object.values(
				this.form.controls
			)
			) {
			
			control.valueChanges
			.subscribe(
				() => {
					
					const errors =
					control.errors;
					
					
					if (
						!errors ||
						!errors[
							'server'
						]
						) {
						return;
					}
					
					
					const {
						server:
						_removedServerError,
						
						...remainingErrors
					} = errors;
					
					
					control.setErrors(
						
						Object.keys(
							remainingErrors
						).length
						? remainingErrors
						: null,
						
						{
							emitEvent:
							false,
						}
					);
				}
			);
		}
	}
	
	
	private validateDates():
	boolean {
		
		/*
			* Remove only validation errors which
			* are generated by this method.
		*/
		this.clearControlError(
			'end_date',
			'dateOrder'
		);
		
		this.clearControlError(
			'actual_end_date',
			'dateOrder'
		);
		
		
		let valid =
		true;
		
		
		// -----------------------------------------------------------------
		// Planned dates
		// -----------------------------------------------------------------
		
		const startDate =
		this.form.get(
			'start_date'
		)?.value;
		
		
		const endDate =
		this.form.get(
			'end_date'
		)?.value;
		
		
		if (
			startDate &&
			endDate &&
			endDate <
			startDate
			) {
			
			this.addControlError(
				'end_date',
				'dateOrder',
				'End Date cannot be before Start Date.'
			);
			
			
			valid =
			false;
		}
		
		
		// -----------------------------------------------------------------
		// Actual dates
		// -----------------------------------------------------------------
		
		const actualStart =
		this.form.get(
			'actual_start_date'
		)?.value;
		
		
		const actualEnd =
		this.form.get(
			'actual_end_date'
		)?.value;
		
		
		if (
			actualStart &&
			actualEnd &&
			actualEnd <
			actualStart
			) {
			
			this.addControlError(
				'actual_end_date',
				'dateOrder',
				'Actual End Date cannot be before Actual Start Date.'
			);
			
			
			valid =
			false;
		}
		
		
		return valid;
	}
	
	
	private validateRelationships():
	boolean {
		
		this.clearControlError(
			'parent_task_id',
			'selfReference'
		);
		
		this.clearControlError(
			'depends_on_task_id',
			'selfReference'
		);
		
		this.clearControlError(
			'depends_on_task_id',
			'relationship'
		);
		
		
		let valid =
		true;
		
		
		const parentTaskId =
		this.numericOrNull(
			this.form.get(
				'parent_task_id'
			)?.value
		);
		
		
		const dependencyTaskId =
		this.numericOrNull(
			this.form.get(
				'depends_on_task_id'
			)?.value
		);
		
		
		/*
			* Defensive validation even though the
			* current task is removed from dropdowns.
		*/
		if (
			this.taskId &&
			parentTaskId ===
			this.taskId
			) {
			
			this.addControlError(
				'parent_task_id',
				'selfReference',
				'A task cannot be its own parent.'
			);
			
			
			valid =
			false;
		}
		
		
		if (
			this.taskId &&
			dependencyTaskId ===
			this.taskId
			) {
			
			this.addControlError(
				'depends_on_task_id',
				'selfReference',
				'A task cannot depend on itself.'
			);
			
			
			valid =
			false;
		}
		
		
		/*
			* Prevent exactly the same task from being
			* selected as both Parent and Dependency.
		*/
		if (
			parentTaskId &&
			dependencyTaskId &&
			parentTaskId ===
			dependencyTaskId
			) {
			
			this.addControlError(
				'depends_on_task_id',
				'relationship',
				'Parent Task and Dependency should not be the same task.'
			);
			
			
			valid =
			false;
		}
		
		
		return valid;
	}
	
	
	private addControlError(
		controlName: string,
		errorName: string,
		message: string
		): void {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		if (!control) {
			return;
		}
		
		
		control.setErrors({
			...(
				control.errors ??
				{}
			),
			
			[errorName]:
			message,
		});
		
		
		control.markAsTouched();
	}
	
	
	private clearControlError(
		controlName: string,
		errorName: string
		): void {
		
		const control =
		this.form.get(
			controlName
		);
		
		
		const errors =
		control?.errors;
		
		
		if (
			!control ||
			!errors ||
			!errors[
				errorName
			]
			) {
			return;
		}
		
		
		const {
			[errorName]:
			_removedError,
			
			...remainingErrors
		} = errors;
		
		
		control.setErrors(
			Object.keys(
				remainingErrors
			).length
			? remainingErrors
			: null
		);
	}
	
	
	private applyApiFieldErrors(
		err: any
		): boolean {
		
		const errors =
		err?.error?.errors;
		
		
		if (
			err?.status !==
			422 ||
			!errors ||
			typeof errors !==
			'object'
			) {
			return false;
		}
		
		
		let applied =
		false;
		
		
		for (
			const [
				backendField,
				messages,
			]
			of Object.entries(
				errors
			)
			) {
			
			/*
				* Supports standard keys as well as
				* nested Laravel keys such as:
				*
				* task.name
			*/
			const candidates = [
				String(
					backendField
				),
				
				String(
					backendField
				)
				.split('.')[0],
				
				String(
					backendField
				)
				.split('.')
				.at(-1) ??
				'',
			];
			
			
			const fieldName =
			candidates.find(
				name =>
				!!name &&
				!!this.form
				.get(
					name
				)
			);
			
			
			if (!fieldName) {
				continue;
			}
			
			
			const control =
			this.form.get(
				fieldName
			);
			
			
			if (!control) {
				continue;
			}
			
			
			const message =
			Array.isArray(
				messages
			)
			? String(
				messages[0] ??
				'Invalid value.'
			)
			: String(
				messages
			);
			
			
			control.setErrors({
				...(
					control.errors ??
					{}
				),
				
				server:
				message,
			});
			
			
			control.markAsTouched();
			
			
			applied =
			true;
		}
		
		
		return applied;
	}
	
	
	private focusFirstInvalidField():
	void {
		
		setTimeout(
			() => {
				
				const element =
				window.document
				.querySelector<
				HTMLElement
				>(
					'.is-invalid'
				);
				
				
				if (!element) {
					return;
				}
				
				
				element
				.scrollIntoView({
					behavior:
					'smooth',
					
					block:
					'center',
				});
				
				
				element.focus();
				
			},
			50
		);
	}
	
	
	// =========================================================================
	// Save
	// =========================================================================
	
	save(): void {
		
		this.error =
		null;
		
		
		// -----------------------------------------------------------------
		// Normalize Name
		// -----------------------------------------------------------------
		
		const nameControl =
		this.form.get(
			'name'
		);
		
		
		nameControl
		?.setValue(
			
			String(
				nameControl.value ??
				''
			).trim(),
			
			{
				emitEvent:
				false,
			}
		);
		
		
		this.form
		.updateValueAndValidity();
		
		
		const datesValid =
		this.validateDates();
		
		
		const relationshipsValid =
		this.validateRelationships();
		
		
		if (
			this.form.invalid ||
			!datesValid ||
			!relationshipsValid
			) {
			
			this.form
			.markAllAsTouched();
			
			
			this.error =
			'Please correct the highlighted fields before submitting.';
			
			
			this.focusFirstInvalidField();
			
			
			this.cdr
			.detectChanges();
			
			
			return;
		}
		
		
		const value =
		this.form
		.getRawValue();
		
		
		const payload:
		ProjectTaskUpsertPayload = {
			
			name:
			String(
				value.name
			).trim(),
			
			description:
			this.nullText(
				value.description
			),
			
			
			task_status_id:
			this.numericOrNull(
				value.task_status_id
			),
			
			actual_task_status_id:
			this.numericOrNull(
				value.actual_task_status_id
			),
			
			assigned_to_user_id:
			this.numericOrNull(
				value.assigned_to_user_id
			),
			
			
			start_date:
			value.start_date ||
			null,
			
			end_date:
			value.end_date ||
			null,
			
			actual_start_date:
			value.actual_start_date ||
			null,
			
			actual_end_date:
			value.actual_end_date ||
			null,
			
			
			duration:
			this.nonNegativeNumber(
				value.duration
			),
			
			task_color:
			this.nullText(
				value.task_color
			),
			
			
			progress:
			this.percent(
				value.progress
			),
			
			sort_order:
			this.nonNegativeInteger(
				value.sort_order
			),
			
			
			parent_task_id:
			this.numericOrNull(
				value.parent_task_id
			),
			
			depends_on_task_id:
			this.numericOrNull(
				value.depends_on_task_id
			),
			
			milestone_id:
			this.numericOrNull(
				value.milestone_id
			),
		};
		
		
		this.saving =
		true;
		
		
		const id$ =
		this.isCreate
		
		? this.api
		.createProjectTask(
			this.projectId,
			payload
		)
		.pipe(
			map(
				response =>
				response.id
			)
		)
		
		: this.api
		.updateProjectTask(
			this.taskId!,
			payload
		)
		.pipe(
			map(
				() =>
				this.taskId!
			)
		);
		
		
		id$
		.pipe(
			
			finalize(
				() => {
					
					this.saving =
					false;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: () => {
				
				this.toast
				.success(
					this.isCreate
					? 'Task created.'
					: 'Task updated.'
				);
				
				
				this.router
				.navigate([
					'/projects',
					this.projectId,
					'gantt',
				]);
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				/*
					* Laravel field validation:
					*
					* {
					*   errors: {
					*     end_date: ["..."]
					*   }
					* }
				*/
				if (
					this.applyApiFieldErrors(
						err
					)
					) {
					
					this.error =
					'Please correct the highlighted fields.';
					
					
					this.focusFirstInvalidField();
					
					
					this.cdr
					.detectChanges();
					
					
					return;
				}
				
				
				this.error =
				err?.error
				?.message ||
				(
					this.isCreate
					? 'Failed to create task.'
					: 'Failed to update task.'
				);
			},
		});
	}
	
	
	cancel(): void {
		
		this.router
		.navigate([
			'/projects',
			this.projectId,
			'gantt',
		]);
	}
	
	
	// =========================================================================
	// Task Files
	// =========================================================================
	
	private loadTaskFiles(): void {
		
		if (
			!this.taskId
			) {
			
			this.taskFiles =
			[];
			
			return;
		}
		
		
		this.taskFilesLoading =
		true;
		
		this.taskFilesError =
		null;
		
		
		this.api
		.getTaskFiles(
			this.taskId,
			{
				per_page:
				100,
			}
		)
		.pipe(
			
			finalize(
				() => {
					
					this.taskFilesLoading =
					false;
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: response => {
				
				this.taskFiles =
				response.data ??
				[];
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.taskFilesError =
				err?.error
				?.message ||
				'Failed to load task files.';
			},
		});
	}
	
	
	onTaskFileSelected(
		event: Event
		): void {
		
		const input =
		event.target as
		HTMLInputElement;
		
		
		const file =
		input.files?.[0] ??
		null;
		
		
		this.selectedTaskFile =
		file;
		
		
		this.selectedTaskFileName =
		file?.name ??
		'';
		
		
		this.taskFilesError =
		null;
		
		
		this.cdr
		.detectChanges();
	}
	
	
	uploadSelectedTaskFile():
	void {
		
		if (
			!this.taskId ||
			!this.selectedTaskFile
			) {
			return;
		}
		
		
		this.uploadingTaskFile =
		true;
		
		this.taskFilesError =
		null;
		
		
		this.api
		.uploadTaskFile(
			this.taskId,
			this.selectedTaskFile
		)
		.pipe(
			
			finalize(
				() => {
					
					this.uploadingTaskFile =
					false;
					
					
					this.selectedTaskFile =
					null;
					
					
					this.selectedTaskFileName =
					'';
					
					
					this.cdr
					.detectChanges();
				}
			)
		)
		.subscribe({
			
			next: () => {
				
				this.toast
				.success(
					'Task file uploaded.'
				);
				
				
				this.loadTaskFiles();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.taskFilesError =
				err?.error
				?.message ||
				'Failed to upload task file.';
			},
		});
	}
	
	
	downloadTaskFile(
		file: StoredFileDto
		): void {
		
		if (
			!this.taskId
			) {
			return;
		}
		
		
		this.api
		.downloadTaskFile(
			this.taskId,
			file.id
		)
		.subscribe({
			
			next: blob => {
				
				const url =
				window.URL
				.createObjectURL(
					blob
				);
				
				
				const anchor =
				window.document
				.createElement(
					'a'
				);
				
				
				anchor.href =
				url;
				
				
				anchor.download =
				file.original_name ||
				`task-file-${file.id}`;
				
				
				anchor.click();
				
				
				window.URL
				.revokeObjectURL(
					url
				);
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.toast
				.error(
					'Failed to download task file.'
				);
			},
		});
	}
	
	
	previewTaskFile(
		file: StoredFileDto
		): void {
		
		if (
			!this.taskId
			) {
			return;
		}
		
		
		this.api
		.downloadTaskFile(
			this.taskId,
			file.id
		)
		.subscribe({
			
			next: blob => {
				
				const url =
				window.URL
				.createObjectURL(
					blob
				);
				
				
				window.open(
					url,
					'_blank',
					'noopener,noreferrer'
				);
				
				
				setTimeout(
					() =>
					window.URL
					.revokeObjectURL(
						url
					),
					60_000
				);
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.toast
				.error(
					'Failed to open task file.'
				);
			},
		});
	}
	
	
	removeTaskFile(
		file: StoredFileDto
		): void {
		
		if (
			!this.taskId
			) {
			return;
		}
		
		
		const confirmed =
		window.confirm(
			`Remove file "${file.original_name}"?`
		);
		
		
		if (!confirmed) {
			return;
		}
		
		
		this.api
		.detachTaskFile(
			this.taskId,
			file.id
		)
		.subscribe({
			
			next: () => {
				
				this.toast
				.success(
					'Task file removed.'
				);
				
				
				this.loadTaskFiles();
			},
			
			
			error: (
				err: any
				) => {
				
				console.error(
					err
				);
				
				
				this.toast
				.error(
					err?.error
					?.message ||
					'Failed to remove task file.'
				);
			},
		});
	}
	
	
	canPreviewFile(
		file: StoredFileDto
		): boolean {
		
		const mime =
		(
			file.mime_type ||
			''
		)
		.toLowerCase();
		
		
		return (
			mime.startsWith(
				'image/'
			) ||
			
			mime ===
			'application/pdf' ||
			
			mime.startsWith(
				'text/'
			)
		);
	}
	
	
	formatBytes(
		size?:
		number | null
		): string {
		
		const bytes =
		Number(
			size ??
			0
		);
		
		
		if (
			bytes < 1024
			) {
			return (
				`${bytes} B`
			);
		}
		
		
		if (
			bytes <
			1024 * 1024
			) {
			return (
				`${(
				bytes /
				1024
				)
				.toFixed(1)} KB`
			);
		}
		
		
		if (
			bytes <
			1024 *
			1024 *
			1024
			) {
			return (
				`${(
				bytes /
				(
				1024 *
				1024
				)
				)
				.toFixed(1)} MB`
			);
		}
		
		
		return (
			`${(
			bytes /
			(
			1024 *
			1024 *
			1024
			)
			)
			.toFixed(1)} GB`
		);
	}
	
	
	// =========================================================================
	// Utility helpers
	// =========================================================================
	
	private normalizeTasks(
		value: unknown
		): ProjectTaskGanttDto[] {
		
		if (
			Array.isArray(
				value
			)
			) {
			return (
				value as
				ProjectTaskGanttDto[]
			);
		}
		
		
		if (
			value &&
			typeof value ===
			'object' &&
			Array.isArray(
				(value as any)
				.data
			)
			) {
			return (
				value as any
			).data;
		}
		
		
		return [];
	}
	
	
	private toDateInput(
		value?:
		string | null
		): string | null {
		
		if (!value) {
			return null;
		}
		
		
		if (
			/^\d{4}-\d{2}-\d{2}$/
			.test(
				value
			)
			) {
			return value;
		}
		
		
		const date =
		new Date(
			value
		);
		
		
		if (
			Number.isNaN(
				date.getTime()
			)
			) {
			return null;
		}
		
		
		const year =
		date
		.getFullYear();
		
		
		const month =
		String(
			date.getMonth() +
			1
		)
		.padStart(
			2,
			'0'
		);
		
		
		const day =
		String(
			date.getDate()
		)
		.padStart(
			2,
			'0'
		);
		
		
		return (
			`${year}-${month}-${day}`
		);
	}
	
	
	private nullText(
		value: unknown
		): string | null {
		
		const text =
		String(
			value ??
			''
		)
		.trim();
		
		
		return (
			text ||
			null
		);
	}
	
	
	private numericOrNull(
		value: unknown
		): number | null {
		
		if (
			value ===
			null ||
			value ===
			undefined ||
			value ===
			''
			) {
			return null;
		}
		
		
		const number =
		Number(
			value
		);
		
		
		return (
			Number.isFinite(
				number
			)
			? number
			: null
		);
	}
	
	
	private nonNegativeNumber(
		value: unknown
		): number {
		
		const number =
		Number(
			value
		);
		
		
		if (
			!Number.isFinite(
				number
			)
			) {
			return 0;
		}
		
		
		return Math.max(
			0,
			number
		);
	}
	
	
	private nonNegativeInteger(
		value: unknown
		): number {
		
		const number =
		Number(
			value
		);
		
		
		if (
			!Number.isFinite(
				number
			)
			) {
			return 0;
		}
		
		
		return Math.max(
			0,
			Math.floor(
				number
			)
		);
	}
	
	
	private percent(
		value: unknown
		): number {
		
		const number =
		Number(
			value
		);
		
		
		if (
			!Number.isFinite(
				number
			)
			) {
			return 0;
		}
		
		
		return Math.max(
			0,
			Math.min(
				100,
				number
			)
		);
	}
}