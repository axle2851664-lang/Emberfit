import { PrismaClient } from "@prisma/client";

/** Single Prisma instance, reused across hot reloads in development. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * EmberFit ships as a single-user, self-hosted app: there is no sign-up flow to
 * get in the way. Everything is still keyed by user id so multi-user auth can be
 * dropped in later by replacing just this function.
 */
let cachedUserId: string | null = null;

export async function getCurrentUser() {
  if (cachedUserId) {
    const cached = await prisma.user.findUnique({
      where: { id: cachedUserId },
      include: { profile: true },
    });
    if (cached) return cached;
    cachedUserId = null;
  }

  const existing = await prisma.user.findFirst({
    include: { profile: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    cachedUserId = existing.id;
    if (!existing.profile) {
      const profile = await prisma.profile.create({ data: { userId: existing.id } });
      return { ...existing, profile };
    }
    return existing;
  }

  const created = await prisma.user.create({
    data: { name: "Athlete", profile: { create: {} } },
    include: { profile: true },
  });
  cachedUserId = created.id;
  return created;
}

export async function getCurrentUserId(): Promise<string> {
  return (await getCurrentUser()).id;
}
