# SmoothJS Internals

This codebase is a minimal implementation of how a React framework like **Next.js worked before React Server Components (RSCs)** were introduced. It is not a production framework. Its purpose is to teach and demonstrate the core ideas: file-based routing, server-side rendering, client-side hydration, and client-side navigation with loading skeletons. Everything is built on Bun.

This document walks through every module, every function, and how they connect. Each section starts with the "why" before the "how". If you are new to these concepts, start with the Big Picture below.

---

## Table of Contents

1. [Big Picture](#big-picture)
2. [Types (`pkg/types.ts`)](#types)
3. [Router (`pkg/router/`)](#router)
4. [Build (`pkg/build/`)](#build)
5. [Renderer (`pkg/renderer/index.ts`)](#renderer)
6. [Hydrate (`pkg/hydrate/index.ts`)](#hydrate)
7. [Server (`pkg/server/index.ts`)](#server)
8. [Watcher (`pkg/watcher/index.ts`)](#watcher)
9. [How It All Fits Together](#how-it-all-fits-together)

---

## Big Picture

### The problem: how traditional React SPAs work (and why it hurts)

Imagine a typical React app built with Create React App or Vite without SSR configuration. Here is what happens when a browser visits it:

```
  Browser                                                                    Server
    |                                                                          |
    |-------------------------- GET / ---------------------------------------->|
    |                                                                          |
    |<--------------------- empty HTML ----------------------------------------|
    |  <div id="root"></div>                                                   |
    |  <script src="bundle.js"></script>                                       |
    |                                                                          |
    |------------------------- GET bundle.js --------------------------------->|
    |                                                                          |
    |<--------------------- bundle.js -----------------------------------------|
    |  (React, router,                                                         |
    |   API clients, icons,                                                    |
    |   ALL page components,                                                   |
    |   libraries, etc.)                                                       |
    |                                                                          |
    |  [browser runs bundle.js]                                                |
    |  React renders UI                                                        |
    |  (user sees blank until this finishes)                                   |
    |                                                                          |
    |------------------------- GET /api/data --------------------------------->|  (data fetching round trips)
    |<--------------------- JSON data -----------------------------------------|
    |                                                                          |
    |  React re-renders with data, attaches event listeners                    |
    |                                                                          |
    |  [Page is now interactive]                                               |
```

The problems with this approach:

1. **Empty initial HTML.** The browser receives a bare document with a single `<div id="root">`. Search engine crawlers see nothing meaningful. Your SEO suffers.

2. **Heavy JavaScript bundle.** Every piece of code needed to run the entire application is in one file. React itself, the router, every page component, API client code, icon libraries, markdown parsers, date formatters. All of it. The user must download, parse, and execute this entire bundle before they see anything.

3. **Data fetching round trips.** After the bundle loads and React renders the UI, the app then makes network requests to fetch data. More waiting.

4. **Full page reloads on navigation.** Click a link? The whole cycle repeats. Download the full bundle again (or load it from cache), re-render, fetch data.

### The insight: do some work on the server instead

Next.js (before RSCs) solved these problems with a simple shift: instead of sending an empty HTML document and making the client do all the work, the server does some of the work upfront.

Here is the same visit with server-side rendering (SSR):

```
  Browser                                                                    Server
    |                                                                          |
    |------------------------- GET /blog/hello ------------------------------->|
    |                                                                          |
    |                                                                     1. Match URL to a route
    |                                                                     2. Fetch data (getServerSideProps)
    |                                                                     3. Render React to HTML
    |                                                                          |
    |<--------------------- full HTML -----------------------------------------|
    |  <html>                                                                  |
    |   <head>...</head>                                                       |
    |   <body>                                                                 |
    |    <nav>...</nav>                                                        |
    |    <article>...</article>                                                |
    |    <script>window.__DATA__={...}</script>                                |
    |    <script src="page.js"></script>                                       |
    |   </body>                                                                |
    |  </html>                                                                 |
    |                                                                          |
    |  [Browser renders HTML immediately - user sees the page with content]    |
    |                                                                          |
    |------------------------- GET page.js ----------------------------------->|
    |                                                                          |
    |<--------------------- page.js -------------------------------------------|
    |  (only this page's component + layouts, NOT the whole app)               |
    |                                                                          |
    |  React hydrates:                                                         |
    |   builds virtual DOM, compares with real HTML, attaches event listeners  |
    |                                                                          |
    |  [Page is now interactive]                                               |
```

Three things changed:

1. **The HTML is not empty.** It contains the fully rendered UI with actual data. The user sees the page immediately, before any JavaScript finishes downloading.

2. **The JS bundle is per-page, not the whole app.** The server sends only the code needed for this specific page, not the entire application. No more monolithic bundle.js.

3. **Data is fetched on the server.** `getServerSideProps` runs during the request, so the data is already in the HTML. No client-side data fetching waterfall on initial load.

### Hydration: watering the dry HTML

Here is the important mental model. The server sends HTML that looks complete and interactive, but it is not. Clicking a button does nothing. Hover effects do not work. The page is "dry" HTML - it has the right structure and content but no behavior.

**Hydration** is the process where React brings this dry HTML to life. Here is what the client bundle does when it runs:

1. React builds a virtual DOM tree from the same component code the server used.
2. React walks the real DOM (the HTML the server sent) and compares it to its virtual DOM.
3. Since both the server and client ran the same components with the same props, the trees should match. React "attaches" to the existing DOM nodes - adds event listeners, runs effects, sets up state.
4. The user sees zero visual change. The page was already visible. Now it is interactive.

This is why React needs to be sent to the client even with SSR. The browser still needs React code to build the virtual DOM, compare it to the real DOM, and attach event listeners. The server generates the HTML structure, but React on the client is what makes it interactive.

### Hydration errors and why they happen

For hydration to work, the server-rendered HTML must exactly match what the client-side React render produces. React checks this with strict equality. If there is a mismatch, React throws a hydration error and re-renders the entire tree on the client (losing the SSR benefit).

Common causes of hydration mismatches:

* **Non-deterministic values.** Your component renders `new Date().toISOString()` or `Math.random()`. The server renders one value, the client renders a different one. They do not match.

* **Browser-specific APIs.** Your component checks `window.innerWidth` or reads from `localStorage`. The server has no window object, so it renders a fallback. The client renders something different.

* **Incorrect HTML structure.** Browsers silently fix invalid HTML. For example, putting a `<div>` inside a `<p>` tag. The server generates `<p><div>text</div></p>`. The browser parses it as `<p></p><div>text</div><p></p>`. React on the client sees `<p><div>text</div></p>` in its virtual DOM, compares it to the browser-fixed DOM, and they do not match.

### The tension: do we actually ship less JavaScript?

Looking at the SSR approach carefully, a fair question arises: we still ship React to the client. We still ship component code to the client. The bundle is per-page instead of whole-app, but a user visiting many pages will eventually download most of the app anyway. What did SSR really buy us?

It bought three concrete things:

1. **Instant meaningful paint.** The user sees content immediately, before any JavaScript runs. No blank white screen while kilobytes parse.

2. **SEO.** Search engine crawlers see a fully rendered page with real content. They do not need to execute JavaScript.

3. **Server-side data fetching.** Data is fetched during the request, not after the page loads. No client-side loading spinners for initial data.

But it did not solve the JavaScript problem completely. You still send React to the client. You still send component code to the client. The client still needs to download, parse, and execute JavaScript for every page the user visits.

This tension is exactly what led to **React Server Components (RSCs)** . RSCs take the idea further: components that run and render entirely on the server, sending only their output (not their code) to the client. That is a separate topic. SmoothJS does not implement RSCs. SmoothJS represents the era before RSCs, when SSR was the primary tool for improving React applications.

### What SmoothJS implements specifically

SmoothJS is a minimal implementation of the pre-RSC Next.js model with these features:

* **File-based routing.** `app/blog/[slug]/page.tsx` automatically becomes `/blog/:slug`.
* **Server-side rendering.** React renders to HTML on the server for every request.
* **Per-page client bundles.** Each page gets its own JS bundle with just that page's code, not the whole app.
* **Client-side hydration.** React takes over the server-rendered HTML in the browser.
* **Client-side navigation.** Clicking a link fetches only the data (JSON) for the new page and swaps it in, no full page reload.
* **Loading skeletons.** If you define a `loading.tsx` next to a page, it shows while the new page's data is being fetched during client-side navigation.
* **Dev mode with auto-rebuild.** Changes to `app/` trigger a rebuild and browser reload automatically.

### The two phases

SmoothJS has two distinct phases:

**Build phase** (`smooth build` or `smooth dev`):
- Scans `app/` for `page.tsx` files
- Generates client JavaScript bundles for each page
- Compiles CSS via Tailwind
- Writes a manifest file (`.smooth/manifest.json`)

**Serve phase** (`smooth start` or `smooth dev`):
- Reads the manifest
- Starts an HTTP server
- For each request: match the URL, fetch data, render React to HTML, send the page

In dev mode these phases run in a loop: the watcher rebuilds whenever you change a file.

### What happens when a request comes in (end to end)

Before we dive into each module, here is the complete flow for a single page request. This is what every module in this codebase works together to accomplish. File references are included so you can jump to the implementation for each step.

When the server receives `GET /blog/hello-world`:

**Step 1: Look up the page in the manifest.** [`pkg/router/index.ts`](router/index.ts) [`pkg/types.ts`](types.ts)

On startup, the server loads a **manifest** - a JSON file produced during the build phase that catalogs every page in the app. Each entry in the manifest contains the URL pattern (e.g. `/blog/:slug`), the path to the page file on disk, which layout components wrap it, whether the route is dynamic or static, and where the compiled client bundle lives. The server checks this manifest for `/blog/hello-world`, matches the pattern `/blog/:slug`, and extracts the parameter `slug = "hello-world"`. This lookup is pure data - no filesystem scanning, no imports, no React. Just a pattern match against a prebuilt index.

**Step 2: Import the components.** [`pkg/renderer/index.ts`](renderer/index.ts)

The server loads the page component file and all its layout component files. These are the same React components the developer wrote - a page component is just a React component that receives props and returns JSX. Layouts are also React components that wrap the page content (e.g. a nav bar, a footer).

**Step 3: Fetch data on the server.** [`pkg/server/index.ts`](server/index.ts)

The server calls the page's `getServerSideProps` function (same name and concept as Next.js). If the page exports this function, it runs during the request on the server. It receives context about the request (dynamic params, query string, the raw request object) and returns a plain object of props. This function might query a database, call an external API, or read a file. The key point: data fetching happens before rendering, so the data is available to generate the complete HTML in one shot.

**Step 4: Render React to HTML.** [`pkg/renderer/index.ts`](renderer/index.ts)

The server nests the page component inside its layouts (layouts are the outer wrapper, page is the inner content), then runs React's server renderer over the whole tree. React walks every component, produces an HTML string, and the data from step 3 is already baked into the markup.

**Step 5: Assemble the full HTML document.** [`pkg/renderer/index.ts`](renderer/index.ts) [`pkg/server/index.ts`](server/index.ts)

The server builds a complete HTML page. It places the rendered HTML from step 4 inside a container div. It adds an inline script that embeds the fetched data as `window.__SMOOTH_DATA__` (so the client has it without fetching again) and information about which pages have loading states. It adds a script tag pointing to this page's client-side JavaScript bundle.

**Step 6: Send the HTML.** [`pkg/server/index.ts`](server/index.ts)

The browser receives a complete page with real content. The user sees the page immediately.

**Step 7: The client bundle loads and hydrates.** [`pkg/build/index.ts`](build/index.ts) [`pkg/hydrate/index.ts`](hydrate/index.ts)

The browser downloads the page's JavaScript bundle. This bundle contains the same React components the server used, plus the logic for client-side navigation. When it runs, it reads `window.__SMOOTH_DATA__` to get the props, builds the same React tree the server built, and compares it to the existing HTML. Since both the server and client used the same components and the same data, the trees match. React attaches event listeners. The page is now fully interactive.

### Why React props are the bridge between server and client

The whole approach depends on a simple fact about React: **props are just data**. They do not care where they come from.

On the server, the data-fetching function returns props. Those props are passed to the page component during rendering. The HTML that comes out has the data baked into it - the page title appears in a heading, the blog body appears in an article, and so on.

On the client, the same props are passed to the exact same page component. But how does the client get the props? They are embedded in the page as `window.__SMOOTH_DATA__` during step 5. The client bundle reads this value and passes it to the component. React builds a virtual DOM that produces the same output. It compares this virtual DOM to the real HTML already in the browser, finds they match, and hydrates.

Props are the contract. The server fetches the data once and hands it to the client through the page itself - the client reads `window.__SMOOTH_DATA__` rather than fetching again. The server-rendered HTML already displays the data visually, and the client bundle needs the same data to produce a matching virtual DOM. `window.__SMOOTH_DATA__` is how the server hands the data to the client.

This is the key insight that makes SSR and hydration work together: **the server generates HTML from data, the client generates a virtual DOM from the same data, and as long as both use the same components and the same props, the HTML matches and hydration succeeds.**

With this mental model in place, let us look at how each module implements its piece of the puzzle.

---

## Types

**File:** `pkg/types.ts`

This file defines the shapes of data that every other module shares. Think of it as the "contract" between modules - the build writes data in this shape, the server reads it in this shape, and the client expects it in this shape.

### Why types first?

Before we can talk about routing or rendering, we need a shared vocabulary. Every `RouteEntry` object describes one page in your app: what URL it matches, where its source file lives on disk, which layouts wrap it, and where its client JS bundle was written.

### `RouteEntry`

The single most important type. One `RouteEntry` exists for every `page.tsx` found in `app/`. It carries everything the framework needs at build time and serve time.

```ts
interface RouteEntry {
 pattern: string; // URL pattern, e.g. "/blog/:slug"
 pagePath: string; // relative path, e.g. "app/blog/[slug]/page.tsx"
 layouts: string[]; // outermost-first: ["app/layout.tsx", "app/blog/layout.tsx"]
 clientBundle: string; // ".smooth/client/blog/[slug].js"
 dynamic: boolean; // true if pattern contains :param segments
 params: string[]; // dynamic param names, e.g. ["slug"]
 loadingPath?: string; // "app/blog/[slug]/loading.tsx" if it exists
 loadingBundle?: string; // ".smooth/client/blog/[slug].loading.js"
}
```

`loadingPath` and `loadingBundle` are only set when a `loading.tsx` file exists alongside the route's `page.tsx`. The router detects them during `walkAppDir` and the build generates a separate client bundle for the skeleton UI.

**Example** - for `app/blog/[slug]/page.tsx` with a `loading.tsx` alongside it:
```json
{
 "pattern": "/blog/:slug",
 "pagePath": "app/blog/[slug]/page.tsx",
 "layouts": ["app/layout.tsx"],
 "clientBundle": ".smooth/client/blog/[slug].js",
 "dynamic": true,
 "params": ["slug"],
 "loadingPath": "app/blog/[slug]/loading.tsx",
 "loadingBundle": ".smooth/client/blog/[slug].loading.js"
}
```

### `Manifest`

An array of `RouteEntry`. This is the **manifest** - the complete list of every page in your app, serialized to `.smooth/manifest.json` at build time and loaded at serve time.

```ts
type Manifest = RouteEntry[];
```

Think of the manifest as a compiled directory listing. Instead of the server scanning `app/` on every request (slow), the build phase does it once and saves the result as a JSON file.

### `ClientManifestEntry`

A stripped-down version of `RouteEntry` sent to the browser. Only the fields the client-side router needs to show loading skeletons.

```ts
interface ClientManifestEntry {
 pattern: string; // "/blog/:slug"
 loadingBundle: string; // "/_smooth/blog/[slug].loading.js" (public URL)
}
```

The server builds this array from the full manifest (filtering routes with loading bundles) and injects it as `window.__SMOOTH_MANIFEST__` in every page's HTML. The client router reads it to decide whether to show a skeleton before fetching data.

### `SmoothContext`

Passed to `getServerSideProps`. Gives the page function everything it needs to fetch data for a specific request.

```ts
interface SmoothContext {
 params: Record<string, string>; // dynamic segments: { slug: "hello-world" }
 query: Record<string, string>; // URL query: { page: "2" }
 req: Request; // raw Bun Request object
}
```

### `HeadMeta`

The shape of the `metadata` export that any `page.tsx` or `layout.tsx` can export. Used to inject `<title>` and `<link>` tags into the document head.

```ts
interface HeadMeta {
 title?: string;
 links?: Array<{ rel: string; href: string; [key: string]: string }>;
}
```

Metadata is collected from all layout modules and the page module, then merged: the page's title wins (last `title` found), and all `links` arrays are concatenated. This lets a root `layout.tsx` inject global font preconnects while a page sets its own title.

### `PageModule`

What you get when you `import()` a `page.tsx` or `layout.tsx` file at runtime.

```ts
interface PageModule {
 default: ComponentType<Record<string, unknown>>;
 getServerSideProps?: (ctx: SmoothContext) => Promise<{ props: Record<string, unknown> }>;
 metadata?: HeadMeta;
}
```

---

## Router

**Files:** `pkg/router/index.ts`, `pkg/router/utils.ts`

### What the router does, simply

The router has two jobs:
1. **Discover** - scan the `app/` directory and find every `page.tsx`. Figure out what URL pattern each one matches, what layouts wrap it, whether it's a static route or a dynamic one (with `[param]` segments).
2. **Match** - when a request comes in (e.g. `/blog/hello-world`), find which route it matches and extract any dynamic params (e.g. `{ slug: "hello-world" }`).

This is the same thing frameworks like Next.js and SvelteKit do: the filesystem *is* the route config.

---

### Private helpers (`router/utils.ts`)

#### `collectPageFiles(dir)`

A recursive directory walker. Reads a directory, recurses into subdirectories, and collects the absolute paths of every `page.tsx` it finds. `loading.tsx`, `layout.tsx`, and other files are ignored here.

```
app/
 page.tsx ← collected
 about/
 page.tsx ← collected
 blog/
 layout.tsx ← ignored
 [slug]/
 page.tsx ← collected
 loading.tsx ← ignored (detected separately via fileExists)
```

#### `fileExists(filePath)`

A thin wrapper around `fs.stat()` that returns `true` if the path is a file, `false` otherwise. Used to check for the presence of `loading.tsx` files.

#### `derivePattern(pageAbsPath, appDir)`

Takes an absolute path to a `page.tsx` and produces the URL pattern.

| Input path | Output pattern |
|---|---|
| `app/page.tsx` | `/` |
| `app/about/page.tsx` | `/about` |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` |
| `app/users/[id]/posts/[postId]/page.tsx` | `/users/:id/posts/:postId` |

`[slug]` in the filesystem becomes `:slug` in the URL pattern. This is the convention: square brackets on disk, colon-prefixed in URLs.

#### `deriveClientBundle(pattern)`

Maps a URL pattern to the output path of the page's client JS bundle.

| Pattern | Client bundle path |
|---|---|
| `/` | `.smooth/client/index.js` |
| `/about` | `.smooth/client/about.js` |
| `/blog/:slug` | `.smooth/client/blog/[slug].js` |

#### `deriveLoadingBundle(pattern)`

Same logic as `deriveClientBundle` but for loading skeleton bundles. Appends `.loading` before the `.js` extension.

| Pattern | Loading bundle path |
|---|---|
| `/` | `.smooth/client/index.loading.js` |
| `/blog/:slug` | `.smooth/client/blog/[slug].loading.js` |

#### `extractParams(segments)`

Returns the dynamic param names from a route's directory segments.

```
["blog", "[slug]"] → ["slug"]
["users", "[id]", "posts", "[postId]"] → ["id", "postId"]
```

#### `collectLayouts(pageAbsPath, appDir, projectRoot)`

For a given page, walks up the directory tree collecting `layout.tsx` files until it reaches `appDir`. Returns them outermost-first.

Given `app/blog/[slug]/page.tsx`:
1. Start at `app/blog/[slug]/` - no `layout.tsx`
2. Walk up to `app/blog/` - found `app/blog/layout.tsx`
3. Walk up to `app/` - found `app/layout.tsx`
4. `app/` equals `appDir`, stop
5. Collected innermost-first: `["app/blog/layout.tsx", "app/layout.tsx"]`
6. Reversed to outermost-first: `["app/layout.tsx", "app/blog/layout.tsx"]`

#### `patternToRegExp(pattern)`

Converts a `:param`-syntax pattern into a `RegExp` with named capture groups.

```
"/blog/:slug"
 → /^\/blog\/(?<slug>[^\/]+)$/
```

Each param becomes `(?<name>[^/]+)` so `match.groups.slug` works directly after a match.

---

### `walkAppDir(appDir, projectRoot?)` - **exported**

The main discovery function. For each `page.tsx` found, builds a complete `RouteEntry`:

```ts
const loadingAbsPath = join(dirname(pageAbsPath), "loading.tsx");
const hasLoading = await fileExists(loadingAbsPath);
const loadingPath = hasLoading ? relative(root, loadingAbsPath) : undefined;
const loadingBundle = hasLoading ? deriveLoadingBundle(pattern) : undefined;
```

If a `loading.tsx` exists next to the `page.tsx`, its relative path and bundle output path are recorded. Otherwise both fields are `undefined` and no loading bundle is generated.

Returns the full array sorted by `pattern` for deterministic output.

---

### `matchRoute(routes, url)` - **exported**

Given the manifest and a raw URL string, finds the matching route and extracts any dynamic params.

**Algorithm:**
1. Strip query string and hash: `/blog/hello?page=2` → `/blog/hello`
2. Normalize trailing slash (except root `/`)
3. Try static routes first (exact equality)
4. If no match, try dynamic routes (regex)
5. Return `{ route, params }` or `null`

Static routes are tried first so `/blog` always hits the static route, never a dynamic one that might also match.

---

## Build

**Files:** `pkg/build/index.ts`, `pkg/build/utils.ts`

### What the build does, simply

The build phase takes your React source files (page components, layouts, loading skeletons) and turns them into:
1. **Client JS bundles** - one per page, containing the page component, its layouts, and the client-side navigation code
2. **CSS** - compiled from Tailwind
3. **A manifest** - a JSON index of every page

This happens before the server starts. The server never imports from the build module - it reads the build output (manifest + bundles) at runtime.

### Multi-page architecture vs. Single-page app

In a traditional SPA, there's one giant JavaScript bundle. Every page's code is in it, even if the user never visits most pages. SmoothJS generates one bundle per page. The browser only downloads the bundle for the page the user is currently on. When they click a link to another page, the client router fetches that page's bundle on demand.

---

### `generateEntrypoint(route, projectRoot)` - private

Creates the TypeScript source for a page's client bundle. This is the entire client-side framework in one generated file - SSR hydration, client-side routing, skeleton loading, and caching.

**What it generates** (for `/blog/:slug` with one layout):

```ts
import React from "react";
import { hydrateRoot } from "react-dom/client";
import Page from "/abs/path/to/app/blog/[slug]/page.tsx";
import Layout0 from "/abs/path/to/app/layout.tsx";

const _w = window as any;
const _bundleUrl = "/_smooth/blog/[slug].js";

// Reusable tree builder - called on initial load and on every client-side navigate back to this route
function _buildTree(props: Record<string, unknown>) {
 return (<Layout0><Page {...props} /></Layout0>);
}

// Register this page in the global page registry
_w.__SMOOTH_PAGES__ = _w.__SMOOTH_PAGES__ ?? {};
_w.__SMOOTH_PAGES__[_bundleUrl] = _buildTree;

// Only the FIRST bundle to load sets up the React root and event listeners
if (!_w.__SMOOTH_ROOT__) {
 const _container = document.getElementById("_smooth")!;
 const _initProps = (_w.__SMOOTH_DATA__?.props ?? {}) as Record<string, unknown>;
 const _root = hydrateRoot(_container, _buildTree(_initProps));
 _w.__SMOOTH_ROOT__ = { render: (el) => _root.render(el) };

 // In-memory cache: href → { props, clientBundle, title }
 type NavData = { props: Record<string, unknown>; clientBundle: string; title?: string };
 const _cache = new Map<string, NavData>();

 function _matchPattern(pattern: string, path: string): boolean {
 const re = new RegExp("^" + pattern.replace(/:([^/]+)/g, "[^/]+") + "$");
 return re.test(path);
 }

 async function _navigate(href: string, push: boolean): Promise<void> {
 try {
 const targetPath = href.split(/[?#]/)[0];

 // Cache hit → render immediately, no network request, no skeleton
 const cached = _cache.get(href);
 if (cached) {
 if (!_w.__SMOOTH_PAGES__[cached.clientBundle]) await import(cached.clientBundle);
 _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[cached.clientBundle](cached.props));
 if (push) history.pushState(null, "", href);
 if (cached.title) document.title = cached.title;
 window.scrollTo(0, 0);
 return;
 }

 // Cache miss → check for skeleton, fetch data
 const manifest = (_w.__SMOOTH_MANIFEST__ ?? []) as Array<{ pattern: string; loadingBundle: string }>;
 const entry = manifest.find((e) => _matchPattern(e.pattern, targetPath));

 // Start data fetch immediately
 const dataPromise = fetch("/_smooth/data?path=" + encodeURIComponent(href))
 .then((r) => r.ok ? r.json() : Promise.reject(r.status)) as Promise<NavData>;

 // While data is in-flight, show skeleton if one exists
 if (entry?.loadingBundle) {
 if (!_w.__SMOOTH_PAGES__[entry.loadingBundle]) await import(entry.loadingBundle);
 _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[entry.loadingBundle]({}));
 }

 // Data arrived → cache it and render the real page
 const data = await dataPromise;
 _cache.set(href, data);
 const { props, clientBundle, title } = data;
 if (!_w.__SMOOTH_PAGES__[clientBundle]) await import(clientBundle);
 _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[clientBundle](props));
 if (push) history.pushState(null, "", href);
 if (title) document.title = title;
 window.scrollTo(0, 0);
 } catch {
 location.href = href; // fallback to full reload on any error
 }
 }

 // Intercept all same-origin <a> clicks
 document.addEventListener("click", (e: MouseEvent) => {
 const a = (e.target as Element).closest("a");
 if (!a) return;
 const href = a.getAttribute("href");
 if (!href || href.startsWith("http") || href.startsWith("//") ||
 href.startsWith("#") || href.startsWith("mailto:") || (a as HTMLAnchorElement).target) return;
 e.preventDefault();
 _navigate(href, true);
 });

 // Handle browser back/forward buttons
 window.addEventListener("popstate", () => {
 _navigate(location.pathname + location.search, false);
 });
}
```

**Key design decisions:**

**`window.__SMOOTH_PAGES__`** - A global registry mapping bundle URLs to `_buildTree` functions. Every page bundle (page and loading) registers itself here. The router checks this registry before calling `import()` - if the bundle is already loaded, no fetch is needed.

**`window.__SMOOTH_ROOT__`** - Holds the single `hydrateRoot` React root. The `if (!_w.__SMOOTH_ROOT__)` guard means `hydrateRoot` is called exactly once - on the first page load. When the router dynamically imports a new page's bundle during navigation, that bundle runs, registers itself in `__SMOOTH_PAGES__`, and exits - it never calls `hydrateRoot` again. One root, one reconciler, clean React state.

**`_cache`** - A `Map<href, NavData>` scoped to the `if (!_w.__SMOOTH_ROOT__)` closure, so it lives for the entire tab session. Cache hit: skip network + skeleton, render immediately. Cache miss: show skeleton, fetch, store. Back button revisits are instant because the previous URL is already in the cache.

**`_matchPattern`** - A minimal pattern matcher that converts `:param` syntax to a regex, used to look up loading bundles from `__SMOOTH_MANIFEST__` before the `/_smooth/data` fetch returns.

---

### `generateLoadingEntrypoint(route, projectRoot)` - private

Generates the client bundle for a `loading.tsx` skeleton component. Structurally similar to `generateEntrypoint` but much simpler - no `hydrateRoot`, no router setup, no cache. It just registers the loading component in `__SMOOTH_PAGES__`.

```ts
import React from "react";
import Loading from "/abs/path/to/app/blog/[slug]/loading.tsx";
import Layout0 from "/abs/path/to/app/layout.tsx";

const _w = window as any;
const _bundleUrl = "/_smooth/blog/[slug].loading.js";

function _buildTree(_props: Record<string, unknown>) {
 return (<Layout0><Loading /></Layout0>);
}

_w.__SMOOTH_PAGES__ = _w.__SMOOTH_PAGES__ ?? {};
_w.__SMOOTH_PAGES__[_bundleUrl] = _buildTree;
```

The loading component is wrapped in the same layouts as the page - so the nav bar stays visible and only the content area shows the skeleton while data loads.

---

### `entryTempPath(clientBundle, projectRoot)` - private

`generateEntrypoint` and `generateLoadingEntrypoint` produce TypeScript source code as strings. But `Bun.build()` takes file paths as input, not strings. So we write each generated source string to a temporary `.tsx` file on disk, then pass that file path to `Bun.build()`.

This function maps a bundle output path to where the temporary entry file is written:

```
".smooth/client/blog/[slug].js" → ".smooth/entries/blog/[slug].tsx"
".smooth/client/blog/[slug].loading.js" → ".smooth/entries/blog/[slug].loading.tsx"
```

The entries directory (`.smooth/entries/`) is purely a build artifact. It is never served to clients and gets cleaned on rebuild.

---

### `buildClientBundles(routes, outDir)` - **exported**

Uses an inner `buildBundle(source, clientBundle, label)` helper to compile any generated source string into a browser bundle via `Bun.build()`. For each route it calls this helper twice if a loading file exists:

```ts
routes.flatMap((route) => {
 const jobs = [buildBundle(generateEntrypoint(route), route.clientBundle, route.pattern)];
 if (route.loadingPath && route.loadingBundle) {
 jobs.push(buildBundle(generateLoadingEntrypoint(route), route.loadingBundle, `${route.pattern} (loading)`));
 }
 return jobs;
})
// All jobs run in parallel via Promise.all
```

**`Bun.build()` config:**
- `target: "browser"` - no Node/Bun APIs in output
- `minify: true` - always on (inline sourcemaps in dev make it readable)
- `sourcemap: "inline"` in dev, `"none"` in production

---

### `buildCSS(appDir, outDir)` - **exported**

Processes `app/globals.css` through the Tailwind v4 Bun plugin and outputs `.smooth/client/styles.css`.

- Returns silently if `app/globals.css` doesn't exist
- Tailwind v4 automatically scans JSX for class names - no config file needed
- `naming: "styles.css"` overrides Bun's default filename

---

### `writeManifest(routes, outDir)` - **exported**

Serializes the `routes` array to `.smooth/manifest.json`. This is the contract between the build phase and serve phase. Written last so a failed build never corrupts the manifest.

---

### `build(appDir, outDir)` - **exported**

Top-level orchestrator:

```
walkAppDir() ← discover routes + detect loading.tsx files
 ↓
buildClientBundles() ← compile page bundles + loading bundles
 ↓
buildCSS() ← Tailwind → styles.css
 ↓
writeManifest() ← .smooth/manifest.json (written last for atomicity)
```

---

## Renderer

**File:** `pkg/renderer/index.ts`

### What the renderer does, simply

The renderer takes a matched route and some data props and runs React on the server to produce HTML. It does two things:
1. **`renderPage`** - imports the page component and its layouts, nest them together, and calls React's `renderToString` to produce an HTML string
2. **`assembleHTML`** - wraps that HTML string in a full `<html>` document with `<head>`, styles, scripts, and embedded data

This is the "SSR" part of SmoothJS. React runs on the server so the browser gets ready-made HTML.

---

### `renderPage(route, props)` - **exported**

Dynamically imports the page and all its layouts, builds a nested React element tree, and calls `renderToString()`.

```
1. import(abs/page.tsx) → { default: Page, getServerSideProps, metadata }
2. import(abs/layout.tsx) → { default: Layout0, metadata } (parallel)
3. Build tree:
 tree = createElement(Page, props)
 tree = createElement(Layout0, null, tree) // outermost last
4. renderToString(tree) → "<nav>…</nav><main>…</main>"
```

Uses `React.createElement` instead of JSX because this file runs directly in Bun without bundling - JSX needs a bundler transform.

---

### `assembleHTML(renderedHTML, props, clientBundleURL, meta?, dev?, clientManifest?)` - **exported**

Wraps server-rendered HTML in a complete document.

**Parameters:**
- `renderedHTML` - the `renderToString()` output
- `props` - serialized into `window.__SMOOTH_DATA__` for client hydration
- `clientBundleURL` - `<script src="...">` for this page's client bundle
- `meta` - merged `HeadMeta` from all layout + page `metadata` exports
- `dev` - if `true`, injects the HMR SSE script
- `clientManifest` - array of `{ pattern, loadingBundle }` entries, injected as `window.__SMOOTH_MANIFEST__`

**Output structure:**

```html
<!doctype html>
<html lang="en">
 <head>
 <meta charset="UTF-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1.0" />
 <title>My Page</title>
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora" />
 <link rel="stylesheet" href="/_smooth/styles.css" />
 <!-- dev only: -->
 <script>new EventSource('/_smooth/hmr').onmessage=function(){location.reload()};</script>
 </head>
 <body>
 <div id="_smooth"><!-- server-rendered HTML --></div>
 <script>window.__SMOOTH_DATA__ = {"props":{...}};</script>
 <script>window.__SMOOTH_MANIFEST__ = [{"pattern":"/blog/:slug","loadingBundle":"/_smooth/blog/[slug].loading.js"}];</script>
 <script src="/_smooth/blog/[slug].js" type="module" defer></script>
 </body>
</html>
```

**`window.__SMOOTH_DATA__`** - The bridge between server and client. The server ran `getServerSideProps` and fetched data; this inline script embeds it in the page so the client bundle reads it without a second request.

**`window.__SMOOTH_MANIFEST__`** - Tells the client router which routes have loading bundles. Only routes with a `loadingBundle` are included. The client reads this on every navigation to decide whether to show a skeleton before the data arrives.

**XSS safety:** Both data blobs replace `</script>` with `<\/script>` to prevent injection via prop values.

**`metadata` merging:** All layout modules and the page module are collected; the last `title` wins (page overrides layout), all `links` arrays are concatenated. This lets `app/layout.tsx` inject font preconnects globally while pages set their own titles.

**HMR script:** In dev mode, an inline `<script>` opens an SSE connection to `/_smooth/hmr`. When the dev server broadcasts a reload event after a rebuild, the browser calls `location.reload()`.

---

## Hydrate

**File:** `pkg/hydrate/index.ts`

### What hydration is, simply

When the server renders a page, the HTML includes the full UI. But that HTML is static - clicking buttons doesn't do anything, links navigate via full page reloads. **Hydration** is the process where React wakes up that static HTML:

1. React looks at the existing DOM (the `<div id="_smooth">` with server-rendered content inside)
2. React builds its virtual DOM from the same component tree the server used
3. React "attaches" to the real DOM - adds event listeners, runs `useEffect`, sets up state

The user sees the page immediately (from HTML) and React takes over without a visible re-render. This file generates the JavaScript that does exactly that - it's the entry point the browser executes.

```ts
// pkg/hydrate/index.ts
```

---

## Server

**File:** `pkg/server/index.ts`, `pkg/server/run.ts`, `pkg/server/utils.ts`

### What the server does, simply

The server is the runtime. It reads the manifest (produced by the build phase), starts an HTTP server, and handles every incoming request:

1. **API requests** (`/_smooth/data`) - return JSON with page data for client-side navigation
2. **Static assets** (`/_smooth/*`) - serve compiled JS bundles and CSS
3. **Page requests** (everything else) - match the URL to a route, fetch data server-side, render React to HTML, send the full page

---

### `clientBundleToURL(clientBundle)` - private (`utils.ts`)

Converts a build-output path to its public URL.

```
".smooth/client/blog/[slug].js" → "/_smooth/blog/[slug].js"
".smooth/client/blog/[slug].loading.js" → "/_smooth/blog/[slug].loading.js"
```

The build writes to `.smooth/client/...` on disk. The server serves files from that directory at the `/_smooth/...` URL path.

---

### `createServer(manifest, options?)` - **exported**

Creates a `Bun.serve()` instance. Options: `{ port?, dev? }`.

The `fetch` handler runs for every request. Routing priority:

#### Priority 1: `/_smooth/data` - client-side navigation data API

The client-side router calls this endpoint instead of fetching full HTML pages.

```
GET /_smooth/data?path=/blog/hello-world

Response: {
 "props": { "title": "Hello World", "body": "..." },
 "clientBundle": "/_smooth/blog/[slug].js",
 "title": "Hello World"
}
```

**How it works:**
1. Parse `path` from query string - handle query params within it: `?path=/search?q=foo` → `cleanPath = /search`, `query = { q: "foo" }`
2. `matchRoute(manifest, cleanPath)` - same matching as the HTML path
3. Build `SmoothContext` and call `getServerSideProps` if exported
4. Collect `metadata` from layout modules + page module, extract `title`
5. Return JSON - no HTML rendering, no `assembleHTML`, just props

This is intentionally lightweight - no React, no `renderToString`, just data. The client already has the component bundle and the layout; it just needs the props.

#### Priority 2: `/_smooth/*` - framework assets

```
GET /_smooth/styles.css → .smooth/client/styles.css
GET /_smooth/blog/[slug].js → .smooth/client/blog/[slug].js
GET /_smooth/blog/[slug].loading.js → .smooth/client/blog/[slug].loading.js
```

Served as raw files via `Bun.file()`. This handler comes after the `/_smooth/data` check so the data endpoint is never mistaken for a static file.

#### Priority 3: `public/*` - static files

Checks `Bun.file(path).exists()` before serving. Falls through to route matching if not found.

#### Priority 4: Route matching → full SSR pipeline

```
matchRoute(manifest, pathname)
 ↓
getServerSideProps(ctx) ← fetch data server-side
 ↓
collect metadata from layouts + page
 ↓
build clientManifest (routes with loading bundles → public URLs)
 ↓
renderPage(route, props) ← React → HTML string
 ↓
assembleHTML(html, props, bundleURL, meta, dev, clientManifest)
 ↓
Response("Content-Type: text/html")
```

#### Error handling

In **dev mode**: returns a 500 page with the full error message and stack trace.
In **production**: generic "500 Internal Server Error" with no details.

---

### `run.ts` - child process entry point

In dev mode, the dev server spawns a child process running this file rather than calling `createServer` directly. The child process handles all app requests; the parent proxy handles SSE.

```ts
const [,, manifestPath, portStr, flag] = process.argv;
const manifest = JSON.parse(await Bun.file(manifestPath).text());
createServer(manifest, { port: parseInt(portStr), dev: flag === "--dev" });
```

This exists to solve a fundamental Bun module cache problem: Bun caches dynamically imported ESM modules by file path with no public invalidation API. When `getServerSideProps` in a page file changes, the next request would still use the cached module - the user would see stale server data. By spawning the server as a child process, killing it on rebuild, and respawning fresh, each rebuild gets a completely clean module cache with zero stale state.

---

## Watcher

**File:** `pkg/watcher/index.ts`

### What the watcher does, simply

The watcher powers dev mode. It watches your `app/` directory for file changes. When you save a file, it:
1. Waits a moment (debounce, so it doesn't rebuild 3 times when your editor saves)
2. Rebuilds all client bundles and the manifest
3. Kills the old server process and starts a fresh one
4. Tells the browser to reload

This is the "hot reload" loop, even if it's a full-page reload rather than HMR.

---

### `watch(appDir, onChange)` - **exported**

Uses `fs.watch()` with `recursive: true`. On change:

1. Debounce - wait 100ms for the editor to finish writing (editors often write in multiple steps: truncate, write, sync)
2. Re-entrant guard - if a rebuild is already in progress, record the latest changed file and do one follow-up rebuild after the current one completes. This prevents overlapping builds if files change rapidly
3. Log the changed file as a route pattern (e.g. `app/blog/[slug]/page.tsx` → `/blog/:slug`)
4. Call `onChange()` which triggers a full `build()` cycle

```
save file
 → debounce 100ms
 → building = true
 → await onChange() ← full rebuild
 → building = false
 → if pendingFile → trigger one more rebuild
```

**Error resilience:** If `onChange()` throws, the watcher logs and keeps watching. The old `manifest.json` is safe because `writeManifest` runs last in `build()`.

---

## How It All Fits Together

### Build phase (`smooth build`)

```
bin/smooth.ts
 └── build("app", ".smooth")
 ├── walkAppDir("app")
 │ ├── collectPageFiles() ← finds all page.tsx
 │ ├── fileExists("loading.tsx") ← per page directory
 │ ├── derivePattern() ← "app/blog/[slug]/page.tsx" → "/blog/:slug"
 │ ├── collectLayouts() ← ["app/layout.tsx"]
 │ ├── deriveClientBundle() ← ".smooth/client/blog/[slug].js"
 │ └── deriveLoadingBundle() ← ".smooth/client/blog/[slug].loading.js"
 │
 ├── buildClientBundles(routes)
 │ ├── generateEntrypoint() ← page bundle with router + cache
 │ ├── generateLoadingEntrypoint() ← skeleton bundle (if loading.tsx exists)
 │ └── Bun.build() × N ← all bundles in parallel
 │
 ├── buildCSS("app", ".smooth")
 │ └── Bun.build() + tailwindPlugin → styles.css
 │
 └── writeManifest(routes) → .smooth/manifest.json
```

### Serve phase (`smooth start`)

```
bin/smooth.ts → createServer(manifest)

GET /blog/hello-world
 │
 ├── matchRoute(manifest, "/blog/hello-world")
 │ → { route, params: { slug: "hello-world" } }
 │
 ├── import("app/blog/[slug]/page.tsx")
 │ → { default: BlogPost, getServerSideProps, metadata }
 │
 ├── getServerSideProps({ params, query, req })
 │ → { props: { title: "Hello World", body: "..." } }
 │
 ├── collect metadata → merge title + links from layouts + page
 │
 ├── build clientManifest → [{ pattern: "/blog/:slug", loadingBundle: "/_smooth/blog/[slug].loading.js" }]
 │
 ├── renderPage(route, props) → "<article>...</article>"
 │
 └── assembleHTML(html, props, bundleURL, meta, dev, clientManifest)
 → full HTML with __SMOOTH_DATA__ + __SMOOTH_MANIFEST__ + <script> tags
 → Response("Content-Type: text/html")
```

### Dev mode (`smooth dev`)

```
bin/smooth.ts
 ├── build("app", ".smooth") ← initial build
 │
 ├── spawn child: bun pkg/server/run.ts .smooth/manifest.json 3001 --dev
 │ └── createServer(manifest, { port: 3001, dev: true })
 │
 ├── Bun.serve({ port: 3000 }) ← parent proxy
 │ ├── GET /_smooth/hmr → SSE stream (kept alive, subscribed by browser)
 │ └── all other requests → proxy to child on :3001
 │
 └── watch("app", async () => {
 await build(...) ← rebuild
 child.kill()
 child = spawnChild() ← fresh process = fresh module cache
 await sleep(150ms) ← let child start accepting connections
 broadcast SSE "data: reload" ← browser calls location.reload()
 })
```

The parent proxy lives forever and owns the SSE connections. The child is disposable - killed and respawned on every rebuild. This is the only reliable way to bust Bun's ESM module cache for dynamically imported user files.

### Browser - initial load

```
HTML arrives → browser renders server HTML immediately (user sees the page)
 ↓
window.__SMOOTH_DATA__ = { props: { title: "Hello World", ... } }
window.__SMOOTH_MANIFEST__ = [{ pattern: "/blog/:slug", loadingBundle: "/_smooth/blog/[slug].loading.js" }]
 ↓
/_smooth/blog/[slug].js downloads and runs:
 _w.__SMOOTH_PAGES__["/_smooth/blog/[slug].js"] = _buildTree
 if (!_w.__SMOOTH_ROOT__):
 hydrateRoot(#_smooth, _buildTree(initProps)) ← React attaches to existing DOM
 _w.__SMOOTH_ROOT__ = { render: ... }
 set up click + popstate listeners
 _cache = new Map()
 ↓
Page is now interactive
```

### Browser - client-side navigation (cache miss)

```
User clicks <a href="/blog/other-post">
 ↓
click listener fires → _navigate("/blog/other-post", true)
 ↓
_cache.get("/blog/other-post") → undefined (miss)
 ↓
_matchPattern("/blog/:slug", "/blog/other-post") → match → loadingBundle found
 ↓
fetch("/_smooth/data?path=/blog/other-post") ← started immediately
 ↓
import("/_smooth/blog/[slug].loading.js") ← loading bundle not yet in __SMOOTH_PAGES__
 → registers _buildTree (Loading skeleton) in __SMOOTH_PAGES__
 ↓
root.render(__SMOOTH_PAGES__["/_smooth/blog/[slug].loading.js"]({}))
 → skeleton appears instantly while data is in-flight
 ↓
data arrives: { props, clientBundle: "/_smooth/blog/[slug].js", title }
_cache.set("/blog/other-post", data)
 ↓
__SMOOTH_PAGES__["/_smooth/blog/[slug].js"] already registered (same bundle)
 ↓
root.render(__SMOOTH_PAGES__["/_smooth/blog/[slug].js"](props))
 → real page renders, React reconciles only what changed
history.pushState(null, "", "/blog/other-post")
document.title = title
window.scrollTo(0, 0)
```

### Browser - client-side navigation (cache hit)

```
User clicks the same link again (or presses back)
 ↓
_cache.get("/blog/other-post") → { props, clientBundle, title }
 ↓
root.render(__SMOOTH_PAGES__[clientBundle](props)) ← no network request, no skeleton
history.pushState / (popstate: no pushState)
document.title = title
window.scrollTo(0, 0)
```
