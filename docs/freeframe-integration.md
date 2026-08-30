# FreeFrame evaluation boundary

FreeFrame v1.9.0 remains pinned under `services/freeframe` as an isolated evaluation
service. It is not embedded in the product UI and it is not an authentication or
settings authority.

## Product behavior

- Canonical authenticated review: `/studio/review/:projectId/:version`
- Public/client review: `/review/:projectId/:version`
- Former Pro Review link: compatibility alias only; it renders the same unified workspace
- One Augmentoria profile, role matrix, project asset library, comments and reports
- No FreeFrame login, project setup or duplicate settings are shown to users

The local product deliberately uses its own review workspace until an online adapter can
provide shared identity, durable IDs, storage and event synchronization. This prevents a
second account system from leaking into the user experience.

## Unified local start

```bash
npm run dev:local
```

This starts Vite and the local WebSocket collaboration service together. The realtime
health endpoint is `http://localhost:8787/health`. The collaboration service is for local
development only and has no production authentication.

## Optional FreeFrame evaluation

```bash
git submodule update --init --recursive
npm run review:engine:setup
npm run review:engine:build
npm run review:engine:status
```

The optional service uses FreeFrame web on `http://localhost:3000`, API on
`http://localhost:8000`, MinIO on `http://localhost:9000`, and PostgreSQL on port `5433`.
It is not required to run or test Augmentoria locally.

## Online integration contract

The deferred online phase must add a provider adapter for:

1. Real authentication/SSO and server-enforced role checks.
2. Durable company, client, project, asset and version IDs.
3. Google Drive originals plus proxy/CDN delivery.
4. Persisted realtime comments, sessions, approvals and activity events.
5. Background rendering/transcoding only where the source format requires it.
