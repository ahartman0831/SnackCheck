import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createServer } from "node:https";
import { request } from "node:http";

// Disposable browser-test TLS only. Production cookies keep their Secure flag.
const listen = new URL(process.argv[2]);
const upstream = new URL(process.argv[3]);
if (
  listen.protocol !== "https:" ||
  upstream.protocol !== "http:" ||
  ![listen, upstream].every(
    (url) =>
      ["127.0.0.1", "localhost"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      Boolean(url.port),
  )
) {
  throw new Error("Test TLS requires explicit loopback HTTPS and HTTP endpoints.");
}
const directory = mkdtempSync(join(tmpdir(), "snackcheck-test-tls-"));
const key = join(directory, "key.pem");
const cert = join(directory, "cert.pem");
const generated = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
  ],
  { stdio: "ignore" },
);
if (generated.status !== 0) {
  rmSync(directory, { recursive: true, force: true });
  throw new Error("Could not generate the disposable browser-test certificate.");
}
const server = createServer(
  { key: readFileSync(key), cert: readFileSync(cert) },
  (incoming, outgoing) => {
    const forwarded = request(
      {
        hostname: upstream.hostname,
        port: upstream.port,
        path: incoming.url,
        method: incoming.method,
        headers: {
          ...incoming.headers,
          "x-forwarded-proto": "https",
          "x-forwarded-host": listen.host,
        },
      },
      (response) => {
        outgoing.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(outgoing);
      },
    );
    forwarded.on("error", () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.on("aborted", () => forwarded.destroy());
    incoming.pipe(forwarded);
  },
);
server.listen(Number(listen.port), listen.hostname);
function cleanup() {
  server.close();
  rmSync(directory, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);
