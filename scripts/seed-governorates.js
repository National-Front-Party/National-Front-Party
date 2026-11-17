import "dotenv/config";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        !specifier.startsWith(".") ||
        !context.parentURL ||
        !context.parentURL.startsWith("file:")
      ) {
        throw error;
      }

      const base = path.resolve(
        path.dirname(fileURLToPath(context.parentURL)),
        specifier,
      );

      for (const extension of [".ts", ".js"]) {
        const candidate = `${base}${extension}`;
        if (existsSync(candidate)) {
          return nextResolve(pathToFileURL(candidate).href, context);
        }
      }

      throw error;
    }
  },
});

const { prisma } = await import("../lib/db.js");

const governorates = [
  { code: "01", name_ar: "القاهرة", sort_order: 1 },
  { code: "21", name_ar: "الجيزة", sort_order: 2 },
  { code: "14", name_ar: "القليوبية", sort_order: 3 },
  { code: "17", name_ar: "المنوفية", sort_order: 4 },
  { code: "16", name_ar: "الغربية", sort_order: 5 },
  { code: "12", name_ar: "الدقهلية", sort_order: 6 },
  { code: "18", name_ar: "البحيرة", sort_order: 7 },
  { code: "13", name_ar: "الشرقية", sort_order: 8 },
  { code: "02", name_ar: "الإسكندرية", sort_order: 9 },
  { code: "15", name_ar: "كفر الشيخ", sort_order: 10 },
  { code: "11", name_ar: "دمياط", sort_order: 11 },
  { code: "03", name_ar: "بورسعيد", sort_order: 12 },
  { code: "19", name_ar: "الإسماعيلية", sort_order: 13 },
  { code: "04", name_ar: "السويس", sort_order: 14 },
  { code: "34", name_ar: "شمال سيناء", sort_order: 15 },
  { code: "35", name_ar: "جنوب سيناء", sort_order: 16 },
  { code: "23", name_ar: "الفيوم", sort_order: 17 },
  { code: "22", name_ar: "بني سويف", sort_order: 18 },
  { code: "24", name_ar: "المنيا", sort_order: 19 },
  { code: "25", name_ar: "أسيوط", sort_order: 20 },
  { code: "26", name_ar: "سوهاج", sort_order: 21 },
  { code: "27", name_ar: "قنا", sort_order: 22 },
  { code: "29", name_ar: "الأقصر", sort_order: 23 },
  { code: "28", name_ar: "أسوان", sort_order: 24 },
  { code: "31", name_ar: "البحر الأحمر", sort_order: 25 },
  { code: "32", name_ar: "الوادي الجديد", sort_order: 26 },
  { code: "33", name_ar: "مطروح", sort_order: 27 },
];

try {
  await prisma.$transaction(async (tx) => {
    for (const governorate of governorates) {
      await tx.governorates.upsert({
        where: { code: governorate.code },
        create: {
          ...governorate,
          is_active: true,
        },
        update: {
          name_ar: governorate.name_ar,
          sort_order: governorate.sort_order,
          is_active: true,
        },
      });
    }
  });

  console.log(`Seeded ${governorates.length} governorates.`);
} finally {
  await prisma.$disconnect();
}
