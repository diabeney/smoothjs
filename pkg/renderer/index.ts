import React from "react";
import { renderToString } from "react-dom/server";
import { resolve } from "path";
import type { RouteEntry, HeadMeta, ClientManifestEntry } from "../types.js";

export async function renderPage(
  route: RouteEntry,
  props: Record<string, unknown>
): Promise<string> {
  const pageModule = await import(resolve(process.cwd(), route.pagePath));
  const Page = pageModule.default as React.ComponentType<Record<string, unknown>>;

  const layoutModules = await Promise.all(
    route.layouts.map((p) => import(resolve(process.cwd(), p)))
  );
  const Layouts = layoutModules.map(
    (mod) => mod.default as React.ComponentType<React.PropsWithChildren<Record<string, unknown>>>
  );

  let tree: React.ReactElement = React.createElement(Page, props);
  for (let i = Layouts.length - 1; i >= 0; i--) {
    tree = React.createElement(Layouts[i], null, tree);
  }

  return renderToString(tree);
}

export function assembleHTML(
  renderedHTML: string,
  props: Record<string, unknown>,
  clientBundleURL: string,
  meta?: HeadMeta,
  dev?: boolean,
  clientManifest?: ClientManifestEntry[]
): string {
  const safeProps = JSON.stringify({ props }).replace(/<\/script>/gi, "<\\/script>");

  const title = meta?.title ? `\n    <title>${meta.title}</title>` : "";
  const links = meta?.links
    ?.map((l) => {
      const attrs = Object.entries(l)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return `\n    <link ${attrs} />`;
    })
    .join("") ?? "";

  const hmrScript = dev
    ? `\n    <script>new EventSource('/_smooth/hmr').onmessage=function(){location.reload()};</script>`
    : "";

  const manifestScript = clientManifest && clientManifest.length > 0
    ? `\n    <script>window.__SMOOTH_MANIFEST__ = ${JSON.stringify(clientManifest).replace(/<\/script>/gi, "<\\/script>")};</script>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />${title}${links}
    <link rel="stylesheet" href="/_smooth/styles.css" />${hmrScript}
  </head>
  <body>
    <div id="_smooth">${renderedHTML}</div>
    <script>window.__SMOOTH_DATA__ = ${safeProps};</script>${manifestScript}
    <script src="${clientBundleURL}" type="module" defer></script>
  </body>
</html>`;
}
