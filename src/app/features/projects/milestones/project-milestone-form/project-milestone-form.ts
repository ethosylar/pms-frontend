import { ChangeDetectorRef, Component, OnInit, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from '@angular/forms';
import { finalize, } from 'rxjs/operators';

import {
	ApiResource,
	ApiService,
	ProjectDto,
	ProjectMilestoneDto,
	ProjectMilestoneUpsertPayload,
} from '../../../../core/services/api.service';

import { ToastService, } from '../../../../shared/ui/toast/toast';


@Component({
	standalone: true,

	selector:
		'app-project-milestone-form',

	imports: [
		CommonModule,
		RouterModule,
		ReactiveFormsModule,
	],

	templateUrl:
		'./project-milestone-form.html',

	styleUrls: [
		'./project-milestone-form.scss',
	],
})
export class ProjectMilestoneFormComponent
implements OnInit {

	loading = true;

	saving = false;

	error:
		string | null = null;


	projectId!: number;

	milestoneId:
		number | null = null;

	isCreate = true;


	project:
		ProjectDto | null = null;


	form: FormGroup;


	readonly milestoneStatuses = [
		{
			code: 'PENDING',
			name: 'Pending',
		},
		{
			code: 'DONE',
			name: 'Done',
		},
		{
			code: 'CANCELLED',
			name: 'Cancelled',
		},
	];


	constructor(
		private api: ApiService,
		private route: ActivatedRoute,
		private router: Router,
		private toast: ToastService,
		private fb: FormBuilder,
		private cdr: ChangeDetectorRef,
	) {

		this.form =
			this.fb.group({

				name: [
					'',
					[
						Validators.required,

						/*
						 * Prevent values containing
						 * whitespace only.
						 */
						Validators.pattern(
							/\S/
						),
					],
				],

				milestone_date: [
					null,
					[
						Validators.required,
					],
				],

				status: [
					'PENDING',
					[
						Validators.required,

						Validators.pattern(
							/^(PENDING|DONE|CANCELLED)$/
						),
					],
				],
			});


		/*
		 * Backend validation errors are attached
		 * directly to controls.
		 *
		 * Once the user changes that field,
		 * clear only the backend/server error.
		 */
		this.enableServerErrorClearing();
	}


	ngOnInit(): void {

		// -------------------------------------------------------------
		// Validate Project ID from route
		// -------------------------------------------------------------

		const projectId =
			Number(
				this.route.snapshot
					.paramMap
					.get(
						'projectId'
					)
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


		// -------------------------------------------------------------
		// Determine Create / Edit mode
		// -------------------------------------------------------------

		const milestoneParam =
			this.route.snapshot
				.paramMap
				.get(
					'milestoneId'
				);


		this.isCreate =
			!milestoneParam ||
			milestoneParam ===
				'new';


		if (
			!this.isCreate
		) {

			const milestoneId =
				Number(
					milestoneParam
				);


			if (
				!Number.isInteger(
					milestoneId
				) ||
				milestoneId <= 0
			) {

				this.error =
					'Invalid milestone ID.';

				this.loading =
					false;

				return;
			}


			this.milestoneId =
				milestoneId;
		}


		this.loadPage();
	}


	// =====================================================================
	// Load Project + Milestone
	// =====================================================================

	private loadPage(): void {

		this.loading =
			true;

		this.error =
			null;


		this.api
			.getProject(
				this.projectId
			)
			.subscribe({

				next: (
					response:
						ApiResource<ProjectDto>
				) => {

					this.project =
						response.data;


					/*
					 * Create page only needs the
					 * project information.
					 */
					if (
						this.isCreate
					) {

						this.loading =
							false;

						this.cdr
							.detectChanges();

						return;
					}


					this.loadMilestone();
				},


				error: (
					err: any
				) => {

					console.error(
						err
					);


					this.project =
						null;


					this.error =
						err?.error
							?.message ||
						'Failed to load project information.';


					this.loading =
						false;


					this.cdr
						.detectChanges();
				},
			});
	}


	private loadMilestone(): void {

		if (
			!this.milestoneId
		) {
			return;
		}


		this.api
			.getProjectMilestone(
				this.projectId,
				this.milestoneId
			)
			.pipe(

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
					response:
						ApiResource<
							ProjectMilestoneDto
						>
				) => {

					const milestone =
						response.data;


					this.form
						.patchValue({

							name:
								milestone
									.name,

							milestone_date:
								this.toDateInput(
									milestone
										.milestone_date
								),

							status:
								String(
									milestone
										.status ||
										'PENDING'
								)
								.trim()
								.toUpperCase(),
						});


					/*
					 * Existing data should not
					 * immediately appear touched.
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
						'Failed to load milestone.';
				},
			});
	}


	// =====================================================================
	// Field validation helpers
	// =====================================================================

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


		/*
		 * Laravel/server field error.
		 */
		if (
			errors['server']
		) {
			return String(
				errors[
					'server'
				]
			);
		}


		/*
		 * Required field.
		 */
		if (
			errors['required']
		) {
			return (
				`${label} is required.`
			);
		}


		/*
		 * Pattern validation.
		 */
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
					'status'
			) {
				return (
					'The selected milestone status is not supported.'
				);
			}


			return (
				`${label} has an unsupported format.`
			);
		}


		if (
			errors['maxlength']
		) {
			return (
				`${label} cannot exceed ` +
				`${errors['maxlength']
					.requiredLength} characters.`
			);
		}


		if (
			errors['minlength']
		) {
			return (
				`${label} must contain at least ` +
				`${errors['minlength']
					.requiredLength} characters.`
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


	// =====================================================================
	// Save
	// =====================================================================

	save(): void {

		this.error =
			null;


		/*
		 * Normalize values first.
		 */
		const nameControl =
			this.form.get(
				'name'
			);


		const statusControl =
			this.form.get(
				'status'
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


		statusControl
			?.setValue(

				String(
					statusControl.value ??
						''
				)
				.trim()
				.toUpperCase(),

				{
					emitEvent:
						false,
				}
			);


		/*
		 * Run validation again after
		 * normalization.
		 */
		this.form
			.updateValueAndValidity();


		if (
			this.form.invalid
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
			ProjectMilestoneUpsertPayload = {

				name:
					String(
						value.name
					)
					.trim(),

				milestone_date:
					value
						.milestone_date ||
					null,

				status:
					String(
						value.status
					)
					.trim()
					.toUpperCase(),
			};


		this.saving =
			true;


		const request$ =
			this.isCreate

				? this.api
					.createProjectMilestone(
						this.projectId,
						payload
					)

				: this.api
					.updateProjectMilestone(
						this.projectId,
						this.milestoneId!,
						payload
					);


		request$
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
								? 'Milestone created.'
								: 'Milestone updated.'
						);


					this.router
						.navigate([
							'/projects',
							this.projectId,
							'milestones',
						]);
				},


				error: (
					err: any
				) => {

					console.error(
						err
					);


					/*
					 * Laravel normally returns
					 *
					 * 422
					 * {
					 *     message: "...",
					 *     errors: {
					 *         field: ["..."]
					 *     }
					 * }
					 *
					 * Attach those messages directly
					 * to their form controls.
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


					/*
					 * Non-field-specific backend
					 * errors remain in the general
					 * alert.
					 */
					this.error =
						err?.error
							?.message ||
						(
							this.isCreate
								? 'Failed to create milestone.'
								: 'Failed to update milestone.'
						);
				},
			});
	}


	// =====================================================================
	// Laravel/API field validation
	// =====================================================================

	private applyApiFieldErrors(
		err: any
	): boolean {

		const errors =
			err?.error?.errors;


		if (
			err?.status !== 422 ||
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

			const fieldName =
				String(
					backendField
				)
				.split('.')[0];


			const control =
				this.form.get(
					fieldName
				);


			/*
			 * Some backend errors may describe
			 * something which is not represented
			 * by an input on this form.
			 */
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


			control
				.markAsTouched();


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


	// =====================================================================
	// Misc helpers
	// =====================================================================

	private toDateInput(
		value?:
			string | null
	): string | null {

		if (!value) {
			return null;
		}


		/*
		 * Already in HTML date-input format.
		 */
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


	cancel(): void {

		this.router
			.navigate([
				'/projects',
				this.projectId,
				'milestones',
			]);
	}
}