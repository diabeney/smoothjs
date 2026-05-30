import { dirname, join, relative } from "path";
import type { RouteEntry } from "../types.js";
import {
  collectPageFiles,
  collectLayouts,
  derivePattern,
  deriveClientBundle,
  deriveLoadingBundle,
  extractParams,
  patternToRegExp,
  fileExists,
} from "./utils.js";

export async function walkAppDir(
  appDir: string,
  projectRoot?: string
): Promise<RouteEntry[]> {
  const root = projectRoot ?? dirname(appDir);
  const pageFiles = await collectPageFiles(appDir);
  const entries: RouteEntry[] = [];

  for (const pageAbsPath of pageFiles) {
    const pattern = derivePattern(pageAbsPath, appDir);
    const pagePath = relative(root, pageAbsPath);
    const layouts = await collectLayouts(pageAbsPath, appDir, root);
    const clientBundle = deriveClientBundle(pattern);

    const relWithoutPage = relative(appDir, pageAbsPath).replace(
      /(?:^|\/)page\.tsx$/,
      ""
    );
    const rawSegments = relWithoutPage
      ? relWithoutPage.split("/").filter(Boolean)
      : [];
    const params = extractParams(rawSegments);

    const loadingAbsPath = join(dirname(pageAbsPath), "loading.tsx");
    const hasLoading = await fileExists(loadingAbsPath);
    const loadingPath = hasLoading ? relative(root, loadingAbsPath) : undefined;
    const loadingBundle = hasLoading ? deriveLoadingBundle(pattern) : undefined;

    entries.push({
      pattern,
      pagePath,
      layouts,
      clientBundle,
      dynamic: params.length > 0,
      params,
      loadingPath,
      loadingBundle,
    });
  }

  entries.sort((a, b) => a.pattern.localeCompare(b.pattern));
  return entries;
}

export function matchRoute(
  routes: RouteEntry[],
  url: string
): { route: RouteEntry; params: Record<string, string> } | null {
  const rawPath = url.split(/[?#]/)[0];
  const pathname = rawPath.length > 1 ? rawPath.replace(/\/$/, "") : rawPath;

  const staticRoutes = routes.filter((r) => !r.dynamic);
  const dynamicRoutes = routes.filter((r) => r.dynamic);

  for (const route of staticRoutes) {
    if (route.pattern === pathname) return { route, params: {} };
  }

  for (const route of dynamicRoutes) {
    const match = patternToRegExp(route.pattern).exec(pathname);
    if (match) return { route, params: match.groups ?? {} };
  }

  return null;
}
