import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, } from "@angular/forms";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { finalize } from "rxjs/operators";
import { ApiService, ProjectCategoryDto, ProjectCategoryUpsertPayload, } from "../../../../core/services/api.service";
import { ToastService } from "../../../../shared/ui/toast/toast";

@Component({
    standalone: true,	
    selector: "app-project-categories-form",	
    imports: [CommonModule, ReactiveFormsModule, RouterModule],	
    templateUrl: "./project-categories-form.html",	
    styleUrls: ["./project-categories-form.scss"],
})
export class ProjectCategoriesFormComponent implements OnInit {
    loading = true;	
    saving = false;	
    error: string | null = null;	
    isCreate = true;	
    categoryId: number | null = null;	
    category: ProjectCategoryDto | null = null;	
    form: FormGroup;	
    constructor(
        private fb: FormBuilder,
        private api: ApiService,
        private route: ActivatedRoute,
        private router: Router,
        private toast: ToastService,
        private cdr: ChangeDetectorRef,
		) {
        this.form = this.fb.group({
            // ---------------------------------------------------------
            // Required
            // ---------------------------------------------------------
			code: [
                "",
                [
                    Validators.required,
                    Validators.pattern(/\S/),
                    Validators.maxLength(50),
				],
			],			
            name: [
                "",
                [
                    Validators.required,
                    Validators.pattern(/\S/),
                    Validators.maxLength(150),
				],
			],
			
            // ---------------------------------------------------------
            // Optional classification information
            // ---------------------------------------------------------
			
            group: [null, [Validators.maxLength(20)]],			
            year: [
                null,
                [
                    Validators.pattern(/^\d+$/),
					
                    Validators.min(2000),
					
                    Validators.max(2100),
				],
			],			
            sort_order: [0, [Validators.pattern(/^\d+$/), Validators.min(0)]],			
            is_active: [true],
		});
		
        this.enableServerErrorClearing();
	}
	
    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get("id");		
        this.isCreate = !idParam || idParam === "new";		
        if (this.isCreate) {
            this.loading = false;			
            return;
		}
		
        const id = Number(idParam);		
        if (!Number.isInteger(id) || id <= 0) {
            this.error = "Invalid project category ID.";			
            this.loading = false;			
            return;
		}
		
