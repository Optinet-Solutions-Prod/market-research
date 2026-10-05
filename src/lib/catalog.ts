import type { AffiliateProgram } from "@/lib/types";

/**
 * Starter catalog. Payouts/terms are ILLUSTRATIVE ESTIMATES for demo scans —
 * replace with the real terms from each network dashboard before relying on
 * live numbers (Catalog page → edit, or update the affiliate_programs table).
 */

type SeedProgram = Partial<Omit<AffiliateProgram, "id" | "industry_id" | "brand_id">> & {
  merchant: string;
  model: AffiliateProgram["model"];
};

export interface SeedIndustry {
  name: string;
  regulated?: boolean;
  conversion?: number;
  brands: { name: string; domain: string; geos?: string[] }[];
  programs: SeedProgram[];
}

const EU = ["US", "UK", "DE", "FR", "NL", "ES", "IT", "CA", "AU"];

export const SEED_CATALOG: SeedIndustry[] = [
  {
    name: "Email Marketing SaaS",
    conversion: 0.05,
    brands: [
      { name: "Mailchimp", domain: "mailchimp.com", geos: EU },
      { name: "Klaviyo", domain: "klaviyo.com", geos: EU },
      { name: "Brevo", domain: "brevo.com", geos: EU },
      { name: "ActiveCampaign", domain: "activecampaign.com", geos: EU },
      { name: "Omnisend", domain: "omnisend.com" },
      { name: "GetResponse", domain: "getresponse.com", geos: EU },
      { name: "MailerLite", domain: "mailerlite.com" },
    ],
    programs: [
      { merchant: "Brevo", network: "partnerstack", model: "CPA", payout_eur: 100, geos: EU, conversion_rate: 0.05 },
      { merchant: "ActiveCampaign", network: "partnerstack", model: "RECURRING", revshare_pct: 20, avg_order_eur: 49, recurring_months: 24, payout_eur: 0, geos: EU },
      { merchant: "Omnisend", network: "partnerstack", model: "RECURRING", revshare_pct: 20, avg_order_eur: 59, recurring_months: 24, payout_eur: 0 },
      { merchant: "GetResponse", network: "direct", model: "RECURRING", revshare_pct: 33, avg_order_eur: 39, recurring_months: 12, payout_eur: 0, geos: EU },
      { merchant: "MailerLite", network: "direct", model: "RECURRING", revshare_pct: 30, avg_order_eur: 25, recurring_months: 12, payout_eur: 0 },
      { merchant: "Klaviyo", network: "direct", model: "CPA", payout_eur: 80, allows_competitor_comparison: true },
    ],
  },
  {
    name: "Web Hosting",
    conversion: 0.045,
    brands: [
      { name: "Hostinger", domain: "hostinger.com", geos: EU },
      { name: "Bluehost", domain: "bluehost.com" },
      { name: "SiteGround", domain: "siteground.com", geos: EU },
      { name: "GoDaddy", domain: "godaddy.com", geos: EU },
      { name: "DreamHost", domain: "dreamhost.com" },
      { name: "Kinsta", domain: "kinsta.com", geos: EU },
      { name: "Cloudways", domain: "cloudways.com", geos: EU },
    ],
    programs: [
      { merchant: "Hostinger", network: "direct", model: "CPA", payout_eur: 110, geos: EU },
      { merchant: "Bluehost", network: "impact", model: "CPA", payout_eur: 65 },
      { merchant: "SiteGround", network: "direct", model: "CPA", payout_eur: 75, geos: EU },
      { merchant: "DreamHost", network: "direct", model: "CPA", payout_eur: 90 },
      { merchant: "Kinsta", network: "direct", model: "RECURRING", revshare_pct: 10, avg_order_eur: 35, recurring_months: 24, payout_eur: 50, geos: EU },
      { merchant: "Cloudways", network: "direct", model: "CPA", payout_eur: 115, geos: EU },
    ],
  },
  {
    name: "VPN",
    conversion: 0.05,
    brands: [
      { name: "NordVPN", domain: "nordvpn.com", geos: EU },
      { name: "ExpressVPN", domain: "expressvpn.com", geos: EU },
      { name: "Surfshark", domain: "surfshark.com", geos: EU },
      { name: "ProtonVPN", domain: "protonvpn.com", geos: EU },
      { name: "CyberGhost", domain: "cyberghostvpn.com", geos: EU },
      { name: "Private Internet Access", domain: "privateinternetaccess.com" },
    ],
    programs: [
      { merchant: "NordVPN", network: "impact", model: "CPA", payout_eur: 70, geos: EU },
      { merchant: "ExpressVPN", network: "direct", model: "CPA", payout_eur: 36, geos: EU },
      { merchant: "Surfshark", network: "impact", model: "CPA", payout_eur: 60, geos: EU },
      { merchant: "CyberGhost", network: "cj", model: "CPA", payout_eur: 55, geos: EU },
      { merchant: "Private Internet Access", network: "direct", model: "CPA", payout_eur: 40 },
    ],
  },
  {
    name: "eSIM",
    conversion: 0.06,
    brands: [
      { name: "Airalo", domain: "airalo.com", geos: EU },
      { name: "Holafly", domain: "esim.holafly.com", geos: EU },
      { name: "Nomad", domain: "getnomad.app", geos: EU },
      { name: "Saily", domain: "saily.com", geos: EU },
      { name: "Ubigi", domain: "cellulardata.ubigi.com", geos: EU },
    ],
    programs: [
      { merchant: "Airalo", network: "impact", model: "REVSHARE", revshare_pct: 10, avg_order_eur: 24, payout_eur: 0, geos: EU },
      { merchant: "Holafly", network: "awin", model: "REVSHARE", revshare_pct: 15, avg_order_eur: 40, payout_eur: 0, geos: EU },
      { merchant: "Saily", network: "impact", model: "REVSHARE", revshare_pct: 15, avg_order_eur: 20, payout_eur: 0, geos: EU },
      { merchant: "Nomad", network: "direct", model: "REVSHARE", revshare_pct: 10, avg_order_eur: 25, payout_eur: 0 },
    ],
  },
  {
    name: "CRM SaaS",
    conversion: 0.04,
    brands: [
      { name: "HubSpot", domain: "hubspot.com", geos: EU },
      { name: "Salesforce", domain: "salesforce.com", geos: EU },
      { name: "Pipedrive", domain: "pipedrive.com", geos: EU },
      { name: "Zoho CRM", domain: "zoho.com", geos: EU },
      { name: "Monday CRM", domain: "monday.com", geos: EU },
      { name: "Close", domain: "close.com" },
    ],
    programs: [
      { merchant: "HubSpot", network: "impact", model: "RECURRING", revshare_pct: 30, avg_order_eur: 90, recurring_months: 12, payout_eur: 0, geos: EU },
      { merchant: "Pipedrive", network: "partnerstack", model: "RECURRING", revshare_pct: 33, avg_order_eur: 45, recurring_months: 12, payout_eur: 0, geos: EU },
      { merchant: "Zoho CRM", network: "direct", model: "RECURRING", revshare_pct: 15, avg_order_eur: 40, recurring_months: 12, payout_eur: 0, geos: EU },
      { merchant: "Monday CRM", network: "partnerstack", model: "RECURRING", revshare_pct: 25, avg_order_eur: 60, recurring_months: 12, payout_eur: 0, geos: EU },
      { merchant: "Close", network: "partnerstack", model: "RECURRING", revshare_pct: 15, avg_order_eur: 99, recurring_months: 12, payout_eur: 0 },
    ],
  },
  {
    name: "Accounting SaaS",
    conversion: 0.04,
    brands: [
      { name: "QuickBooks", domain: "quickbooks.intuit.com", geos: ["US", "UK", "CA", "AU"] },
      { name: "Xero", domain: "xero.com", geos: ["US", "UK", "AU", "CA"] },
      { name: "FreshBooks", domain: "freshbooks.com" },
      { name: "Wave", domain: "waveapps.com", geos: ["US", "CA"] },
      { name: "Sage", domain: "sage.com", geos: EU },
      { name: "Zoho Books", domain: "zoho.com" },
    ],
    programs: [
      { merchant: "QuickBooks", network: "cj", model: "CPA", payout_eur: 60, geos: ["US", "CA"] },
      { merchant: "FreshBooks", network: "impact", model: "CPA", payout_eur: 150 },
      { merchant: "Xero", network: "direct", model: "CPA", payout_eur: 80, geos: ["UK", "AU"] },
      { merchant: "Sage", network: "awin", model: "CPA", payout_eur: 55, geos: ["UK", "DE", "FR", "ES"] },
      { merchant: "Zoho Books", network: "direct", model: "RECURRING", revshare_pct: 15, avg_order_eur: 25, recurring_months: 12, payout_eur: 0 },
    ],
  },
  {
    name: "Website Builders",
    conversion: 0.044,
    brands: [
      { name: "Wix", domain: "wix.com", geos: EU },
      { name: "Squarespace", domain: "squarespace.com", geos: EU },
      { name: "Webflow", domain: "webflow.com", geos: EU },
      { name: "Framer", domain: "framer.com" },
      { name: "Hostinger Website Builder", domain: "hostinger.com", geos: EU },
      { name: "Shopify", domain: "shopify.com", geos: EU },
    ],
    programs: [
      { merchant: "Wix", network: "direct", model: "CPA", payout_eur: 90, geos: EU },
      { merchant: "Squarespace", network: "impact", model: "CPA", payout_eur: 100, geos: EU },
      { merchant: "Webflow", network: "partnerstack", model: "RECURRING", revshare_pct: 50, avg_order_eur: 25, recurring_months: 12, payout_eur: 0 },
      { merchant: "Framer", network: "direct", model: "RECURRING", revshare_pct: 50, avg_order_eur: 20, recurring_months: 12, payout_eur: 0 },
      { merchant: "Shopify", network: "impact", model: "CPA", payout_eur: 140, geos: EU },
    ],
  },
  {
    name: "Money Transfer",
    regulated: true,
    conversion: 0.035,
    brands: [
      { name: "Wise", domain: "wise.com", geos: EU },
      { name: "Remitly", domain: "remitly.com", geos: EU },
      { name: "Western Union", domain: "westernunion.com", geos: EU },
      { name: "Revolut", domain: "revolut.com", geos: EU },
      { name: "Xoom", domain: "xoom.com" },
      { name: "WorldRemit", domain: "worldremit.com", geos: EU },
    ],
    programs: [
      { merchant: "Wise", network: "direct", model: "CPA", payout_eur: 15, geos: EU },
      { merchant: "Remitly", network: "impact", model: "CPA", payout_eur: 30, geos: EU },
      { merchant: "WorldRemit", network: "awin", model: "CPA", payout_eur: 25, geos: EU },
      { merchant: "Revolut", network: "impact", model: "CPA", payout_eur: 45, geos: EU, allows_competitor_comparison: true },
    ],
  },
  {
    name: "Travel Activities",
    conversion: 0.055,
    brands: [
      { name: "GetYourGuide", domain: "getyourguide.com", geos: EU },
      { name: "Viator", domain: "viator.com", geos: EU },
      { name: "Klook", domain: "klook.com", geos: EU },
      { name: "Tiqets", domain: "tiqets.com", geos: EU },
      { name: "Civitatis", domain: "civitatis.com", geos: EU },
    ],
    programs: [
      { merchant: "GetYourGuide", network: "direct", model: "REVSHARE", revshare_pct: 8, avg_order_eur: 110, payout_eur: 0, geos: EU },
      { merchant: "Viator", network: "direct", model: "REVSHARE", revshare_pct: 8, avg_order_eur: 120, payout_eur: 0, geos: EU },
      { merchant: "Klook", network: "direct", model: "REVSHARE", revshare_pct: 5, avg_order_eur: 80, payout_eur: 0, geos: EU },
      { merchant: "Tiqets", network: "awin", model: "REVSHARE", revshare_pct: 8, avg_order_eur: 60, payout_eur: 0, geos: EU },
      { merchant: "Civitatis", network: "direct", model: "REVSHARE", revshare_pct: 8, avg_order_eur: 55, payout_eur: 0, geos: EU },
    ],
  },
  {
    name: "Payroll & HR Software",
    conversion: 0.035,
    brands: [
      { name: "Gusto", domain: "gusto.com" },
      { name: "ADP", domain: "adp.com", geos: EU },
      { name: "Rippling", domain: "rippling.com", geos: ["US", "UK", "CA"] },
      { name: "Deel", domain: "deel.com", geos: EU },
      { name: "BambooHR", domain: "bamboohr.com", geos: ["US", "UK", "CA"] },
      { name: "Paychex", domain: "paychex.com" },
    ],
    programs: [
      { merchant: "Gusto", network: "impact", model: "CPA", payout_eur: 200 },
      { merchant: "Rippling", network: "partnerstack", model: "CPA", payout_eur: 250, geos: ["US", "UK"] },
      { merchant: "Deel", network: "partnerstack", model: "CPA", payout_eur: 230, geos: EU },
      { merchant: "BambooHR", network: "partnerstack", model: "CPL", payout_eur: 60, geos: ["US", "UK", "CA"] },
      { merchant: "Paychex", network: "cj", model: "CPL", payout_eur: 75 },
    ],
  },
];
