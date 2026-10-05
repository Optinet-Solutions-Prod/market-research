export interface VolumeRow {
  keyword: string;
  volume: number;
  cpc_eur: number | null;
  competition: number | null;
}

export interface SerpRow {
  position: number;
  url: string;
  title: string | null;
}

export interface KeywordProvider {
  name: string;
  getVolumes(keywords: string[], geo: string): Promise<VolumeRow[]>;
}

export interface SerpProvider {
  name: string;
  getSerp(keyword: string, geo: string): Promise<SerpRow[]>;
}

export interface DomainProvider {
  name: string;
  /** true = available, false = registered, null = unknown */
  check(domains: string[]): Promise<Map<string, boolean | null>>;
}

export interface ProviderSet {
  keywords: KeywordProvider;
  serp: SerpProvider;
  domains: DomainProvider;
}
