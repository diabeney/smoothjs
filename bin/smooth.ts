#!/usr/bin/env bun
import { build } from "../pkg/build/index.js";
import { createServer } from "../pkg/server/index.js";
import { watch } from "../pkg/watcher/index.js";
import { resolve } from "path";

const cmd = process.argv[2];
const appDir = resolve("pages");
const outDir = resolve(".smooth");

async function main() {
  switch (cmd) {
    case "build": {
      const start = Date.now();
      await build(appDir, outDir);
      console.log(`Built in ${Date.now() - start}ms`);
      process.exit(0);
    }

    case "start": {
      const manifest = JSON.parse(await Bun.file(resolve(outDir, "manifest.json")).text());
      const server = createServer(manifest);
      console.log(`Server running at http://localhost:${server.port}`);
      break;
    }

    case "dev": {
      await build(appDir, outDir);

      const manifestPath = resolve(outDir, "manifest.json");
      const childPort = 3001;
      const sseClients = new Set<ReadableStreamDefaultController<string>>();

      function spawnChild(): ReturnType<typeof Bun.spawn> {
        return Bun.spawn(
          ["bun", resolve("pkg/server/run.ts"), manifestPath, String(childPort), "--dev"],
          { stdout: "inherit", stderr: "inherit" }
        );
      }

      let child = spawnChild();

      const proxy = Bun.serve({
        port: 3000,
        async fetch(req: Request): Promise<Response> {
          const url = new URL(req.url);

          if (url.pathname === "/_smooth/hmr") {
            let ctrl!: ReadableStreamDefaultController<string>;
            const stream = new ReadableStream<string>({
              start(c) {
                ctrl = c;
                sseClients.add(ctrl);
                ctrl.enqueue(": connected\n\n");
              },
              cancel() {
                sseClients.delete(ctrl);
              },
            });
            return new Response(stream, {
              headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
              },
            });
          }

          const childUrl = new URL(req.url);
          childUrl.hostname = "localhost";
          childUrl.port = String(childPort);
          const isBodyMethod = req.method !== "GET" && req.method !== "HEAD";
          return fetch(childUrl.toString(), {
            method: req.method,
            headers: req.headers,
            body: isBodyMethod ? req.body : undefined,
          });
        },
      });

      console.log(`Dev server at http://localhost:${proxy.port}`);

      watch(appDir, async () => {
        await build(appDir, outDir);
        child.kill();
        child = spawnChild();
        await new Promise((r) => setTimeout(r, 150));
        for (const ctrl of sseClients) {
          try {
            ctrl.enqueue("data: reload\n\n");
          } catch {
            sseClients.delete(ctrl);
          }
        }
      });
      break;
    }

    default: {
      if (cmd) console.error(`Unknown command: ${cmd}\n`);
      console.error("Usage: smooth <build|dev|start>");
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
