# WikiGraph

Interactive map of geotagged Wikipedia articles: explore places, read summaries, and open full articles on Wikipedia. Works as a installable PWA with caching for tiles and API responses.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm (comes with Node)

## Local development

```sh
npm install
npm run dev
```

The dev server listens on port **8080** (see `vite.config.ts`).

## Scripts

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev` | Start Vite dev server    |
| `npm run build` | Production build      |
| `npm run preview` | Preview production build |
| `npm run lint`  | Run ESLint             |

## Tech stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Leaflet, React Router, TanStack Query, `vite-plugin-pwa`.

## Production URL in static files

Canonical, Open Graph, Twitter, `robots.txt`, and `sitemap.xml` use **`https://wikigraph.app`** as a placeholder. Before you deploy, search the repo for `https://wikigraph.app` and replace with your real public URL if it differs.

## License

Content from Wikipedia is subject to the [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/) license; this app’s code is provided as in the repository (add a license file if you need a specific OSS license).
