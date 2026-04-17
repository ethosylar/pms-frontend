import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AuthInterceptor } from './core/auth/auth.interceptor';
import { GANTT_GLOBAL_CONFIG, GanttI18nLocale  } from '@worktile/gantt';

export const appConfig: ApplicationConfig = {
	providers: [
		provideRouter(routes),
		provideHttpClient(withInterceptorsFromDi()),
		{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
		provideCharts(withDefaultRegisterables()),
		{
			provide: GANTT_GLOBAL_CONFIG,
			useValue: {
				locale: GanttI18nLocale.enUs,
				dateOptions: {
					timeZone: 'Asia/Kuala_Lumpur',
					weekStartsOn: 1
				}
			}
		},
	],
};