import { PrismaRepository } from "./prisma-repository";

export type { WorkspaceRepository } from "./contracts";
export const storage = new PrismaRepository();
