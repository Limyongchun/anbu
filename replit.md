# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/mobile` (`@workspace/mobile`)

Expo React Native app called A N B U. Korean family safety app.

- **Design System**: "Calm Premium" — KakaoBank/Runna/Stoic/Forest inspired; colors.ts defines base (#F5F7FA bg), brand (#D7FF00 lime), status (success/warning/danger/info), card accents (blueSoft/greenSoft/orangeSoft/purpleSoft); Runna-style left color indicator on parent cards; lime only for CTA/accent
- **Two modes**: Parent (digital photo frame) and Child (home dashboard + 5-tab nav)
- **Multi-child architecture**:
  - **Master child**: First child who creates the family group via `POST /api/family/create` → `childRole = "master"`
  - **Sub children**: Additional children who join via `POST /api/family/join` using master's family code → `childRole = "sub"`
  - **Parent limit**: Max 2 parents per family (`MAX_PARENTS = 2`)
  - **Child limit**: Max 10 children per family (`MAX_CHILDREN = 10`)
  - **Master-only features**: disconnect from parent, child management section in profile
  - Sub children see all other features but cannot disconnect or manage children
- **Screens**:
  - `app/index.tsx` — Splash "당신은 누구십니까?" → routes to child-signup or parent setup
  - `app/child-signup.tsx` — Mode selection ("새 가족 만들기" = master / "코드로 참여" = sub) → OTP verify → join
  - `app/child.tsx` — 5-tab home: 홈/안부/위치/선물/알림; WaitingRoom (QR code) until parent joins
  - `app/parent.tsx` — Photo slideshow; fetches messages from ALL family codes (multi-child support)
  - `app/profile.tsx` — Settings; "자녀 관리" section (master only: shows code + children list); disconnect button hidden for sub-children
- **Context**: `context/FamilyContext.tsx` — AsyncStorage-backed: familyCode, allFamilyCodes, deviceId, myName, myRole, childRole ("master"|"sub"|null), isMasterChild
- **API client**: `lib/api.ts` — typed fetch client; uses `EXPO_PUBLIC_API_URL` (EAS builds) or `EXPO_PUBLIC_DOMAIN` (dev) env var
- **Auth**: OTP via `POST /api/auth/send-otp` + `POST /api/auth/verify-otp`; devCode returned in non-production
- **Account system**: `accountsTable` (id serial, phone text unique, created_at, updated_at); `family_members.account_id` nullable FK to accounts; on verify-otp, find-or-create account by phone → returns `accountId` + `existingFamilies`; client stores `accountId` in AsyncStorage via FamilyContext; `child-signup.tsx` shows recovery UI if existing families found; `GET /api/account/:accountId/families` for auto-recovery; `family/create` and `family/join` accept optional `accountId`
- **DB schema** `familyMembersTable`: includes `childRole text` column (null for parents, "master"/"sub" for children), `accountId integer` nullable FK to `accountsTable`
- **Parent Activity Logs**: `parentActivityLogsTable` in DB; API `POST /api/family/:code/activity` + `GET /api/family/:code/activities`; parent app logs heart/view_slide/location/app_open activities with throttling; child app fetches real logs for "최근 활동" section
- **Code Structure (parent screen)**: `parent.tsx` is a thin orchestrator; logic lives in `logic/` hooks (useSlideshow, useLocationTracking, useParentMessages, useOverlayUI, useHeartAnimation, formatTime); UI components in `components/parent/` (PhotoSlide, TextSlide, RenderSlide, ProgressBars, TopOverlay, BottomOverlay, HeartParticle, PauseBadge, EmptyState)
- **Privacy Mode**: Parents can toggle privacy mode in profile settings; when enabled, their location pin is hidden on child's map and replaced with a status card showing activity status (active/last seen); DB `privacyMode` boolean in `familyMembersTable`; API `PATCH /api/family/:code/member/:deviceId/privacy`; purple-themed UI (#8b5cf6)
- **Location**: uses `expo-location` foreground permissions + `watchPositionAsync` + `reverseGeocodeAsync`
- **Background Location**: `lib/backgroundLocation.ts` — `expo-task-manager` + `expo-location` background API; task `ANBU_BACKGROUND_LOCATION` defined at top-level via import in `_layout.tsx`; saves config to AsyncStorage for background task access; 5-min interval, 50m distance; iOS UIBackgroundModes + Android foreground service configured in `app.json`; web falls back to foreground-only; `parent.tsx` auto-starts background tracking when sharing is on
- **Device ID**: generated once as `device_<timestamp36>_<random9>`, stored in AsyncStorage
- **오늘의 안부 해석 카드 규칙** (`child.tsx` HomeScreen):
  - 레벨 판정 순서: `sleep → alert → safe → quiet → check`
  - **alert 레벨 조건**: 부모 접속자 두 명 모두 비활동이거나, 한 명이 오랫동안 비활동(3시간+, 붉은 배지)을 유지할 때
  - **alert 시**: 🚨 긴급/걱정 톤 메시지 + 빨간색 강조 + 카드 외곽에 로즈톤 border glow 애니메이션 (SVG 기반, 8초 주기 느린 순환, 로즈 #C4787A, 은은한 blur gradient, 경고가 아닌 프리미엄 주의 신호)
  - **평상시 (safe/quiet/check/sleep)**: border tracer 없음, 붉은 라인 없음
  - 오늘 날짜 활동만 집계 (`todayStr` 필터), 과거 기록은 레벨 판정에 포함하지 않음
  - 랜덤 문구: `anbuCheckMessages` (check, 30개) / `anbuAlertMessages` (alert, 30개) — ko/en/ja 각각
- **Privacy Policy Screen**: `app/privacy.tsx` — dedicated scrollable screen with shield icon, accessible from profile settings
- **EAS Build**: `eas.json` — development (simulator), preview (internal), production (auto-increment) profiles; uses `EXPO_PUBLIC_API_URL` env var pointing to production API
- **Deployment**: API server builds to `dist/index.cjs` via esbuild; health check at `/api/healthz`; splash background matches brand color (#7A5454)

### `artifacts/admin` (`@workspace/admin`)

React + Vite admin dashboard for A N B U. Dark-themed management UI at `/admin/`.

- **Login**: Password-based auth via `POST /api/admin/login` → JWT token stored in `sessionStorage`
- **Dashboard tab**: Stats overview (families, members, parents, children)
- **Families tab**: List all family codes with member counts, delete families
- **Members tab**: List all members with search, delete members
- **API routes**: `artifacts/api-server/src/routes/admin.ts` — JWT-protected admin endpoints
- **Env vars**: `ADMIN_PASSWORD` (required), `JWT_SECRET` (required) — admin is disabled if either is missing
- **Packages**: `jsonwebtoken` + `@types/jsonwebtoken` in api-server

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
