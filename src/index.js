import { join } from 'path';
import { hostname } from "node:os";
import { createServer } from "node:http";
import express from "express";
import wisp from "wisp-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { createBareServer } from "@mercuryworkshop/bare-server-node";

const bare = createBareServer('/bare/');
const app = express();

app.use(express.static("./public"));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

app.use((req, res) => {
  res.status(404);
  res.sendFile('index.html', { root: join(new URL('.', import.meta.url).pathname, '../public') });
});

const server = createServer();
server.on("request", (req, res) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  if (bare.shouldRoute(req)) bare.routeRequest(req, res);
  else app(req, res);
});
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) bare.routeUpgrade(req, socket, head);
  else if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
  else socket.end();
});

let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 8080;
server.on("listening", () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  process.exit(0);
}
server.listen({ port });
