import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SiteContextService } from './site-context.service';

@Injectable()
export class SiteContextInterceptor implements HttpInterceptor {
  constructor(private siteContext: SiteContextService) {}

  intercept(
    req: HttpRequest<any>,

    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    const siteId = this.siteContext.selectedSiteId;

    if (siteId === null) {
      return next.handle(req);
    }

    if (req.method !== 'GET') {
      return next.handle(req);
    }

    if (!this.isHpmsApiRequest(req)) {
      return next.handle(req);
    }

    if (req.params.has('site_id')) {
      return next.handle(req);
    }

    if (this.isExcluded(req.url)) {
      return next.handle(req);
    }

    return next.handle(
      req.clone({
        params: req.params.set('site_id', String(siteId)),
      }),
    );
  }

  private isHpmsApiRequest(req: HttpRequest<any>): boolean {
    return req.url.startsWith(environment.apiBaseUrl);
  }

  private isExcluded(url: string): boolean {
    const cleanUrl = url.split('?')[0];

    return (
      cleanUrl.endsWith('/health') ||
      cleanUrl.endsWith('/login') ||
      cleanUrl.endsWith('/logout') ||
      cleanUrl.endsWith('/me') ||
      /\/sites(?:\/\d+)?$/.test(cleanUrl) ||
      /\/users\/\d+\/sites$/.test(cleanUrl)
    );
  }
}
