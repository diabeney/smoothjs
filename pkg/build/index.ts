import { mkdir, writeFile } from "fs/promises";
import { resolve, dirname, join } from "path";
import tailwindPlugin from "tailwindcss-bun-plugin";
import type { RouteEntry } from "../types.js";
import { walkAppDir } from "../router/index.js";
import { generateEntrypoint, generateLoadingEntrypoint, entryTempPath } from "./utils.js";

export async function buildClientBundles(
  routes: RouteEntry[],
  outDir: string
): Promise<void> {
  const projectRoot = resolve(outDir);
  const isProduction = process.env.NODE_ENV === "production";

  await mkdir(resolve(projectRoot, ".smooth/entries"), { recursive: true });

  async function buildBundle(source: string, clientBundle: string, label: string) {
    const entryPath = entryTempPath(clientBundle, projectRoot);
    await mkdir(dirname(entryPath), { recursive: true });
    await writeFile(entryPath, source, "utf-8");

    const bundleOutDir = dirname(resolve(projectRoot, clientBundle));
    const result = await Bun.build({
      entrypoints: [entryPath],
      outdir: bundleOutDir,
      naming: "[name].js",
      target: "browser",
      minify: true,
      sourcemap: isProduction ? "none" : "inline",
    });

    if (!result.success) {
      const messages = result.logs.map((l) => l.message).join("\n");
      throw new Error(`Bun.build() failed for "${label}":\n${messages}`);
    }
  }

  await Promise.all(
    routes.flatMap((route) => {
      const jobs = [
        buildBundle(generateEntrypoint(route, projectRoot), route.clientBundle, route.pattern),
      ];
      if (route.loadingPath && route.loadingBundle) {
        jobs.push(
          buildBundle(generateLoadingEntrypoint(route, projectRoot), route.loadingBundle, `${route.pattern} (loading)`)
        );
      }
      return jobs;
    })
  );
}

export async function buildCSS(appDir: string, outDir: string): Promise<void> {
  const globalsCSS = join(appDir, "globals.css");
  if (!(await Bun.file(globalsCSS).exists())) return;

  const clientOutDir = join(outDir, "client");
  await mkdir(clientOutDir, { recursive: true });

  const result = await Bun.build({
    entrypoints: [globalsCSS],
    outdir: clientOutDir,
    naming: "styles.css",
    plugins: [tailwindPlugin],
  });

  if (!result.success) {
    const messages = result.logs.map((l) => l.message).join("\n");
    throw new Error(`CSS build failed:\n${messages}`);
  }
}

export async function writeManifest(
  routes: RouteEntry[],
  outDir: string
): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "manifest.json"), JSON.stringify(routes, null, 2), "utf-8");
}

export async function build(appDir: string, outDir: string): Promise<void> {
  const routes = await walkAppDir(appDir, resolve(outDir, ".."));
  await buildClientBundles(routes, resolve(outDir, ".."));
  await buildCSS(appDir, outDir);
  await writeManifest(routes, outDir);
}
