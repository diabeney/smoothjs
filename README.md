# SmoothJS

A minimal SSR React framework built on Bun. Implements the pre-RSC Next.js model: file-based routing, server-side rendering with `getServerSideProps`, per-page client bundles, hydration, and client-side navigation with loading skeletons.

This is a teaching codebase. It is not a production framework. The goal is to show how the pieces fit together - the router, the build pipeline, the server renderer, hydration, and the dev mode loop.

## Why this exists

SmoothJS is a minimal implementation of how React frameworks worked before React Server Components (RSCs). It exists to teach the core concepts: SSR, hydration, file-based routing, per-page bundling, and the server-client data handoff.

For a deep dive into every module, how the build pipeline works, how the router matches URLs, how the server handles requests, and how the client-side router navigates between pages, read **[pkg/README.md](pkg/README.md)**.

## Quick start

```bash
# Install dependencies
bun install

# Run the dev server (builds + watches for changes + auto-reload)
bun run dev

# Production build
bun run build

# Start production server
bun run start
```

Open `http://localhost:3000`.

## The sample app

The `app/` directory contains a sample application built to test this framework. It includes pages (home, blog, about), dynamic routes (`blog/[slug]`), nested layouts, `getServerSideProps` data fetching, client-side state (a counter), loading skeletons, and Tailwind CSS. You can modify it like a normal pre-RSC Next.js app - add pages, change layouts, wire up a database, or replace it entirely.

## File structure

```
app/
  layout.tsx          # Root layout (wraps every page)
  page.tsx            # Home page  (/)
  blog/
    page.tsx          # Blog index (/blog)
    layout.tsx        # Blog layout (wraps only blog pages)
    [slug]/
      page.tsx        # Blog post  (/blog/:slug)
      loading.tsx     # Loading skeleton for client-side navigation
  about/
    page.tsx          # About page (/about)
  globals.css         # Tailwind CSS
pkg/                  # Framework internals
bin/smooth.ts         # CLI entry point
```

## Features

- **File-based routing.** `app/blog/[slug]/page.tsx` becomes `/blog/:slug`. Static and dynamic routes with nested layouts.
- **Server-side rendering.** React renders to HTML on the server. The browser gets a complete page with real content. No blank white screen.
- **Per-page client bundles.** Each page gets its own JavaScript bundle containing only that page's components and layouts. No monolithic app.js.
- **Client-side hydration.** React takes over the server-rendered HTML in the browser. The page is visible immediately and becomes interactive after hydration.
- **Client-side navigation.** Clicking an internal link fetches only JSON data for the new page and swaps the content without a full page reload.
- **Loading skeletons.** Place a `loading.tsx` next to any `page.tsx`. It shows while the new page's data loads during client-side navigation.
- **Dev mode with auto-rebuild.** Save a file, the server rebuilds and the browser reloads automatically.

## Requirements

- [Bun](https://bun.sh) 1.3+
- React 19
