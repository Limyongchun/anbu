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
- **Auth**: OTP via `POST /api/auth/send-otp` + `POST /api/auth/verify-otp`; devCode returned in non-production; Apple/Google social login via `POST /api/auth/apple` + `POST /api/auth/google`
- **Expo Go Compatibility**: Native modules (`expo-apple-authentication`, `expo-auth-session`, `expo-camera`, `expo-clipboard`, `expo-task-manager`) are loaded via `try { require(...) } catch {}` to prevent crashes when running in Expo Go. All dependent code uses optional chaining (`?.`) and early returns. All packages use SDK 54 compatible versions.
- **Account system**: `accountsTable` (id serial, phone text unique, created_at, updated_at); `family_members.account_id` nullable FK to accounts; on verify-otp, find-or-create account by phone → returns `accountId` + `existingFamilies`; client stores `accountId` in AsyncStorage via FamilyContext; `child-signup.tsx` shows recovery UI if existing families found; `GET /api/account/:accountId/families` for auto-recovery; `family/create` and `family/join` accept optional `accountId`
- **DB schema** `familyMembersTable`: includes `childRole text` column (null for parents, "master"/"sub" for children), `accountId integer` nullable FK to `accountsTable`
- **Parent Activity Logs**: `parentActivityLogsTable` in DB; API `POST /api/family/:code/activity` + `GET /api/family/:code/activities`; parent app logs heart/view_slide/location/app_open activities with throttling; child app fetches real logs for "최근 활동" section
- **Code Structure (parent screen)**: `parent.tsx` is a thin orchestrator; logic lives in `logic/` hooks (useSlideshow, useLocationTracking, useParentMessages, useOverlayUI, useHeartAnimation, formatTime); UI components in `components/parent/` (PhotoSlide, TextSlide, RenderSlide, ProgressBars, TopOverlay, BottomOverlay, HeartParticle, PauseBadge, EmptyState)
- **Privacy Mode**: Parents can toggle privacy mode in profile settings; when enabled, their location pin is hidden on child's map and replaced with a status card showing activity status (active/last seen); DB `privacyMode` boolean in `familyMembersTable`; API `PATCH /api/family/:code/member/:deviceId/privacy`; purple-themed UI (#8b5cf6)
- **Location**: uses `expo-location` foreground permissions + `watchPositionAsync` (BestForNavigation accuracy, 10s/10m interval) + `reverseGeocodeAsync`; includes `heading` (compass direction 0-360°) and `speed` (m/s) tracking via `watchHeadingAsync`
- **Heading/Direction**: DB `family_locations` stores `heading` (real, degrees) + `speed` (real, m/s); banner shows "남동 방향 · 4 km/h" style info
- **Naver Map Integration**: `features/location/map/` — NaverMapView.tsx (web: direct DOM rendering, native: WebView HTML), mapTypes.ts (ParentLocation, MapStatusText), mapUtils.ts (getStatusText ko/en/ja), ParentMarker.tsx (unused, reserved for overlay); env `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`; supports multi-parent markers with click-to-select; SSE real-time updates flow through `locs` state → `naverLocs` memo → NaverMapView props; info card shows parent name + motion state + freshness
- **Background Location**: `lib/backgroundLocation.ts` — `expo-task-manager` + `expo-location` background API; task `ANBU_BACKGROUND_LOCATION` defined at top-level via import in `_layout.tsx`; saves config to AsyncStorage for background task access; 5-min interval, 50m distance; includes heading/speed from coords; iOS UIBackgroundModes + Android foreground service configured in `app.json`; web falls back to foreground-only; `parent.tsx` auto-starts background tracking when sharing is on
- **Device ID**: generated once as `device_<timestamp36>_<random9>`, stored in AsyncStorage
- **오늘의 안부 해석 카드 규칙** (`child.tsx` HomeScreen):
  - 레벨 판정 순서: `sleep → alert → safe → quiet → check`
  - **alert 레벨 조건**: 부모 접속자 두 명 모두 비활동이거나, 한 명이 오랫동안 비활동(3시간+, 붉은 배지)을 유지할 때
  - **alert 시**: 🚨 긴급/걱정 톤 메시지 + 빨간색 강조 + 카드 외곽에 로즈톤 border glow 애니메이션 (SVG 기반, 8초 주기 느린 순환, 로즈 #C4787A, 은은한 blur gradient, 경고가 아닌 프리미엄 주의 신호)
  - **평상시 (safe/quiet/check/sleep)**: border tracer 없음, 붉은 라인 없음
  - 오늘 날짜 활동만 집계 (`todayStr` 필터), 과거 기록은 레벨 판정에 포함하지 않음
  - 랜덤 문구: `anbuCheckMessages` (check, 30개) / `anbuAlertMessages` (alert, 30개) — ko/en/ja 각각
- **Status Engine (New)**: `features/status/` — unified status system with stabilizer
  - `types.ts`: ParentStatus (SAFE/CHECK/DANGER/CRITICAL/SIGNAL_LOST), EvaluateInput/Result
  - `evaluateParentStatus.ts`: Core evaluation — inactive minutes, signal lost minutes, wake delay; thresholds CHECK≥180m, DANGER≥360m, CRITICAL≥720m, SIGNAL_CRITICAL≥720m; SIGNAL_LOST 10-minute buffer (if lastAppActivity or lastHeartbeat within 10m, suppress SIGNAL_LOST); sleep window (22:00–07:00) overrides to SAFE except CRITICAL/SIGNAL_LOST
  - `stabilizer.ts`: Delays status transitions — SAFE 5m, CHECK 10m, DANGER 20m, CRITICAL 10m+2 repeat confirmations; prevents flapping between states
  - `statusDisplay.ts`: `STATUS_FLAG_USE_NEW` toggle (true=new engine, false=rollback); color/badge/label/summary mapping functions for all 5 statuses; `getPrimaryActions()` for contextual action buttons
  - `StatusDebugCard.tsx`: Debug overlay (dev only) showing computed→confirmed→final status pipeline, app/heartbeat/online timestamps, mock presets
  - `statusLogService.ts`: Persists status transitions to AsyncStorage
  - `notificationService.ts`: Push notifications on confirmed status changes
  - **Unified finalStatus**: `child.tsx` computes single `finalStatus` from `confirmedStatus` (stabilizer output); badge, body text, summary bar, interpretation card ALL derive from the same `finalStatus` — no divergence possible
  - **Summary bar**: Counts CHECK/DANGER/CRITICAL/SIGNAL_LOST as "needs attention"; only SAFE excluded
  - `useParentStatus.ts` (legacy): React hook `useParentStatusEngine(lang)` — old 2-phase system, used as fallback when `STATUS_FLAG_USE_NEW=false`
  - **DB tables**: `status_change_logs` (status transition history), `parent_schedule` (wake/sleep hours per parent)
  - **API endpoints**: `GET/PUT /api/family/:code/schedule/:deviceId`, `POST /api/family/:code/status-log`, `GET /api/family/:code/status-logs`
- **Inquiry System**: `app/inquiry.tsx` — form screen (name, email, subject, content) with success state; profile "이메일 문의" button routes to inquiry screen; `POST /api/inquiry` persists to `inquiriesTable`; DB: `inquiriesTable` (userId, userName, userEmail, title, content, reply, repliedAt)
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
- **Inquiries tab**: List all user inquiries with reply/delete; detail view with mailto integration and reply saving
- **Packages**: `jsonwebtoken` + `@types/jsonwebtoken` in api-server

### `artifacts/support` (`@workspace/support`)

Apple 심사용 고객지원 웹페이지 (`/support/`). React + Vite 단일 페이지.
- **이메일**: `2011atrees@gmail.com`
- 포트: 22770

### Account Deletion (계정 삭제 - Apple 심사 대응)

자녀 계정 전용 앱 내 계정 삭제 기능. Apple App Store 심사 요건 충족.
- **대상**: `role === "child"` 자녀 계정만 (부모 화면에는 노출 안 됨)
- **UI 위치**: 설정(프로필) 화면 하단 → "로그아웃" + "계정 삭제" 메뉴
- **2단계 확인 플로우**: 1차 경고 모달 → 2차 "DELETE" 입력 확인
- **서버 엔드포인트**: `DELETE /api/account/:accountId` (auth.ts)
  - deviceId 소유권 검증
  - DB 트랜잭션으로 accounts, family_members, family_locations 전부 삭제
- **로컬 데이터 정리**: AsyncStorage 전체 키 삭제 (account, family, photo, privacy, bg_loc)
- **i18n**: ko/en/ja 3개 언어 지원
- **API 클라이언트**: `api.deleteAccount(accountId, deviceId)` (lib/api.ts)

### Guest Mode (체험 모드)

Apple 심사를 위한 로그인 없이 앱 진입 기능. 기본적으로 게스트 모드가 켜져 있어 앱 실행 즉시 자녀 홈 화면 진입.
- **GuestModeContext**: `context/GuestModeContext.tsx` — `isGuestMode` 상태 관리; 기본값 `true`
- **FamilyContext 연동**: 게스트 모드 시 가짜 familyCode(`DEMO01`), deviceId, 부모 정보 자동 제공
- **Mock 데이터**: 어머니/아버지 2명의 부모 (SAFE 상태, 위치/활동 데이터 포함)
- **체험 모드 배너**: 홈 상단 노란색 배너 + "로그인하기" 버튼으로 실제 로그인 화면 전환
- **API 호출 차단**: 게스트 모드에서 모든 서버 API 호출 스킵
- **i18n**: ko/en/ja 3개 언어 지원 (`guestBannerTitle`, `guestBannerDesc`, `guestLoginBtn`)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
