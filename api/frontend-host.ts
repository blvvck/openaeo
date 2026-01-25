import express, { type Express } from "express";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

const runtimeDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(runtimeDirectory, "..");
const clientEntry = path.join(projectDirectory, "client", "index.html");
const productionAssets = path.join(runtimeDirectory, "public");

export function log(message: string, source = "openaeo"): void {
  const timestamp = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date());

  console.info(`${timestamp} [${source}] ${message}`);
}

export async function mountFrontend(app: Express, server: Server): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    await mountDevelopmentClient(app, server);
    return;
  }

  mountProductionClient(app);
}

async function mountDevelopmentClient(app: Express, server: Server): Promise<void> {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.join(projectDirectory, "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true,
    },
    appType: "custom",
  });

  server.once("close", () => void vite.close());
  app.use(vite.middlewares);
  app.get("*", async (request, response, next) => {
    try {
      const source = await readFile(clientEntry, "utf8");
      const template = source.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${Date.now().toString(36)}"`,
      );
      const document = await vite.transformIndexHtml(request.originalUrl, template);
      response.type("html").send(document);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
}

function mountProductionClient(app: Express): void {
  const indexFile = path.join(productionAssets, "index.html");
  if (!existsSync(indexFile)) {
    throw new Error(`Production client bundle is missing: ${productionAssets}`);
  }

  app.use(express.static(productionAssets));
  app.get("*", (_request, response) => {
    response.sendFile(indexFile);
  });
}
