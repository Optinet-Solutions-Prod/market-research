# Opportunity Radar

The research engine that sits in front of the domain → hosting → website build system. For every brand in every industry it works out whether a comparison or alternatives site would pay off, and only the winners go on to be built.

```
Industry → Brands → Keyword ecosystem → SERPs → Affiliate economics → Domains → Risk → Score → BUILD / REVIEW / SKIP → Handoff
```

**Stack:** Next.js 16 (App Router, Server Actions), Tailwind CSS v4, Supabase (Postgres).

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

Open **Run Market Scan** and click **Run demo scan**. Without any environment variables the app uses an in-memory store and deterministic synthetic market data, so you can try the full pipeline straight away. The data resets when the server restarts.

## Going live

1. **Supabase.** Create a project and apply the schema:
   ```bash
   supabase link --project-ref <ref> && supabase db push
   # or paste supabase/migrations/0001_opportunity_radar.sql into the SQL editor
   ```
   Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Then go to **Catalog → Load starter catalog**.
2. **DataForSEO.** Set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD` to enable **Live** mode. Each brand costs about 1 search-volume request plus 4 SERP requests.
3. **Domains.** Availability comes from RDAP (free, no key). Set the Namecheap variables for registrar-accurate checks.
4. **Affiliate programs.** The starter payouts are **illustrative estimates**. Replace them with the real terms from Impact, Awin, CJ, PartnerStack and others on the Catalog page. Each program's terms (brand keywords, comparison content) feed the risk score.
5. **Build system.** Set `BUILD_WEBHOOK_URL` (and `BUILD_WEBHOOK_SECRET` for HMAC signing). If no webhook is set, approved handoffs are queued for your system to pull.
6. **External hosting.** Set `RADAR_ADMIN_PASSWORD` (basic auth on the dashboard) and `RADAR_API_KEY` (a bearer token for machine access to `/api/*`).

See [.env.example](.env.example) for every variable.

## Scoring model (100 points)

| Factor | Weight | Factor | Weight |
|---|---|---|---|
| Commercial search demand | 20 | Competitor diversity | 5 |
| SERP weakness | 20 | Content moat | 5 |
| Affiliate economics | 20 | Geo expansion | 5 |
| Conversion intent | 10 | SEO risk (inverted) | 5 |
| Domain quality | 5 | Legal/trademark risk (inverted) | 5 |

- **BUILD** needs a score of 75 or more, legal risk below 45 and SEO risk below 50. **REVIEW** needs a score of 60 or more. Everything else is **SKIP**.
- **Risk tier** is the higher of the legal and SEO risk: 60 or more is RED, 35 or more is YELLOW, anything lower is GREEN.
- **Revenue** is calculated as commercial searches → expected rank (from SERP weakness) → CTR → visitors → affiliate click rate → merchant conversion → commission. It is shown in three scenarios: conservative ×0.55, expected, and aggressive ×1.75. Break-even assumes a 6-month ramp to the expected traffic.

You can change the weights and thresholds on the **Scoring Model** page. Saving re-scores every stored opportunity.

## Domain and trademark policy

| Risk | Pattern | Handoff |
|---|---|---|
| GREEN | Generic category or editorial (`bestcrm.io`, `crmalternatives.com`) | Allowed when available |
| YELLOW | Brand name in a comparative context (`brandalternatives.com`) | Only after a confirmed trademark review |
| RED | Exact brand on another TLD, typo of a brand, or brand without comparative context | Never. Shown for visibility only, and its availability is not checked |

Moving a brand to another TLD doesn't reduce UDRP "confusingly similar / bad faith" exposure, and Google's doorway and scaled-content policies target networks of near-identical brand sites. The engine therefore uses brand demand as the **research signal** and builds one genuinely useful comparison property per cluster.

## API (for your build system)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/scans` | `{ mode: "demo"\|"live", industries?: string[], geo?: "US", brandLimit?: number }` starts a scan in the background (202) |
| `GET` | `/api/scans/:id` | Scan progress and log |
| `GET` | `/api/opportunities?risk=&minScore=&decision=&industry=&q=` | Ranked opportunities |
| `GET` | `/api/opportunities/:id` | Opportunity with its domains, keywords and SERPs |
| `POST` | `/api/handoffs` | `{ opportunityId, domain?, trademarkReviewed? }` runs the gate and sends or queues |
| `GET` | `/api/handoffs?status=queued` | Pull queue |
| `GET` | `/api/export` | CSV, using the same filters as the board |

Webhook payload: `event`, `opportunity` (score, revenue range, break-even), `domain`, `keywords`, `affiliate_programs`, `site_structure`, `seo_strategy`, `budget`. When a secret is set, the body is signed as `X-Radar-Signature: sha256=<hmac>`.

## Layout

```
src/lib/engine/      scoring, revenue model, keyword expansion, SERP analysis, signals, domains, scan orchestrator, handoff
src/lib/providers/   demo (synthetic), DataForSEO, RDAP, Namecheap
src/lib/db/          Store interface → Supabase implementation + in-memory fallback
src/app/             dashboard pages, server actions, /api routes
supabase/migrations/ schema (RLS on, server-only service-role access)
```

Scans run with `after()` once the response has been sent, with `maxDuration` set to 300 s. For very large live scans, limit the brands per industry or run several scans.
