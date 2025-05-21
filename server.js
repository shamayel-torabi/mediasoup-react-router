// @ts-nocheck
import compression from "compression";
import express from "express";
import morgan from "morgan";

// Short-circuit the type-checking of the built output.
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const BUILD_PATH = "./build/server/index.js";
const BUILD_PATH_SOCKET = "./build/server/index2.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";

const app = express();

app.use(compression());
app.disable("x-powered-by");

let httpServer;

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    })
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
  httpServer = await viteDevServer.ssrLoadModule("./server/socket/socket-server.ts").then((mod) => mod.runMediaSoupServer(app));
} else {
  console.log("Starting production server");
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
  httpServer = await import(BUILD_PATH_SOCKET).then((mod) => mod.runMediaSoupServer(app));
}

app.use(morgan("tiny"));

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
