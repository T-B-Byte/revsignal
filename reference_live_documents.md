# Live Documents Registry

All shareable documents hosted on surgeengine.app, RevSignal, and related domains.

## SurgeEngine.app

| URL | Purpose | Password | Created |
|-----|---------|----------|---------|
| `surgeengine.app/daas-framework.html` | Full DaaS Product Framework (3 pages: tiers, surge products, account matrix) | None | 2026-03 |
| `surgeengine.app/matrix.html` | Account matrix only (standalone for sharing) | `revenue2026` | 2026-04-02 |
| `surgeengine.app/frameworks/ibm` | Customer-facing tier framework (4 tiers, doubled pricing, 30K accounts) | None | 2026-04-02 |
| `surgeengine.app/demo/sap` | SAP Surge Dossier demo | None | 2026-03 |
| `surgeengine.app/demo/lenovo` | Lenovo Surge Dossier demo | None | 2026-03 |
| `surgeengine.app/demo/docusign` | DocuSign Surge Dossier demo | None | 2026-03 |
| `surgeengine.app/audience-dashboard.html` | SurgeEngine audience dashboard | None | 2026-04-15 |

## RevSignal (revsignal.vercel.app)

| URL | Purpose | Password | Created |
|-----|---------|----------|---------|
| `revsignal.vercel.app/frameworks/ibm` | IBM: DaaS Tiered Licensing Model (4 tiers, 30K accounts) | None | 2026-04-06 |
| `revsignal.vercel.app/daas-framework.html` | Full DaaS Product Framework (tiers, surge products, account matrix) | `daas-revenue-$$$` | 2026-03-30 |
| `revsignal.vercel.app/daas-framework-v2.html` | Internal CFO-facing pricing reference (actual prices, billing channels) | `daas-revenue-$$$` | 2026-04-13 |
| `revsignal.vercel.app/daas-go-to-market.html` | Combined DaaS doc: v2 pricing reference + live account matrix at bottom (shared Supabase state) | `daas-revenue-$$$` | 2026-04-23 |
| `revsignal.vercel.app/matrix.html` | Account matrix standalone (shared Supabase state with daas-framework) | `revenue2026` | 2026-04-05 |
| `revsignal.vercel.app/battlecards.html` | 8 competitor battlecards for pharosIQ Lead Gen / Demand Gen sales team | `BattleCard1` | 2026-03-31 |
| `revsignal.vercel.app/daas-product-definition.html` | Original contact vs. persona comparison doc (legacy, superseded by DaaS Framework) | None | 2026-03-28 |

## Other

| URL | Purpose | Password | Created |
|-----|---------|----------|---------|
| `audience-dashboard-liard.vercel.app/Public/integrate-field-analysis.html` | DB field analysis: new field candidates for pharosIQ schema. Presented to Ben Luck. | None | 2026-04-15 |

## Notes
- `matrix.html`, `daas-framework.html`, and `daas-go-to-market.html` share the same Supabase backend (`daas_framework_state` table). Changes on any one reflect on the others in realtime.
- All surgeengine.app pages blocked from Google indexing via `robots.ts` (disallow all).
