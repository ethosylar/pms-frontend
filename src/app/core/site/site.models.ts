export type SiteAccessLevel = 'VIEW' | 'MANAGE' | 'ADMIN';

export interface SiteSummary {
  id: number;

  code: string;
  name: string;

  short_name?: string | null;

  site_type?: string | null;

  is_active?: boolean;
}

export interface SiteAddressDto {
  address_line_1?: string | null;
  address_line_2?: string | null;

  city?: string | null;
  state?: string | null;

  postcode?: string | null;

  country?: string | null;
}

export interface SiteDto extends SiteSummary {
  address?: SiteAddressDto | null;

  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserSiteAccessSummary {
  site_id: number;

  access_level: SiteAccessLevel;

  is_primary: boolean;

  site: SiteSummary;
}
