import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// aquí se sirve el frontend ya construido por Vite
const CLIENT_PATH = path.resolve(__dirname, "public");

export function serveStatic(app: Express) {
  app.use(express.static(CLIENT_PATH));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(CLIENT_PATH, "index.html"));
  });
}
