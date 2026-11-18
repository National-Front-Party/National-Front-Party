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
const fs = await import("fs");
const seedData = JSON.parse(
  fs.readFileSync(new URL("./seed-data.json", import.meta.url), "utf-8"),
);
const {
  GOVERNORATE_PEOPLE,
  parliamentaryItems,
  requestsMock,
  NEWS,
  centralSecretariats,
  mainLinks,
  partyProgram,
  VISION_2030,
} = seedData;

console.log("🚀 Starting database seeding from data mock files...");

try {
  // 1. Seed Ministries & Request Sectors
  console.log("➡️ Seeding Ministries & Request Sectors...");
  for (let i = 0; i < requestsMock.ministries.length; i++) {
    const item = requestsMock.ministries[i];
    await prisma.ministries.upsert({
      where: { slug: item.id },
      create: {
        slug: item.id,
        name_ar: item.label,
        sort_order: i + 1,
        is_active: true,
      },
      update: {
        name_ar: item.label,
        sort_order: i + 1,
        is_active: true,
      },
    });
  }

  const validSectors = requestsMock.sectorOptions.filter((s) => s.value);
  for (let i = 0; i < validSectors.length; i++) {
    const s = validSectors[i];
    await prisma.request_sectors.upsert({
      where: { code: s.value },
      create: {
        code: s.value,
        name_ar: s.label,
        sort_order: i + 1,
        is_active: true,
      },
      update: {
        name_ar: s.label,
        sort_order: i + 1,
        is_active: true,
      },
    });
  }
  console.log(`✅ Seeded ${requestsMock.ministries.length} ministries and ${validSectors.length} sectors.`);

  // 2. Seed News Sources & News Articles
  console.log("➡️ Seeding News Sources & News Articles...");
  const source1 = await prisma.news_sources.upsert({
    where: { slug: "youm7" },
    create: { slug: "youm7", name_ar: "اليوم السابع", sort_order: 1, is_active: true },
    update: { name_ar: "اليوم السابع", is_active: true },
  });
  const source2 = await prisma.news_sources.upsert({
    where: { slug: "party-fb" },
    create: { slug: "party-fb", name_ar: "صفحة الحزب", sort_order: 2, is_active: true },
    update: { name_ar: "صفحة الحزب", is_active: true },
  });

  for (let i = 0; i < NEWS.length; i++) {
    const n = NEWS[i];
    const sourceId = n.meta.includes("اليوم السابع") ? source1.id : source2.id;
    await prisma.news_articles.upsert({
      where: { slug: `news-article-${n.id}` },
      create: {
        slug: `news-article-${n.id}`,
        title: n.title,
        body: n.paras.join("\n\n"),
        image_url: n.img,
        source_id: sourceId,
        source_url: n.link,
        published_on: new Date(2026, 10, 7 - i * 30),
        status: "published",
        is_published: true,
        sort_order: i + 1,
      },
      update: {
        title: n.title,
        body: n.paras.join("\n\n"),
        image_url: n.img,
        source_id: sourceId,
        source_url: n.link,
        status: "published",
        is_published: true,
        sort_order: i + 1,
      },
    });
  }
  console.log(`✅ Seeded ${NEWS.length} news articles.`);

  // 3. Seed Parliamentary Unit Items
  console.log("➡️ Seeding Parliamentary Unit Items...");
  for (let i = 0; i < parliamentaryItems.length; i++) {
    const item = parliamentaryItems[i];
    await prisma.parliamentary_unit_items.upsert({
      where: { slug: item.id },
      create: {
        slug: item.id,
        title: item.title,
        subtitle: item.subtitle,
        icon: item.icon,
        head_name: item.modal.personName,
        head_role: item.modal.personRole,
        body: item.modal.paragraphs.join("\n\n"),
        source_note: item.modal.source,
        sort_order: i + 1,
        is_published: true,
      },
      update: {
        title: item.title,
        subtitle: item.subtitle,
        icon: item.icon,
        head_name: item.modal.personName,
        head_role: item.modal.personRole,
        body: item.modal.paragraphs.join("\n\n"),
        source_note: item.modal.source,
        sort_order: i + 1,
        is_published: true,
      },
    });
  }
  console.log(`✅ Seeded ${parliamentaryItems.length} parliamentary items.`);

  // 4. Seed Info Items (Popups, Speeches, Party Program)
  console.log("➡️ Seeding Info Items (Popups, Speeches, Program)...");
  for (let i = 0; i < mainLinks.length; i++) {
    const link = mainLinks[i];
    await prisma.info_items.upsert({
      where: { slug: link.id },
      create: {
        slug: link.id,
        title: link.title,
        body: link.paragraphs.join("\n\n"),
        source_note: link.source,
        icon: link.icon,
        sort_order: i + 1,
        is_published: true,
        kind: "popup",
      },
      update: {
        title: link.title,
        body: link.paragraphs.join("\n\n"),
        source_note: link.source,
        icon: link.icon,
        sort_order: i + 1,
        is_published: true,
        kind: "popup",
      },
    });
  }

  // Party Program
  await prisma.info_items.upsert({
    where: { slug: "party-program" },
    create: {
      slug: "party-program",
      title: partyProgram.title,
      body: partyProgram.paragraphs.join("\n\n"),
      source_note: partyProgram.source,
      sort_order: 10,
      is_published: true,
      kind: "program",
    },
    update: {
      title: partyProgram.title,
      body: partyProgram.paragraphs.join("\n\n"),
      source_note: partyProgram.source,
      sort_order: 10,
      is_published: true,
      kind: "program",
    },
  });

  // Vision 2030
  await prisma.info_items.upsert({
    where: { slug: "vision-2030" },
    create: {
      slug: "vision-2030",
      title: VISION_2030.modal.title,
      button_label: VISION_2030.buttonLabel,
      body: VISION_2030.modal.paras.join("\n\n"),
      source_note: VISION_2030.modal.note,
      link_url: VISION_2030.modal.link,
      link_label: VISION_2030.modal.linkLabel,
      sort_order: 15,
      is_published: true,
      kind: "vision",
    },
    update: {
      title: VISION_2030.modal.title,
      button_label: VISION_2030.buttonLabel,
      body: VISION_2030.modal.paras.join("\n\n"),
      source_note: VISION_2030.modal.note,
      link_url: VISION_2030.modal.link,
      link_label: VISION_2030.modal.linkLabel,
      sort_order: 15,
      is_published: true,
      kind: "vision",
    },
  });

  // Speeches
  const speeches = [
    {
      slug: "speech-president",
      speech: centralSecretariats.president.speech,
      sort: 20,
    },
    {
      slug: "speech-vice",
      speech: centralSecretariats.viceSpeech,
      sort: 21,
    },
    {
      slug: "speech-secretary-general",
      speech: centralSecretariats.secretaryGeneralSpeech,
      sort: 22,
    },
  ];

  for (const sp of speeches) {
    await prisma.info_items.upsert({
      where: { slug: sp.slug },
      create: {
        slug: sp.slug,
        title: sp.speech.modalTitle,
        button_label: sp.speech.buttonLabel,
        person_name: sp.speech.personName,
        person_role_title: sp.speech.personRole,
        body: sp.speech.paragraphs.join("\n\n"),
        source_note: sp.speech.note,
        sort_order: sp.sort,
        is_published: true,
        kind: "speech",
      },
      update: {
        title: sp.speech.modalTitle,
        button_label: sp.speech.buttonLabel,
        person_name: sp.speech.personName,
        person_role_title: sp.speech.personRole,
        body: sp.speech.paragraphs.join("\n\n"),
        source_note: sp.speech.note,
        sort_order: sp.sort,
        is_published: true,
        kind: "speech",
      },
    });
  }
  console.log("✅ Seeded info items (popups, speeches, and party program).");

  // 5. Seed Panels and Central Leadership
  console.log("➡️ Seeding Central Leadership...");
  const panel = await prisma.panels.upsert({
    where: { slug: "central-leadership" },
    create: {
      slug: "central-leadership",
      title: "قيادة الحزب",
      leaders_heading: centralSecretariats.leadership.title,
      sort_order: 1,
      is_published: true,
    },
    update: {
      title: "قيادة الحزب",
      leaders_heading: centralSecretariats.leadership.title,
      is_published: true,
    },
  });

  // President leader
  const existingPresident = await prisma.leaders.findFirst({
    where: { panel_id: panel.id, is_head: true },
  });
  if (!existingPresident) {
    await prisma.leaders.create({
      data: {
        panel_id: panel.id,
        full_name: centralSecretariats.president.name,
        role_title: centralSecretariats.president.title,
        photo_url: centralSecretariats.president.image,
        is_head: true,
        sort_order: 1,
        is_published: true,
      },
    });
  }

  // Other leaders
  for (let i = 0; i < centralSecretariats.leadership.leaders.length; i++) {
    const leader = centralSecretariats.leadership.leaders[i];
    const existing = await prisma.leaders.findFirst({
      where: { panel_id: panel.id, full_name: leader.name },
    });
    if (!existing) {
      await prisma.leaders.create({
        data: {
          panel_id: panel.id,
          full_name: leader.name,
          role_title: leader.role,
          badge_label: leader.badge,
          is_head: false,
          sort_order: i + 2,
          is_published: true,
        },
      });
    }
  }
  console.log("✅ Seeded central leadership.");

  // 6. Seed Central Secretariats & People
  console.log("➡️ Seeding Central Secretariats list...");
  const secretariatsInfo = await prisma.info_items.upsert({
    where: { slug: "central-secretariats" },
    create: {
      slug: "central-secretariats",
      title: centralSecretariats.secretariats.modalTitle,
      button_label: centralSecretariats.secretariats.buttonLabel,
      sort_order: 30,
      is_published: true,
      kind: "secretariats",
    },
    update: {
      title: centralSecretariats.secretariats.modalTitle,
      button_label: centralSecretariats.secretariats.buttonLabel,
      sort_order: 30,
      is_published: true,
    },
  });

  for (let i = 0; i < centralSecretariats.secretariats.items.length; i++) {
    const sec = centralSecretariats.secretariats.items[i];
    const existingSec = await prisma.central_secretariats.findFirst({
      where: { info_item_id: secretariatsInfo.id, name_ar: sec.name },
    });

    let secRecord = existingSec;
    if (!secRecord) {
      secRecord = await prisma.central_secretariats.create({
        data: {
          info_item_id: secretariatsInfo.id,
          name_ar: sec.name,
          head_name: sec.head,
          source_note: sec.source || null,
          sort_order: i + 1,
          is_published: true,
        },
      });
    }

    if (sec.head) {
      const existingPerson = await prisma.central_secretariat_people.findFirst({
        where: { secretariat_id: secRecord.id, full_name: sec.head },
      });
      if (!existingPerson) {
        await prisma.central_secretariat_people.create({
          data: {
            secretariat_id: secRecord.id,
            full_name: sec.head,
            position_title: "أمين الأمانة",
            sort_order: 1,
            is_published: true,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${centralSecretariats.secretariats.items.length} central secretariats.`);

  // 7. Seed Governorate Secretariats Info (Leaders per Governorate)
  console.log("➡️ Seeding Governorate Leaders...");
  const allGovs = await prisma.governorates.findMany({ select: { id: true, name_ar: true } });
  const govMap = new Map(allGovs.map((g) => [g.name_ar, g.id]));

  let govLeadersCount = 0;
  for (const [govName, people] of Object.entries(GOVERNORATE_PEOPLE)) {
    const govId = govMap.get(govName);
    if (!govId) continue;

    for (let i = 0; i < people.length; i++) {
      const p = people[i];
      const existing = await prisma.governorate_secretariats_info.findFirst({
        where: { governorate_id: govId, full_name: p.name },
      });
      if (!existing) {
        await prisma.governorate_secretariats_info.create({
          data: {
            governorate_id: govId,
            full_name: p.name,
            role_title: p.role,
            photo_url: p.photo || null,
            sort_order: i + 1,
            is_published: true,
          },
        });
        govLeadersCount++;
      }
    }
  }
  console.log(`✅ Seeded ${govLeadersCount} governorate secretariats leaders.`);

  console.log("🎉 All mock data has been successfully seeded into database tables!");
} catch (error) {
  console.error("❌ Seeding failed:", error);
} finally {
  await prisma.$disconnect();
}
