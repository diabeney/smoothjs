import { readdir, stat } from "fs/promises";
import { join, relative, dirname, resolve } from "path";
import type { RouteEntry } from "../types.js";

export async function collectPageFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectPageFiles(fullPath));
    } else if (entry.isFile() && entry.name === "page.tsx") {
      results.push(fullPath);
    }
  }

  return results;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export function derivePattern(pageAbsPath: string, appDir: string): string {
  const rel = relative(appDir, pageAbsPath);
  const withoutPage = rel.replace(/(?:^|\/)page\.tsx$/, "");

  if (!withoutPage) return "/";

  const segments = withoutPage.split("/").filter(Boolean);
  const urlSegments = segments.map((seg) =>
    seg.startsWith("[") && seg.endsWith("]") ? `:${seg.slice(1, -1)}` : seg
  );

  return "/" + urlSegments.join("/");
}

export function extractParams(segments: string[]): string[] {
  return segments
    .filter((seg) => seg.startsWith("[") && seg.endsWith("]"))
    .map((seg) => seg.slice(1, -1));
}

export function deriveClientBundle(pattern: string): string {
  if (pattern === "/") return ".smooth/client/index.js";
  const withBrackets = pattern.slice(1).replace(/:([^/]+)/g, "[$1]");
  return `.smooth/client/${withBrackets}.js`;
}

export function deriveLoadingBundle(pattern: string): string {
  if (pattern === "/") return ".smooth/client/index.loading.js";
  const withBrackets = pattern.slice(1).replace(/:([^/]+)/g, "[$1]");
  return `.smooth/client/${withBrackets}.loading.js`;
}

export async function collectLayouts(
  pageAbsPath: string,
  appDir: string,
  projectRoot: string
): Promise<string[]> {
  const layouts: string[] = [];
  let current = dirname(pageAbsPath);
  const appDirResolved = resolve(appDir);

  while (true) {
    const currentResolved = resolve(current);

    if (!currentResolved.startsWith(appDirResolved)) break;

    const layoutPath = join(current, "layout.tsx");
    if (await fileExists(layoutPath)) {
      layouts.push(relative(projectRoot, layoutPath));
    }

    if (currentResolved === appDirResolved) break;

    current = dirname(current);
  }

  return layouts.reverse();
}

// Splits on :param markers — capturing group keeps param names in the result array.
// Even indices are literal segments, odd indices are param names.
export function patternToRegExp(pattern: string): RegExp {
  const parts = pattern.split(/:([A-Za-z_][A-Za-z0-9_]*)/);
  const regexSource = parts
    .map((token, i) =>
      i % 2 === 0
        ? token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        : `(?<${token}>[^/]+)`
    )
    .join("");
  return new RegExp(`^${regexSource}$`);
}
