import { Readable } from "node:stream";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Serves the Vercel functions in api/ during `npm run dev`.
function apiRoutes() {
  return {
    name: "api-routes",
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ""));
      server.middlewares.use("/api", async (req, res, next) => {
        try {
          const route = req.url.split("?")[0];
          const { POST } = await server.ssrLoadModule(`/api${route}.js`);
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const response = await POST(
            new Request(`http://${req.headers.host}${req.originalUrl}`, {
              method: req.method,
              headers: req.headers,
              body: req.method === "POST" ? Buffer.concat(chunks) : undefined,
            })
          );
          res.statusCode = response.status;
          response.headers.forEach((value, name) => res.setHeader(name, value));
          if (response.body) Readable.fromWeb(response.body).pipe(res);
          else res.end();
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), apiRoutes()],
});
