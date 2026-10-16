// Stand-in for Supabase's API gateway: one URL (localhost:54321) in front of Auth, REST and Storage.
import http from "node:http";

const routes = { "/auth/v1": 54391, "/rest/v1": 54392, "/storage/v1": 54393 };
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, apikey, content-type, x-client-info, x-upsert, prefer, range, accept-profile, content-profile, cache-control, if-none-match, x-supabase-api-version",
  "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
  "access-control-expose-headers": "content-range, etag",
};

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    const prefix = Object.keys(routes).find((p) => req.url.startsWith(p));
    if (!prefix) {
      res.writeHead(404, cors).end("no route");
      return;
    }
    const upstream = http.request(
      { host: "127.0.0.1", port: routes[prefix], path: req.url.slice(prefix.length) || "/", method: req.method, headers: req.headers },
      (up) => {
        res.writeHead(up.statusCode, { ...up.headers, ...cors });
        up.pipe(res);
      },
    );
    upstream.on("error", (e) => res.writeHead(502, cors).end(String(e)));
    req.pipe(upstream);
  })
  .listen(54321, () => console.log("gateway on http://localhost:54321"));
