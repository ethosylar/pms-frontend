import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SiteSummary } from './site.models';

@Injectable({
  providedIn: 'root',
})
export class SiteContextService {
  private readonly storageKey = 'pms_selected_site_id';
  private readonly _sites$ = new BehaviorSubject<SiteSummary[]>([]);
  private readonly _selectedSite$ = new BehaviorSubject<SiteSummary | null>(null);
  readonly sites$ = this._sites$.asObservable();
  readonly selectedSite$ = this._selectedSite$.asObservable();

  get sites(): SiteSummary[] {
    return this._sites$.value;
  }

  get selectedSite(): SiteSummary | null {
    return this._selectedSite$.value;
  }

  get selectedSiteId(): number | null {
    return this.selectedSite?.id ?? null;
  }

  get isAllSites(): boolean {
    return this.sites.length > 1 && this.selectedSite === null;
  }

  // =========================================================================
  // Initialise
  // =========================================================================

  configure(sites: SiteSummary[], primarySite?: SiteSummary | null): void {
    const available = [...sites]
      .filter((site) => site.is_active !== false)
      .sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name));

    this._sites$.next(available);

    if (!available.length) {
      this._selectedSite$.next(null);
      return;
    }

    const stored = localStorage.getItem(this.storageKey);

    if (stored === 'ALL' && available.length > 1) {
      this.commitSelection(null);
      return;
    }

    if (stored) {
      const storedId = Number(stored);

      if (Number.isInteger(storedId)) {
        const storedSite = available.find((site) => site.id === storedId);

        if (storedSite) {
          this.commitSelection(storedSite);
          return;
        }
      }
    }

    if (primarySite) {
      const primary = available.find((site) => site.id === primarySite.id);

      if (primary) {
        this.commitSelection(primary);
        return;
      }
    }
    this.commitSelection(available[0]);
  }

  // =========================================================================
  // Select
  // =========================================================================

  selectSite(siteId: number | null): boolean {
    if (siteId === null) {
      if (this.sites.length <= 1) {
        return false;
      }

      this.commitSelection(null);
      return true;
    }

    const site = this.sites.find((item) => item.id === siteId);

    if (!site) {
      return false;
    }

    this.commitSelection(site);
    return true;
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
    this._sites$.next([]);
    this._selectedSite$.next(null);
  }

  private commitSelection(site: SiteSummary | null): void {
    this._selectedSite$.next(site);

    if (site) {
      localStorage.setItem(this.storageKey, String(site.id));

      return;
    }

    localStorage.setItem(this.storageKey, 'ALL');
  }
}
