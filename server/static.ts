import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// client está en la raíz del proyecto
const CLIENT_PATH = path.resolve(__dirname, "../client");

export function serveStatic(app: Express) {
  app.use(express.static(CLIENT_PATH));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(CLIENT_PATH, "index.html"));
  });
}
