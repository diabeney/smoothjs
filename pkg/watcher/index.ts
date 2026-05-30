import { watch as fsWatch } from "fs";

function fileToRoute(filename: string | null): string {
  if (!filename) return "unknown";
  const normalized = filename.replace(/\\/g, "/");
  const withoutFile = normalized
    .replace(/\/(page|layout|loading|error)\.tsx?$/, "")
    .replace(/^(page|layout|loading|error)\.tsx?$/, "");
  const pattern = withoutFile.replace(/\[([^\]]+)\]/g, ":$1");
  return "/" + pattern;
}

export function watch(appDir: string, onChange: () => Promise<void>): void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let building = false;
  let pendingFile: string | null = null;

  async function runRebuild(filename: string | null) {
    building = true;
    const route = fileToRoute(filename);
    const start = Date.now();
    console.log(`\n[smooth] ${route} changed, rebuilding...`);

    try {
      await onChange();
      console.log(`[smooth] rebuilt in ${Date.now() - start}ms\n`);
    } catch (err) {
      console.error(`[smooth] rebuild failed:`, err);
      console.error("[smooth] watching for changes...\n");
    } finally {
      building = false;
      if (pendingFile !== null) {
        const next = pendingFile;
        pendingFile = null;
        await runRebuild(next);
      }
    }
  }

  const watcher = fsWatch(appDir, { recursive: true }, (_, filename) => {
    if (building) {
      pendingFile = filename ?? pendingFile;
      return;
    }

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runRebuild(filename ?? null);
    }, 100);
  });

  watcher.on("error", (err) => console.error("[smooth] watcher error:", err));
}
