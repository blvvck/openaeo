import "./env";
import express, { type Request, Response, NextFunction } from "express";
import { clerkMiddleware } from "@clerk/express";
import { registerRoutes } from "./routes";
import { mountFrontend, log } from "./frontend-host";
import { workspaceContextMiddleware } from "./middleware/workspace-context";
import { assertTenantSafeDatabaseRole } from "./prisma";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/api", clerkMiddleware({
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}));
app.use("/api", workspaceContextMiddleware);

function recordApiRequest(request: Request, response: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  response.once("finish", () => {
    if (!request.path.startsWith("/api")) return;

    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    log(`${request.method} ${response.statusCode} ${request.path} ${elapsedMs.toFixed(0)}ms`, "http");
  });
  next();
}

async function startApplication() {
  await assertTenantSafeDatabaseRole();
  const httpServer = await registerRoutes(app);

  app.use((error: unknown, _request: Request, response: Response, next: NextFunction) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const candidate = error as { status?: number; statusCode?: number; message?: string };
    const requestedStatus = candidate?.statusCode ?? candidate?.status ?? 500;
    const status = requestedStatus >= 400 && requestedStatus <= 599 ? requestedStatus : 500;
    const message = status === 500 ? "The request could not be completed" : candidate.message ?? "Request failed";
    log(`${status} ${_request.method} ${_request.path}: ${message}`, "error");
    response.status(status).json({ error: message });
  });

  await mountFrontend(app, httpServer);

  const serverPort = Number(process.env.PORT) || 3000;
  const serverHost = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost");
  httpServer.listen(serverPort, serverHost);
  httpServer.once("listening", () => log(`OpenAEO listening at ${serverHost}:${serverPort}`, "http"));
}

app.use(recordApiRequest);
void startApplication();
