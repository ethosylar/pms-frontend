import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-wrap">
      <div class="card">
        <h2>PMS Login</h2>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>Username/E-Mail</label>
          <input type="text" formControlName="login" placeholder="name@company.com" />

          <label>Password</label>
          <input type="password" formControlName="password" placeholder="********" />

          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Signing in...' : 'Login' }}
          </button>

          <p class="error" *ngIf="error">{{ error }}</p>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { width: 360px; border:1px solid #ddd; border-radius:12px; padding:20px; background:#fff; }
    h2 { margin: 0 0 16px; }
    label { display:block; margin: 10px 0 6px; font-size: 13px; }
    input { width:100%; padding:10px; border:1px solid #ccc; border-radius:8px; }
    button { width:100%; margin-top:14px; padding:10px; border:none; border-radius:8px; cursor:pointer; }
    .error { color:#b00020; margin-top:10px; font-size: 13px; }
  `]
})
export class LoginComponent {
  loading = false;
  error = '';
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      login: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submit() {
    this.error = '';
    if (this.form.invalid) return;

    this.loading = true;
    const { login, password } = this.form.getRawValue();

    this.auth.login(login, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Login failed';
      }
    });
  }
}