        this.categoryId = id;		
        this.loadCategory();
	}
	
    // =========================================================================
    // Load
    // =========================================================================
	
    private loadCategory(): void {
        this.loading = true;		
        this.error = null;		
        this.api
		.getProjectCategory(this.categoryId!)
		.pipe(
			finalize(() => {
				this.loading = false;
				
				this.cdr.detectChanges();
			}),
		)
		.subscribe({
			next: (response) => {
				const category = response.data;				
				this.category = category;				
				this.form.patchValue({
					code: category.code,					
					name: category.name,					
					group: category.group ?? null,					
					year: category.year ?? null,					
					sort_order: category.sort_order ?? 0,					
					is_active: Boolean(category.is_active),
				});
			},
			
			error: (err: any) => {
				console.error(err);				
				this.error = this.apiErrorMessage(err, "Failed to load project category.",);
			},
		});
	}
	
    // =========================================================================
    // Save
    // =========================================================================
	
    save(): void {
        if (this.saving) {
            return;
		}
		
        this.error = null;		
        this.normaliseCode();		
        if (this.form.invalid) {
            this.form.markAllAsTouched();			
            this.error = "Please correct the highlighted fields before submitting.";			
            this.focusFirstInvalidField();			
            return;
		}
		
        const raw = this.form.getRawValue();		
        const payload: ProjectCategoryUpsertPayload = {
            code: String(raw.code ?? "").trim().toUpperCase(),			
            name: String(raw.name ?? "").trim(),			
            group: this.nullableUppercase(raw.group),			
            year: this.nullableNumber(raw.year),			
            sort_order: this.nullableNumber(raw.sort_order) ?? 0,			
            is_active: Boolean(raw.is_active),
		};
		
        this.saving = true;		
        const request$ = this.isCreate
		? this.api.createProjectCategory(payload)
		: this.api.updateProjectCategory(this.categoryId!, payload);
		
        request$
		.pipe(
			finalize(() => {
				this.saving = false;				
				this.cdr.detectChanges();
			}),
		)
		.subscribe({
			next: () => {
				this.toast.success(this.isCreate ? "Project category created." : "Project category updated.",);				
				this.router.navigate(["/admin/project-categories"]);
			},
			
			error: (err: any) => {
				console.error(err);				
				if (this.applyApiFieldErrors(err)) {
					this.error = "Please correct the highlighted fields.";					
					this.focusFirstInvalidField();					
					return;
				}				
				/*
					* Some APIs may return duplicate
					* errors as a conflict rather than
					* Laravel's normal 422 structure.
				*/
				if (err?.status === 409 && String(err?.error?.message ?? "").toLowerCase().includes("code")) {
					const control = this.form.get("code");					
					control?.setErrors({
						...(control.errors ?? {}),						
						server: "This project category code already exists.",
					});					
					control?.markAsTouched();					
					this.error = "Please correct the highlighted fields.";					
					this.focusFirstInvalidField();					
					return;
				}
				
				this.error = this.apiErrorMessage(err, this.isCreate
					? "Failed to create project category."
					: "Failed to update project category.",
				);
			},
		});
	}
	
    // =========================================================================
    // Navigation
    // =========================================================================
	
    cancel(): void {
        if (this.saving) {
            return;
		}		
        this.router.navigate(["/admin/project-categories"]);
	}
	
    // =========================================================================
    // Code formatting
    // =========================================================================
	
    normaliseCode(): void {
        const control = this.form.get("code");
		
        if (!control) {
            return;
		}
		
        const value = String(control.value ?? "").trim().toUpperCase().replace(/\s+/g, "_");		
        control.setValue(value, {emitEvent: false,});
	}
	
    // =========================================================================
    // Validation UI
    // =========================================================================
	
    isInvalid(controlName: string): boolean {
        const control = this.form.get(controlName);
        return (!!control && control.invalid && (control.touched || control.dirty));
	}
	
    fieldError(controlName: string, label: string): string {
        const control = this.form.get(controlName);		
        if (!control?.errors) {
            return "";
		}
		
        if (control.errors["server"]) {
            return String(control.errors["server"]);
		}
		
        if (control.errors["required"]) {
            return `${label} is required.`;
		}
		
        if (control.errors["pattern"]) {
            if (controlName === "year") {
                return "Year must be a whole number.";
			}
			
            if (controlName === "sort_order") {
                return "Sort Order must be a whole number.";
			}
			
            return `${label} contains an invalid value.`;
		}
		
        if (control.errors["maxlength"]) {
            return (
                `${label} must not exceed ` +
                `${control.errors["maxlength"].requiredLength} characters.`
			);
		}
		
        if (control.errors["min"]) {
            return (
                `${label} must be at least ` + `${control.errors["min"].min}.`
			);
		}
		
        if (control.errors["max"]) {
            return (
                `${label} must not exceed ` + `${control.errors["max"].max}.`
			);
		}
		
        return `${label} is invalid.`;
	}
	
    private enableServerErrorClearing(): void {
        for (const control of Object.values(this.form.controls)) {
            control.valueChanges.subscribe(() => {
                const errors = control.errors;				
                if (!errors?.["server"]) {
                    return;
				}
				
                const { server, ...remainingErrors } = errors;				
                control.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null,					
                    { emitEvent: false, },
				);
			});
		}
	}
	
    private applyApiFieldErrors(err: any): boolean {
        const errors = err?.error?.errors;		
        if (err?.status !== 422 || !errors || typeof errors !== "object") {
            return false;
		}
		
        let applied = false;		
        for (const [backendField, messages] of Object.entries(errors)) {
            const parts = String(backendField).split(".");			
            const candidates = [
                String(backendField),				
                parts[0],				
                parts[parts.length - 1] ?? "",
			];
			
            const fieldName = candidates.find(
                (name) => !!name && !!this.form.get(name),
			);
			
            if (!fieldName) {
                continue;
			}
			
            const control = this.form.get(fieldName);			
            const message = Array.isArray(messages) ? String(messages[0] ?? "Invalid value.") : String(messages);			
            control?.setErrors({
                ...(control.errors ?? {}),				
                server: message,
			});
			
            control?.markAsTouched();			
            applied = true;
		}
		
        return applied;
	}
	
    private focusFirstInvalidField(): void {
        setTimeout(() => {
            const element = window.document.querySelector<HTMLElement>(".is-invalid");
			
            if (!element) {
                return;
			}
			
            element.scrollIntoView({
                behavior: "smooth",				
                block: "center",
			});			
            element.focus();
		}, 50);
	}
	
    // =========================================================================
    // Payload helpers
    // =========================================================================
	
    private nullableNumber(value: any): number | null {
        if (value === null || value === undefined || value === "") {
            return null;
		}
		
        const parsed = Number(value);		
        return Number.isFinite(parsed) ? parsed : null;
	}
	
    private nullableUppercase(value: any): string | null {
        const text = String(value ?? "").trim().toUpperCase();		
        return text || null;
	}
	
    private apiErrorMessage(err: any, fallback: string): string {
        return err?.error?.message || err?.error?.error?.message || fallback;
	}
}
