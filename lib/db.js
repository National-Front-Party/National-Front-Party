import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before using Prisma.");
}

const globalForPrisma = globalThis;

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma =
  globalForPrisma.__nationalFrontPrisma?.party_programs
    ? globalForPrisma.__nationalFrontPrisma
    : (globalForPrisma.__nationalFrontPrisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__nationalFrontPrisma = prisma;
}

export async function connectToDatabase() {
  await prisma.$connect();
  return prisma;
}
