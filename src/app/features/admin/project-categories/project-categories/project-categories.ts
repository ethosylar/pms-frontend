import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, RouterModule } from "@angular/router";
import { finalize } from "rxjs/operators";
import { ApiService, ProjectCategoryDto, } from "../../../../core/services/api.service";
import { ToastService } from "../../../../shared/ui/toast/toast";

@Component({
    standalone: true,
    selector: "app-project-categories",
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: "./project-categories.html",
    styleUrls: ["./project-categories.scss"],
})
export class ProjectCategoriesComponent implements OnInit {
    loading = false;
    error: string | null = null;
    rows: ProjectCategoryDto[] = [];
	
    // =========================================================================
    // Filters
    // =========================================================================
    search = "";
    statusFilter: "" | "1" | "0" = "";
    perPage = 20;
	
    // =========================================================================
    // Pagination
    // =========================================================================
    page = 1;
    lastPage = 1;
    total = 0;
	
    // =========================================================================
    // Delete
    // =========================================================================
    deletingId: number | null = null;
	
    constructor(
        private api: ApiService,
        private router: Router,
        private toast: ToastService,
        private cdr: ChangeDetectorRef,
	) {}
	
    ngOnInit(): void {
        this.fetch(1);
	}
	
    // =========================================================================
    // Load
    // =========================================================================
	
    fetch(page = this.page): void {
        this.loading = true;
        this.error = null;
        this.page = page;
        this.api
		.getProjectCategories({
			search: this.search.trim() || undefined,
			is_active: this.statusFilter === "" ? undefined : Number(this.statusFilter),
			page: this.page,
			per_page: this.perPage,
		})
		.pipe(
			finalize(() => {
				this.loading = false;
				this.cdr.detectChanges();
			}),
		)
		.subscribe({
			next: (response) => {
				this.rows = response.data ?? [];
				this.page = response.meta?.current_page ?? this.page;
				this.lastPage = response.meta?.last_page ?? 1;
				this.total = response.meta?.total ?? this.rows.length;
			},
			error: (err: any) => {
				console.error(err);
				this.rows = [];
				this.error = this.apiErrorMessage(err, "Failed to load project categories.",);
			},
		});
	}
	
    // =========================================================================
    // Filters
    // =========================================================================
	
    applyFilters(): void {
        this.fetch(1);
	}
	
    resetFilters(): void {
        this.search = "";
        this.statusFilter = "";
        this.perPage = 20;
        this.fetch(1);
	}
	
    onPerPageChange(): void {
        this.fetch(1);
	}
	
    // =========================================================================
    // Pagination
    // =========================================================================
    previousPage(): void {
        if (this.page <= 1 || this.loading) {
            return;
		}
        this.fetch(this.page - 1);
	}
	
    nextPage(): void {
        if (this.page >= this.lastPage || this.loading) {
            return;
		}
        this.fetch(this.page + 1);
	}
	
    // =========================================================================
    // Navigation
    // =========================================================================
	
    createCategory(): void {
        this.router.navigate(["/admin/project-categories/new"]);
	}
	
    editCategory(category: ProjectCategoryDto): void {
        this.router.navigate(["/admin/project-categories", category.id, "edit", ]);
	}
	
    // =========================================================================
    // Delete / Deactivate
    // =========================================================================
	
    removeCategory(category: ProjectCategoryDto): void {
        if (this.deletingId !== null) {
            return;
		}
		
        const confirmed = window.confirm(
            `Delete project category "${category.name}"?\n\n` +
			"If the category is already used by an existing project, " +
			"HPMS will deactivate it instead of permanently deleting it.",
		);
		
        if (!confirmed) {
            return;
		}
		
        this.deletingId = category.id;
		
        this.api
		.deleteProjectCategory(category.id)
		.pipe(
			finalize(() => {
				this.deletingId = null;
				this.cdr.detectChanges();
			}),
		)
		.subscribe({
			next: (response) => {
				if (response.mode === "SOFT") {
					this.toast.success(
						"Project category is already in use and has been deactivated.",
					);
                    } else {
					this.toast.success("Project category deleted.");
				}
				
				/*
					* If this was the only row on a
					* page other than page 1, move
					* back one page.
				*/
				if (this.rows.length === 1 && this.page > 1) {
					this.page -= 1;
				}
				
				this.fetch(this.page);
			},
			
			error: (err: any) => {
				console.error(err);
				this.toast.error(
					this.apiErrorMessage(err, "Failed to delete project category.", ),
				);
			},
		});
	}
	
    // =========================================================================
    // UI helpers
    // =========================================================================
	
    isActive(row: ProjectCategoryDto): boolean {
        return Boolean(row.is_active);
	}
	
    displayValue(value: string | number | null | undefined): string {
        if (value === null || value === undefined || value === "") {
            return "—";
		}
		
        return String(value);
	}
	
    private apiErrorMessage(err: any, fallback: string): string {
        return err?.error?.message || err?.error?.error?.message || fallback;
	}
}
