import path from "path";
import { matchRoute } from "../router/index.js";
import { renderPage, assembleHTML } from "../renderer/index.js";
import { clientBundleToURL } from "./utils.js";
import type { Manifest, SmoothContext, PageModule, HeadMeta, ClientManifestEntry } from "../types.js";

export function createServer(
  manifest: Manifest,
  options?: { port?: number; dev?: boolean }
): { port: number } {
  const { port, dev } = options ?? {};

  const server = Bun.serve({
    port: port ?? 3000,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url, "http://localhost");
      const pathname = url.pathname;

      if (pathname === "/_smooth/data") {
        const rawPath = url.searchParams.get("path") ?? "/";
        const targetUrl = new URL(rawPath, "http://localhost");
        const cleanPath = targetUrl.pathname;
        const query = Object.fromEntries(targetUrl.searchParams) as Record<string, string>;
        const match = matchRoute(manifest, cleanPath);

        if (!match) {
          return new Response(JSON.stringify({ error: "Not Found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { route, params } = match;
        const ctx: SmoothContext = { params, query, req };

        const [pageModule, ...layoutModules] = await Promise.all([
          import(path.resolve(process.cwd(), route.pagePath)),
          ...route.layouts.map((l) => import(path.resolve(process.cwd(), l))),
        ]);

        let props: Record<string, unknown> = {};
        if (typeof pageModule.getServerSideProps === "function") {
          props = (await pageModule.getServerSideProps(ctx)).props;
        }

        const allMeta = [...layoutModules, pageModule]
          .map((m) => m.metadata)
          .filter((m): m is HeadMeta => m != null);
        const title = allMeta.findLast((m) => m.title)?.title;

        return new Response(JSON.stringify({ props, clientBundle: clientBundleToURL(route.clientBundle), title }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (pathname.startsWith("/_smooth/")) {
        const filePath = path.join(".smooth", "client", pathname.slice("/_smooth/".length));
        return new Response(Bun.file(filePath));
      }

      if (pathname !== "/") {
        const publicFile = Bun.file(path.join("public", pathname));
        if (await publicFile.exists()) return new Response(publicFile);
      }

      const match = matchRoute(manifest, pathname);

      if (!match) {
        return new Response(
          "<!doctype html><html><body><h1>404 Not Found</h1></body></html>",
          { status: 404, headers: { "Content-Type": "text/html" } }
        );
      }

      try {
        const { route, params } = match;
        const query = Object.fromEntries(url.searchParams) as Record<string, string>;
        const ctx: SmoothContext = { params, query, req };

        const [pageModule, ...layoutModules] = await Promise.all([
          import(path.resolve(process.cwd(), route.pagePath)) as Promise<PageModule>,
          ...route.layouts.map((l) => import(path.resolve(process.cwd(), l)) as Promise<PageModule>),
        ]);

        let props: Record<string, unknown> = {};
        if (typeof pageModule.getServerSideProps === "function") {
          props = (await pageModule.getServerSideProps(ctx)).props;
        }

        const allMeta = [...layoutModules, pageModule]
          .map((m) => m.metadata)
          .filter((m): m is HeadMeta => m != null);

        const meta: HeadMeta = {
          title: allMeta.findLast((m) => m.title)?.title,
          links: allMeta.flatMap((m) => m.links ?? []),
        };

        const clientManifest: ClientManifestEntry[] = manifest
          .filter((r) => r.loadingBundle)
          .map((r) => ({ pattern: r.pattern, loadingBundle: clientBundleToURL(r.loadingBundle!) }));

        const renderedHTML = await renderPage(route, props);
        const html = assembleHTML(
          renderedHTML,
          props,
          clientBundleToURL(route.clientBundle),
          meta,
          dev,
          clientManifest
        );

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        const body = dev
          ? `<!doctype html><html><body><h1>500 Internal Server Error</h1><pre>${error.message}\n${error.stack}</pre></body></html>`
          : `<!doctype html><html><body><h1>500 Internal Server Error</h1></body></html>`;

        return new Response(body, {
          status: 500,
          headers: { "Content-Type": "text/html" },
        });
      }
    },
  });

  return { port: server.port ?? 3000 };
}
