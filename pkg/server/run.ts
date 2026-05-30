import { createServer } from "./index.js";

const [, , manifestPath, portStr, flag] = process.argv;
const manifest = JSON.parse(await Bun.file(manifestPath).text());
const port = parseInt(portStr);
const dev = flag === "--dev";

createServer(manifest, { port, dev });
