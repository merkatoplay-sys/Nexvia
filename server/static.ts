import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function serveStatic(app: Express) {
  const publicPath = path.resolve(__dirname, "public");

  app.use(express.static(publicPath));

  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });
}
