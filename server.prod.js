// @ts-nocheck
import compression from "compression";
import express from "express";
import morgan from "morgan";

// Short-circuit the type-checking of the built output.
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const BUILD_PATH = "./build/server/index.js";
const BUILD_PATH_SOCKET = "./build/server/index2.js";

const app = express();

app.use(compression());
app.disable("x-powered-by");

console.log("Starting production server");
app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
app.use(express.static("build/client", { maxAge: "1h" }));
app.use(await import(BUILD_PATH).then((mod) => mod.app));
app.use(morgan("tiny"));

const httpServer = await import(BUILD_PATH_SOCKET).then((mod) => mod.runMediaSoupServer(app));
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
