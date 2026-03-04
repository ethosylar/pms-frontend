import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ApiService, DepartmentDto, ApiCollection } from '../../../core/services/api.service';
import { ToastService } from '../../../shared/ui/toast/toast';

@Component({
  standalone: true,
  selector: 'app-admin-departments',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './departments.html',
  styleUrls: ['./departments.scss'],
})
export class DepartmentsComponent implements OnInit {
  loading = true;
  error: string | null = null;

  rows: DepartmentDto[] = [];
  page = 1;
  perPage = 10;
  total = 0;
  lastPage = 1;

  search = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    this.api.getDepartments({ search: this.search || undefined, page: this.page, per_page: this.perPage })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: ApiCollection<DepartmentDto>) => {
          this.rows = res.data ?? [];
          this.total = res.meta?.total ?? this.rows.length;
          this.lastPage = res.meta?.last_page ?? 1;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(err);
          this.error = 'Failed to load departments.';
          this.cdr.detectChanges();
        }
      });
  }

  onSearchEnter(): void {
    this.page = 1;
    this.fetch();
  }

  changePage(next: number): void {
    if (next < 1 || next > this.lastPage) return;
    this.page = next;
    this.fetch();
  }

  deleteDepartment(d: DepartmentDto) {
    const ok = confirm(`Delete department "${d.name}" (${d.code})?`);
    if (!ok) return;

    this.loading = true;
    this.cdr.detectChanges();

    this.api.deleteDepartment(d.id)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.toast.success('Department deleted successfully.');
          this.fetch();
        },
        error: (err) => {
          console.error(err);
          this.toast.error('Failed to delete department.');
        }
      });
  }
}
