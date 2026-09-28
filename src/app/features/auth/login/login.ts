import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SiteContextService } from '../../../core/site/site-context.service';
import { AuthService } from '../../../core/auth/auth';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class LoginComponent {
  loading = false;
  error = '';

  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private siteContext: SiteContextService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      login: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submit(): void {
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { login, password } = this.form.getRawValue();

    this.auth.login(login, password).subscribe({
      next: () => {
        const primarySite = this.auth.getPrimarySite();
        const accessibleSites = this.auth.getSiteAccesses().map((access) => ({
          ...access.site,
          is_active: true,
        }));

        this.siteContext.configure(accessibleSites, primarySite);
        this.loading = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Login failed';
      },
    });
  }
}
