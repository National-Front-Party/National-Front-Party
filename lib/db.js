import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before using Prisma.");
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__nationalFrontPrisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__nationalFrontPrisma = prisma;
}

export async function connectToDatabase() {
  await prisma.$connect();
  return prisma;
}
