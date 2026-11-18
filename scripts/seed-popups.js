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

const popups = [
  { slug: "popup-about", title: "من نحن؟", sort_order: 1 },
  { slug: "popup-goals", title: "هدفنا", sort_order: 2 },
  { slug: "popup-vision", title: "رؤيتنا", sort_order: 3 },
  { slug: "popup-mission", title: "رسالتنا", sort_order: 4 },
  { slug: "popup-why-us", title: "لماذا نحن؟", sort_order: 5 },
];

try {
  await prisma.$transaction(async (tx) => {
    for (const popup of popups) {
      const existing = await tx.info_items.findUnique({
        where: { slug: popup.slug },
        select: { id: true },
      });
      if (existing) continue;
      await tx.info_items.create({
        data: {
          slug: popup.slug,
          title: popup.title,
          body: null,
          source_note: null,
          icon: null,
          sort_order: popup.sort_order,
          is_published: false,
          kind: "popup",
        },
      });
    }
  });

  console.log(`Seed ensured ${popups.length} initial popup entries.`);
} finally {
  await prisma.$disconnect();
}
