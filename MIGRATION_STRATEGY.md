# Migration Strategy & Data Transition Plan (`MIGRATION_STRATEGY.md`)

**Date:** August 20, 2026  
**Subject:** Transition from Prototype Schema (`studios`, `projects`, `cuts`, `notes`, `client_shares`) to Multi-Tenant SaaS Schema (`companies`, `profiles`, `company_memberships`, `clients`, `projects`, `assets`, `asset_versions`, `review_sessions`, etc.)

---

## 1. Executive Summary & Strategy Principles

To transition the production platform from the single-tenant prototype into a true multi-tenant SaaS architecture without data loss, downtime, or security regressions, we employ a **Phased Dual-Write / Backfill Transition Strategy** using a dedicated staging environment prior to production execution.

---

## 2. Inventory of Legacy Prototype Tables

| Legacy Table | Legacy Primary Key | Current Limitations | Target Multi-Tenant Replacement |
| :--- | :--- | :--- | :--- |
| `public.studios` | `id uuid` | Single global workspace; no tenant isolation or RBAC. | `public.companies` (Multi-tenant company accounts with plans & brand tokens). |
| `public.projects` | `id text` | String ID, no `company_id` foreign key, no client link. | `public.projects` (UUID primary key, strict `company_id`, `client_id`, status). |
| `public.cuts` | `id text` | Flat table mixing versions, local files, and external links. | `public.assets` + `public.asset_versions` (lineage tracking, proxy URLs). |
| `public.notes` | `id text` | Tied directly to `cut_id` without `company_id` scope. | `public.review_comments` + `public.review_annotations` (tenant-scoped). |
| `public.client_shares`| `id uuid` | Unsigned tokens; public `using (true)` policies. | `public.share_links` (Cryptographic HMAC tokens, expiry, revocation). |

---

## 3. Recommended 4-Stage Migration Execution

### Stage 1: Dedicated Staging Environment Testing
1. Provision a isolated staging Supabase project (or temporary branch schema `staging_v2`).
2. Apply `supabase/migrations/20260820_phase1_multitenant_rls.sql`.
3. Run `supabase/migrations/test_tenant_isolation.sql` to verify RLS policies and cross-tenant isolation.
4. Execute automated integration tests.

### Stage 2: Production Non-Destructive Side-by-Side Schema Deployment
1. Create the new multi-tenant tables (`companies`, `profiles`, `company_memberships`, `clients`, `assets`, `asset_versions`, `review_sessions`, `review_comments`, `share_links`, etc.) **without dropping legacy tables**.
2. Legacy tables (`studios`, `cuts`, `notes`, `client_shares`) remain untouched to ensure 100% zero downtime for active users.

### Stage 3: Data Backfill Script (Transitional ETL)
A deterministic backfill script migrates existing prototype data into the tenant schema:
1. **Studio -> Company**: Creates default company `Socialeyes Production` (`comp_socialeyes`) and `Vortex Studios` (`comp_vortex`).
2. **Users -> Profiles & Memberships**: Creates `profiles` and `company_memberships` assigning administrative roles.
3. **Projects -> Projects**: Backfills legacy projects with generated UUIDs, setting `company_id = comp_socialeyes`.
4. **Cuts -> Assets & Versions**: Maps each legacy cut into an `asset` and its initial `asset_version` (`v1`).
5. **Notes -> Comments & Annotations**: Migrates legacy notes into `review_comments` and vector drawings into `review_annotations`.

### Stage 4: Decommissioning & Cleanup
1. Once the application repositories (`src/lib/repositories/`) are 100% verified on the new schema in production, the legacy tables are deprecated.
2. Legacy tables are archived as backup snapshots and safely dropped after a 30-day verification window.

---

## 4. Rollback Plan
If any critical regression occurs during migration:
1. The new repository layer can instantly toggle back to the legacy adapter mode.
2. The legacy tables (`studios`, `cuts`, `notes`) remain fully preserved in PostgreSQL throughout the entire Phase 1 deployment.
