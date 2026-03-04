# Hospital Project Tracking System — Frontend (Angular CLI)

This repository contains the **Angular** frontend for the Hospital Project Tracking System (PMS).  
It uses **standalone components**, **Bootstrap** (SB Admin–style layout), and talks to a **Laravel API** (Sanctum auth).

---

## Tech stack

- Angular (standalone components / Angular CLI)
- Bootstrap + Bootstrap Icons
- Chart.js (via `ng2-charts`) for dashboard charts
- Laravel API (Sanctum) as backend

---

## Roles (RBAC)

The UI is designed to show/hide navigation and pages based on the user’s role:

- **ADMIN**
- **AUDITOR**
- **PMO**
- **PM**
- **STAFF**

> Backend enforces access using `role:*` middleware. Frontend uses role info from `/api/me` to control menus + route guards.

---

## API expectations

### Authentication
- `POST /api/login` → returns token + user payload (recommended)
- `POST /api/logout`
- `GET /api/me` → returns the authenticated user **including roles**  
  Example:
  ```json
  {
    "user": {
      "id": 1,
      "name": "System Admin",
      "email": "admin@hospital.local",
      "roles": [{ "id": 1, "code": "ADMIN", "name": "Admin" }]
    }
  }
  ```

### Dashboard overview (example)
- `GET /api/dashboard/overview` → returns counts + lists + chart datasets (your backend already follows this format)

---

## Project structure (important folders)

```
src/
  app/
    core/
      auth/
        auth.ts                  # AuthService (login/logout/me, roles)
        auth.interceptor.ts      # Adds Authorization header from localStorage token
      guards/                    # AuthGuard / RoleGuard (route protection)
      interceptors/              # (optional) other HTTP interceptors
      services/
        api.service.ts           # Central API wrapper (dashboard, users, departments, etc.)

    features/
      auth/
        login/                   # Login page (standalone component)
      dashboard/
        dashboard/               # Dashboard overview page (KPIs + charts)
      admin/
        users/                   # User management (list + create/edit)
        departments/             # Department management (list + create/edit)

    shared/
      layout/
        shell/                   # Main app layout (sidebar + top navbar + router-outlet)
      ui/
        toast/                   # Bottom-right toast container + toast service

    app.routes.ts                # App routes (shell + auth + admin routes)
    app.config.ts                # App providers (router, HTTP, interceptors, charts provider, etc.)

  environments/
    environment.ts               # apiBaseUrl
styles.scss                      # Bootstrap/Material global styles
proxy.conf.json                  # Dev proxy (optional)
```

---

## Running the system (local development)

### 1) Prerequisites
- Node.js LTS (recommended)
- Angular CLI installed globally:
  ```bash
  npm i -g @angular/cli
  ```

### 2) Install dependencies
From the project root:
```bash
npm install
```

### 3) Configure API endpoint

You have **two common options**:

#### Option A — Use `environment.ts` (direct URL)
Update:
- `src/environments/environment.ts`

Example:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8000/api', // Laravel API
};
```

#### Option B — Use `proxy.conf.json` (recommended for local)
This avoids CORS issues by proxying `/api/*` requests to the backend.

Example `proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Then run Angular with proxy:
```bash
ng serve --proxy-config proxy.conf.json
```

> If you use proxy mode, your frontend can call `/api/login`, `/api/me`, etc.

### 4) Start the frontend
```bash
ng serve
```

Open:
- http://localhost:4200

---

## Authentication flow (how it works)

1. User logs in via Login page:
   - `AuthService.login(email, password)` → `POST /api/login`
2. Token is saved to localStorage: `pms_token`
3. Frontend calls `GET /api/me` to load user details (including roles)
4. `auth.interceptor.ts` attaches token:
   - `Authorization: Bearer <token>`
5. Guards block routes if not logged in / wrong role.

---

## Bootstrap + Angular Material styling note (important)

If you use Angular Material with Sass `@use`, Sass requires `@use` to appear **before** `@import`.

✅ Recommended `styles.scss` order:

```scss
@use '@angular/material' as mat;
@import "bootstrap/scss/bootstrap";

/* your styles... */
```

(If you don’t need Material theming, you can remove Material entirely.)

---

## Chart.js setup (ng2-charts)

### Install
```bash
npm i chart.js ng2-charts
```

### App-wide provider (standalone-friendly)
In `app.config.ts`, add:

```ts
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideCharts(withDefaultRegisterables()),
    // ...
  ],
};
```

### Use in a standalone component
Import `BaseChartDirective`:

```ts
import { BaseChartDirective } from 'ng2-charts';

@Component({
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  // ...
})
export class DashboardComponent {}
```

Template example:
```html
<canvas
  baseChart
  [data]="projectsByStatusData"
  [type]="'doughnut'">
</canvas>
```

---

## Common troubleshooting

### 1) “Page only updates after clicking sidebar”
This usually happens when UI state updates are not triggering change detection after async events.

What we do in CRUD pages:
- Inject `ChangeDetectorRef`
- Call `cdr.detectChanges()` in:
  - `finalize()`
  - `next/error` handlers
  - after navigation or state toggles

### 2) 401 Unauthorized / token not attached
- Check token exists: `localStorage.getItem('pms_token')`
- Ensure interceptor is registered in `app.config.ts`
- Ensure backend accepts Bearer token (Sanctum configuration)

### 3) CORS error
Use `proxy.conf.json` (recommended) during local development.

---

## Suggested workflow for adding new CRUD “Management” pages

When creating a new module (e.g., “Severity Management”, “Priorities”, etc.):

1. Add API methods in `core/services/api.service.ts`
2. Create list page:
   - loading overlay
   - search + pagination
   - actions: edit/delete
3. Create form page:
   - create + edit combined
   - `ChangeDetectorRef` in finalize/next/error
   - show toast messages on success/error
4. Register routes in `app.routes.ts`
5. Add sidebar link (role-gated if required)

---

## Scripts

Common:
```bash
ng serve
ng build
ng test
```

---

## Notes / conventions used in this project

- Standalone components are used instead of NgModules for feature pages
- SB Admin–like layout is implemented using Bootstrap:
  - sidebar + top navbar in `shared/layout/shell`
- Role-based UI is controlled from `AuthService.getRoleNames()` and guard logic
- Toast notifications are global and mounted inside Shell (bottom-right)

---