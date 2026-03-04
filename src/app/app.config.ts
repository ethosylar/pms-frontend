import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // HttpClient for standalone apps
    provideHttpClient(withInterceptorsFromDi()),

    // Register interceptor
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
	provideCharts(withDefaultRegisterables()),
  ],
};
