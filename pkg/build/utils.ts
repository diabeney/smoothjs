import { resolve } from "path";
import type { RouteEntry } from "../types.js";

export function generateEntrypoint(route: RouteEntry, projectRoot: string): string {
  const absPagePath = resolve(projectRoot, route.pagePath);
  const bundleUrl = `/_smooth/${route.clientBundle.replace(/^\.smooth\/client\//, "")}`;

  const layoutImports = route.layouts
    .map((p, i) => `import Layout${i} from ${JSON.stringify(resolve(projectRoot, p))};`)
    .join("\n");

  const openTags = route.layouts.map((_, i) => `<Layout${i}>`).join("");
  const closeTags = route.layouts.map((_, i) => `</Layout${i}>`).reverse().join("");

  const jsxTree =
    route.layouts.length > 0
      ? `${openTags}<Page {...props} />${closeTags}`
      : `<Page {...props} />`;

  return `import React from "react";
import { hydrateRoot } from "react-dom/client";
import Page from ${JSON.stringify(absPagePath)};
${layoutImports}

const _w = window as any;
const _bundleUrl = ${JSON.stringify(bundleUrl)};

function _buildTree(props: Record<string, unknown>) {
  return (${jsxTree});
}

_w.__SMOOTH_PAGES__ = _w.__SMOOTH_PAGES__ ?? {};
_w.__SMOOTH_PAGES__[_bundleUrl] = _buildTree;

if (!_w.__SMOOTH_ROOT__) {
  const _container = document.getElementById("_smooth")!;
  const _initProps = (_w.__SMOOTH_DATA__?.props ?? {}) as Record<string, unknown>;
  const _root = hydrateRoot(_container, _buildTree(_initProps));
  _w.__SMOOTH_ROOT__ = { render: (el: unknown) => _root.render(el as any) };

  type NavData = { props: Record<string, unknown>; clientBundle: string; title?: string };
  const _cache = new Map<string, NavData>();

  function _matchPattern(pattern: string, path: string): boolean {
    const re = new RegExp("^" + pattern.replace(/:([^/]+)/g, "[^/]+") + "$");
    return re.test(path);
  }

  async function _navigate(href: string, push: boolean): Promise<void> {
    try {
      const targetPath = href.split(/[?#]/)[0];

      const cached = _cache.get(href);
      if (cached) {
        if (!_w.__SMOOTH_PAGES__[cached.clientBundle]) {
          await import(cached.clientBundle);
        }
        _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[cached.clientBundle](cached.props));
        if (push) history.pushState(null, "", href);
        if (cached.title) document.title = cached.title;
        window.scrollTo(0, 0);
        return;
      }

      const manifest = (_w.__SMOOTH_MANIFEST__ ?? []) as Array<{ pattern: string; loadingBundle: string }>;
      const entry = manifest.find((e) => _matchPattern(e.pattern, targetPath));

      const dataPromise = fetch("/_smooth/data?path=" + encodeURIComponent(href)).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status)
      ) as Promise<NavData>;

      if (entry?.loadingBundle) {
        if (!_w.__SMOOTH_PAGES__[entry.loadingBundle]) {
          await import(entry.loadingBundle);
        }
        _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[entry.loadingBundle]({}));
      }

      const data = await dataPromise;
      _cache.set(href, data);
      const { props, clientBundle, title } = data;
      if (!_w.__SMOOTH_PAGES__[clientBundle]) {
        await import(clientBundle);
      }
      _w.__SMOOTH_ROOT__.render(_w.__SMOOTH_PAGES__[clientBundle](props));
      if (push) history.pushState(null, "", href);
      if (title) document.title = title;
      window.scrollTo(0, 0);
    } catch {
      location.href = href;
    }
  }

  document.addEventListener("click", (e: MouseEvent) => {
    const a = (e.target as Element).closest("a");
    if (!a) return;
    const href = a.getAttribute("href");
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("//") ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      (a as HTMLAnchorElement).target
    ) return;
    e.preventDefault();
    _navigate(href, true);
  });

  window.addEventListener("popstate", () => {
    _navigate(location.pathname + location.search, false);
  });
}
`;
}

export function generateLoadingEntrypoint(route: RouteEntry, projectRoot: string): string {
  const absLoadingPath = resolve(projectRoot, route.loadingPath!);
  const bundleUrl = `/_smooth/${route.loadingBundle!.replace(/^\.smooth\/client\//, "")}`;

  const layoutImports = route.layouts
    .map((p, i) => `import Layout${i} from ${JSON.stringify(resolve(projectRoot, p))};`)
    .join("\n");

  const openTags = route.layouts.map((_, i) => `<Layout${i}>`).join("");
  const closeTags = route.layouts.map((_, i) => `</Layout${i}>`).reverse().join("");

  const jsxTree =
    route.layouts.length > 0
      ? `${openTags}<Loading />${closeTags}`
      : `<Loading />`;

  return `import React from "react";
import Loading from ${JSON.stringify(absLoadingPath)};
${layoutImports}

const _w = window as any;
const _bundleUrl = ${JSON.stringify(bundleUrl)};

function _buildTree(_props: Record<string, unknown>) {
  return (${jsxTree});
}

_w.__SMOOTH_PAGES__ = _w.__SMOOTH_PAGES__ ?? {};
_w.__SMOOTH_PAGES__[_bundleUrl] = _buildTree;
`;
}

export function entryTempPath(clientBundle: string, projectRoot: string): string {
  const relToClient = clientBundle.replace(/^\.smooth\/client\//, "");
  const withoutExt = relToClient.replace(/\.js$/, "");
  return resolve(projectRoot, `.smooth/entries/${withoutExt}.tsx`);
}
