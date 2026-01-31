import { prismaRoot } from "./prisma";

export const db = prismaRoot;

export async function checkHealth(): Promise<{ connected: boolean; responseTimeMs: number; error?: string }> {
  const start = Date.now();
  try {
    await prismaRoot.$queryRaw`SELECT 1`;
    return { connected: true, responseTimeMs: Date.now() - start };
  } catch (error) {
    return {
      connected: false,
      responseTimeMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function queryWithTiming<T>(queryFn: () => Promise<T>, label?: string): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;
    if (duration > Number(process.env.DB_SLOW_QUERY_THRESHOLD || 100)) {
      console.warn(`[DB] Slow query${label ? ` (${label})` : ""}: ${duration}ms`);
    }
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[DB] Query failed${label ? ` (${label})` : ""} after ${duration}ms:`, error);
    throw error;
  }
}

export async function closePool(): Promise<void> {
  await prismaRoot.$disconnect();
}
