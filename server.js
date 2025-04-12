import compression from "compression";
import express from "express";
import morgan from "morgan";
import { createServer } from 'node:http';
import { Server } from 'socket.io';

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.use(compression());
app.disable("x-powered-by");

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
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

app.use(morgan("tiny"));

const httpServer = createServer(app);
const io = new Server(httpServer);
const messages = [];

const connections = io.of('/mediasoup')

connections.on('connection', (socket) => {
  console.log('a user connected');

  socket.emit("connection-success", { socketId: socket.id, messages });

  socket.on("disconnect", () => {
    console.log("Peer disconnected");
  });
  
  socket.on("sendMessage", (message) => {
    const m = { id: crypto.randomUUID(), text: message };
    messages.push(m);
    connections.emit("newMessage", m);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
