# WikiGraph — project task log

## Project requirements (reference)

- **App**: WikiGraph — interactive map of geotagged Wikipedia articles.
- **Stack**: Vite, React 18, TypeScript, Tailwind, shadcn/ui (Radix), React Router, TanStack Query, Leaflet + marker clustering, `vite-plugin-pwa` (offline-oriented caching).
- **Data**: Public Wikipedia Action API (`geosearch`, article extracts, images, search) — no backend in-repo.
- **Working directory**: Source lives in this folder (`wikigraph-main/` inside the desktop zip); run `npm i` / `npm run dev` here (dev server port **8080** per `vite.config.ts`).
- **Change tracking**: `change-notes/` — `CHANGELOG.txt`, `APP_FEATURES_AND_FUNCTIONS.txt`.

## Architecture (short)

| Area | Role |
|------|------|
| `src/pages/Index.tsx` | Splash (~2s) then full-screen `MapView` + `OfflineIndicator` |
| `src/components/MapView.tsx` | Leaflet map, layers, markers, search/menu, info panel orchestration |
| `src/lib/wikipedia.ts` | API types and `fetchNearbyPlaces` (up to 200), `fetchArticleDetails`, `fetchArticleImages`, `searchPlaceByName` |
| `src/lib/mapConstants.ts` | OSM/Esri tiles, `MIN_SCAN_ZOOM` (11), discovery themes + fixed lat/lon lists, `AVAILABLE_LANGUAGES` |
| `src/hooks/useMapPlaces.ts` | Debounced fetch by map center/bounds + radius; scan disabled when zoomed out |
| `src/hooks/useDiscovery.ts` | “Discover” menu: random fly-to from theme lists with small per-theme history |
| `src/hooks/useHoverPreview.ts` | Delayed hover preview + LRU cache for article snippets |
| `src/components/WikiInfoPanel.tsx` | Side panel for selected article |
| `src/components/SearchPanel.tsx` | Search UI (coordinates or title via Wikipedia) |
| Routes in `App.tsx`: `/`, `/install`, `/about`, `*` → NotFound |

## Tasks completed

### 2026-04-21

- Read repository structure and main source files; summarized app behavior and stack above for future work.
- Removed Lovable-related tooling and URLs (`lovable-tagger`, `wikigraph.lovable.app`); README is WikiGraph-only; neutral `https://wikigraph.app` placeholder in static SEO files.
- Ran build/tsc/lint audit: fixed all ESLint errors and shadcn UI react-refresh warnings; `npm run lint`, `npx tsc --noEmit`, and `npm run build` succeed.
- Implemented optional plan: lazy `MapView`, public PWA icon for branding (lighter bundle), URL query sync (`lat`/`lng`/`z`/`lang`/`pageid`), `WikiApiResult` + user-visible retries for Wikipedia calls.
- Mobile/UI follow-ups: `100dvh` layout, safe-area insets, 44px map controls, `aria-label` / dialog semantics, focus trap + Escape on Search/Info panels, `prefers-reduced-motion` on animations, idle prefetch of map chunk.
- Implemented Cloudflare-focused SEO hardening without creating new pages:
  - Updated `public/sitemap.xml` to include canonical coverage for `/`, `/install`, and `/about`.
  - Updated `public/robots.txt` with sitemap directive and crawler limits for service worker files.
  - Added route-level SEO metadata using `react-helmet-async` in `src/main.tsx`, `src/pages/Index.tsx`, `src/pages/InstallPage.tsx`, and `src/pages/AboutPage.tsx`.
  - Improved global metadata and added `WebSite` + `Organization` structured data in `index.html`.
  - Added Cloudflare Pages header rules in `public/_headers` for safe HTML/service-worker caching and immutable asset caching.
  - Re-ran verification: `npm run lint` and `npm run build` pass.

---

*When adding a new task: append a dated entry under “Tasks completed” (or a “Tasks pending” section if you use one).*
