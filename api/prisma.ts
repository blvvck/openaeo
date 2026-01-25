import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { currentPrismaTransaction } from "./context/workspace-context";

const runtimeDatabaseUrl = process.env.APP_DATABASE_URL || process.env.DATABASE_URL;
if (!runtimeDatabaseUrl) {
  throw new Error("APP_DATABASE_URL or DATABASE_URL must be set");
}

const adapter = new PrismaPg({ connectionString: runtimeDatabaseUrl });

export const prismaRoot = new PrismaClient({ adapter });
export const prisma = new Proxy(prismaRoot, {
  get(target, property) {
    const transaction = currentPrismaTransaction();
    if (property === "$transaction" && transaction) {
      return (operation: ((client: typeof transaction) => unknown) | unknown[]) =>
        Array.isArray(operation) ? Promise.all(operation) : operation(transaction);
    }
    const activeClient = transaction ?? target;
    const value = Reflect.get(activeClient, property, activeClient);
    return typeof value === "function" ? value.bind(activeClient) : value;
  },
}) as PrismaClient;

export async function assertTenantSafeDatabaseRole(): Promise<void> {
  const [role] = await prismaRoot.$queryRaw<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>`
    SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user
  `;
  if (role?.rolsuper || role?.rolbypassrls) {
    const message = "Runtime database role bypasses row-level security; use APP_DATABASE_URL with a non-superuser, non-BYPASSRLS role.";
    if (process.env.NODE_ENV === "production") throw new Error(message);
    console.warn(`[Database] ${message}`);
  }
}
