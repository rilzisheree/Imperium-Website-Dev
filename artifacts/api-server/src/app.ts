import express, { type Express } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import path from "path";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pgSession = require("connect-pg-simple")(session);

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Trust Railway's reverse proxy so secure cookies work
if (isProduction) {
  app.set("trust proxy", 1);
}

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : true;

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET ?? "imperium-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      sameSite: isProduction ? "lax" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

app.use("/api", router);

// Serve the React frontend in production.
// build.mjs copies the frontend dist into dist/public next to the server bundle,
// making the deployment self-contained regardless of host directory layout.
// FRONTEND_DIST_PATH can override this for local dev or custom setups.
const frontendDist =
  process.env.FRONTEND_DIST_PATH ??
  path.resolve(import.meta.dirname, "public");

logger.info(
  { metaDirname: import.meta.dirname, frontendDist },
  "Resolved frontend dist path",
);

if (existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Serving frontend static files");

  // Serve static assets with long-lived cache headers
  app.use(
    express.static(frontendDist, {
      maxAge: isProduction ? "1y" : 0,
      index: false, // We'll handle the index ourselves below
    }),
  );

  // SPA catch-all: return index.html for any non-API route so client-side
  // routing (wouter) works correctly on hard refresh / direct URL access.
  // Express 5 + path-to-regexp v8 requires a named wildcard, not bare *.
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
} else {
  logger.warn(
    { frontendDist },
    "Frontend dist not found — only API routes are active",
  );
}

export default app;
