import type { DomainProvider } from "./types";

/**
 * RDAP lookup via rdap.org (free, no key). 404 → not registered → likely available.
 * Good for screening; confirm with the registrar before purchase.
 */
export const rdapDomains: DomainProvider = {
  name: "rdap",
  async check(domains) {
    const out = new Map<string, boolean | null>();
    await pool(domains, 4, async (d) => {
      try {
        const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(d)}`, {
          headers: { Accept: "application/rdap+json" },
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        out.set(d, res.status === 404 ? true : res.ok ? false : null);
      } catch {
        out.set(d, null);
      }
    });
    return out;
  },
};

/**
 * Namecheap domains.check — https://www.namecheap.com/support/api/methods/domains/check/
 * Env: NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP, NAMECHEAP_SANDBOX=true|false
 */
export function namecheapConfigured() {
  return Boolean(process.env.NAMECHEAP_API_USER && process.env.NAMECHEAP_API_KEY && process.env.NAMECHEAP_CLIENT_IP);
}

export const namecheapDomains: DomainProvider = {
  name: "namecheap",
  async check(domains) {
    const out = new Map<string, boolean | null>();
    const host =
      process.env.NAMECHEAP_SANDBOX === "true" ? "https://api.sandbox.namecheap.com" : "https://api.namecheap.com";
    for (let i = 0; i < domains.length; i += 50) {
      const batch = domains.slice(i, i + 50);
      const params = new URLSearchParams({
        ApiUser: process.env.NAMECHEAP_API_USER!,
        ApiKey: process.env.NAMECHEAP_API_KEY!,
        UserName: process.env.NAMECHEAP_API_USER!,
        ClientIp: process.env.NAMECHEAP_CLIENT_IP!,
        Command: "namecheap.domains.check",
        DomainList: batch.join(","),
      });
      try {
        const xml = await (await fetch(`${host}/xml.response?${params}`, { cache: "no-store" })).text();
        for (const m of xml.matchAll(/<DomainCheckResult[^>]*Domain="([^"]+)"[^>]*Available="(true|false)"/g)) {
          out.set(m[1].toLowerCase(), m[2] === "true");
        }
      } catch {
        // leave unknown
      }
      for (const d of batch) if (!out.has(d)) out.set(d, null);
    }
    return out;
  },
};

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}
