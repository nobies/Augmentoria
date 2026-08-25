# FreeFrame review-engine integration

This spike keeps the existing Augmentoria application and review route intact.
FreeFrame v1.9.0 is pinned as a Git submodule under `services/freeframe` and runs
as an isolated review/media service.

## Safety boundary

- Existing review: `/studio/review/:projectId/:version`
- Pro review bridge: `/studio/pro-review/:projectId/:version`
- FreeFrame web: `http://localhost:3000`
- FreeFrame API: `http://localhost:8000`
- MinIO media: `http://localhost:9000`
- PostgreSQL: local Docker volume, port `5433`

No existing project, asset, comment, or session data is migrated by this spike.
The bridge carries Augmentoria project/version context in the launch URL only;
durable ID mapping is the next integration boundary.

## Setup

```bash
git submodule update --init --recursive
npm run review:engine:setup
npm run review:engine:build
npm run review:engine:status
```

The setup command creates the ignored `services/freeframe/.env` from the tracked,
development-only template. Replace its JWT secret and mail settings before any
shared or production deployment.

The tracked Compose override also corrects the FreeFrame development web health
check for Docker Desktop's IPv6 `localhost` resolution; upstream source stays
unchanged.

The first FreeFrame visit opens its setup flow. Create the local super-admin,
then create one Vodafone test project and upload a review version.

## Feature flags

- `VITE_ENABLE_FREEFRAME=true|false` (enabled automatically in Vite dev mode)
- `VITE_FREEFRAME_URL=http://localhost:3000`
- `VITE_FREEFRAME_API_URL=http://localhost:8000`

Production should keep the flag disabled until shared auth, project/version ID
mapping, storage policy, and migration verification are complete.

## Next contract

The next phase adds an Augmentoria integration adapter responsible for:

1. User/role provisioning and SSO.
2. Company/client/project mapping to FreeFrame organizations and projects.
3. AssetVersion mapping and upload handoff.
4. Event synchronization for comments, approvals, and activity logs.
5. Augmentoria branding, Arabic/RTL, and white-label settings.
