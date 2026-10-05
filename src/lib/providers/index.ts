import type { ScanMode } from "@/lib/types";
import { dataForSeoConfigured, dataForSeoKeywords, dataForSeoSerp } from "./dataforseo";
import { demoDomains, demoKeywords, demoSerpFor } from "./demo";
import { namecheapConfigured, namecheapDomains, rdapDomains } from "./domains";
import type { ProviderSet } from "./types";

export function resolveProviders(mode: ScanMode, officialDomain: string | null): ProviderSet {
  if (mode === "demo") {
    return { keywords: demoKeywords, serp: demoSerpFor(officialDomain), domains: demoDomains };
  }
  if (!dataForSeoConfigured()) {
    throw new Error("Live mode needs DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env.local");
  }
  return {
    keywords: dataForSeoKeywords,
    serp: dataForSeoSerp,
    domains: namecheapConfigured() ? namecheapDomains : rdapDomains,
  };
}

export function providerStatus() {
  return [
    {
      name: "DataForSEO",
      role: "Keyword volumes + Google SERPs",
      configured: dataForSeoConfigured(),
      env: ["DATAFORSEO_LOGIN", "DATAFORSEO_PASSWORD"],
      docs: "https://docs.dataforseo.com/v3/",
    },
    {
      name: "Namecheap",
      role: "Domain availability (registrar-accurate)",
      configured: namecheapConfigured(),
      env: ["NAMECHEAP_API_USER", "NAMECHEAP_API_KEY", "NAMECHEAP_CLIENT_IP"],
      docs: "https://www.namecheap.com/support/api/intro/",
    },
    {
      name: "RDAP (rdap.org)",
      role: "Domain availability fallback — free, no key",
      configured: true,
      env: [],
      docs: "https://about.rdap.org/",
    },
    {
      name: "Supabase",
      role: "Database (opportunities, catalog, scans, handoffs)",
      configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      env: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
      docs: "https://supabase.com/docs",
    },
    {
      name: "Build system webhook",
      role: "Receives approved opportunities (domain → hosting → site)",
      configured: Boolean(process.env.BUILD_WEBHOOK_URL),
      env: ["BUILD_WEBHOOK_URL", "BUILD_WEBHOOK_SECRET"],
      docs: "",
    },
  ];
}
