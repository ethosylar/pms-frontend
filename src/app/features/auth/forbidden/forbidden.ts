import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5">
      <div class="card shadow-sm border-0 mx-auto" style="max-width: 620px;">
        <div class="card-body text-center p-5">
          <div class="display-6 fw-bold text-danger mb-2">
            Access Denied
          </div>

          <p class="text-muted mb-4">
            You do not have permission to access this module.
          </p>

          <a routerLink="/dashboard" class="btn btn-primary">
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {}