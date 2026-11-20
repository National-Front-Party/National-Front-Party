const DEFAULT_GOV_FALLBACK = {
  name: "هيكل أمانة المحافظة قيد الاعتماد",
  role: "جاري استكمال التشكيلات",
  photo: "/avatars/avatar-fallback.svg",
};

const DEFAULT_REQUEST_FIELDS = {
  name: "الاسم",
  phone: "رقم الموبايل",
  phonePlaceholder: "01xxxxxxxxx",
  sector: "القطاع",
  entity: "الجهة التابع لها:",
  submit: "أرسل الطلب",
  success: "تم استلام طلبك",
};

const DEFAULT_VISION_2030 = {
  eyebrow: "استراتيجية التنمية المستدامة",
  title: "رؤية مصر 2030",
  intro:
    "النسخة المحدثة الصادرة عن وزارة التخطيط والتنمية الاقتصادية تقوم على أربعة مبادئ حاكمة، وستة أهداف استراتيجية، وسبعة ممكنات.",
  chips: [
    "الإنسان محور التنمية",
    "العدالة والإتاحة",
    "المرونة والتكيف",
    "الاستدامة",
  ],
  buttonLabel: "تفاصيل الرؤية والممكنات",
  stats: [
    { value: 4, label: "مبادئ حاكمة" },
    { value: 6, label: "أهداف استراتيجية" },
    { value: 7, label: "ممكنات" },
  ],
  modal: {
    title: "رؤية مصر 2030",
    paras: [
      "أطلقت مصر في فبراير 2016 استراتيجية التنمية المستدامة: رؤية مصر 2030 كأول استراتيجية تصاغ وفقا لمنهجية التخطيط الاستراتيجي التشاركي.",
      "تم تحديث الاستراتيجية لمواكبة التغيرات والتحديات، مع التركيز على الاستثمار في البشر والتحول الرقمي والعدالة الاجتماعية والتنمية المكانية المتوازنة.",
    ],
    note: "المصدر: الموقع الرسمي لوزارة التخطيط والتنمية الاقتصادية والتعاون الدولي",
    link: "https://mped.gov.eg",
    linkLabel: "موقع وزارة التخطيط",
  },
};

export async function getHomePageData() {
  if (!process.env.DATABASE_URL) {
    return getDefaultHomeData();
  }

  try {
    const { prisma } = await import("./db.js");

    const [
      infoItems,
      panelWithLeaders,
      centralSecs,
      parliamentary,
      governoratesWithInfo,
      ministries,
      sectors,
      newsArticles,
      partyProgramDb,
    ] = await Promise.all([
      prisma.info_items.findMany({
        where: { is_published: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.panels.findFirst({
        where: { slug: "central-leadership", is_published: true },
        include: {
          leaders: {
            where: { is_published: true },
            orderBy: { sort_order: "asc" },
          },
        },
      }),
      prisma.central_secretariats.findMany({
        where: { is_published: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.parliamentary_unit_items.findMany({
        where: { is_published: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.governorates.findMany({
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
        include: {
          governorate_secretariats_info: {
            where: { is_published: true },
            orderBy: { sort_order: "asc" },
          },
        },
      }),
      prisma.ministries.findMany({
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.request_sectors.findMany({
        where: { is_active: true },
        orderBy: { sort_order: "asc" },
      }),
      prisma.news_articles.findMany({
        where: { is_published: true, status: "published" },
        orderBy: [{ sort_order: "asc" }, { published_on: "desc" }],
        include: { source: true },
      }),
      prisma.party_programs?.findFirst
        ? prisma.party_programs.findFirst({
            where: { is_published: true },
            orderBy: { id: "desc" },
          })
        : null,
    ]);

    // 1. Main links & party program
    const popupItems = infoItems.filter((item) => item.kind === "popup");
    const mainLinks = popupItems.map((item) => ({
      id: item.slug,
      title: item.title,
      paragraphs: item.body ? item.body.split("\n\n") : [],
      icon: item.icon || "user",
      source: item.source_note || "الموقع الرسمي للحزب",
    }));

    const partyProgram = {
      title: partyProgramDb?.title || "برنامج الحزب",
      paragraphs: partyProgramDb?.body
        ? partyProgramDb.body.split("\n\n")
        : ["نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده."],
      source: partyProgramDb?.source_note || "الموقع الرسمي للحزب",
    };

    // 2. Central Secretariats & Leadership
    let centralSecretariats = {
      president: {
        name: "رئيس الحزب",
        title: "رئيس الحزب",
        image: "/president.jpg",
        speech: {
          buttonLabel: "كلمة رئيس الحزب",
          modalTitle: "كلمة رئيس الحزب",
          personName: "",
          personRole: "رئيس الحزب",
          paragraphs: [],
          note: "",
        },
      },
      viceSpeech: {
        buttonLabel: "كلمة النائب الأول",
        modalTitle: "كلمة النائب الأول",
        personName: "",
        personRole: "النائب الأول لرئيس الحزب والأمين العام",
        paragraphs: [],
        note: "",
      },
      secretaryGeneralSpeech: {
        buttonLabel: "كلمة نائب رئيس الحزب",
        modalTitle: "كلمة نائب رئيس الحزب",
        personName: "",
        personRole: "نائب رئيس الحزب",
        paragraphs: [],
        note: "",
      },
      secretariats: {
        buttonLabel: "الأمانات المركزية",
        modalTitle: "الأمانات المركزية",
        items: [],
      },
      leadership: {
        title: "قيادة الحزب",
        leaders: [],
      },
    };

    if (panelWithLeaders && panelWithLeaders.leaders.length > 0) {
      const headLeader =
        panelWithLeaders.leaders.find((l) => l.is_head) ||
        panelWithLeaders.leaders[0];
      const otherLeaders = panelWithLeaders.leaders.filter((l) => !l.is_head);

      const findSpeech = (candidateSlugs, fallbackKeywords, defaultTitle, defaultRole) => {
        let item = infoItems.find((i) => i.kind === "leadership_content" && candidateSlugs.includes(i.slug));
        if (!item) {
          item = infoItems.find((i) => i.kind === "leadership_content" && candidateSlugs.some((s) => i.slug?.includes(s)));
        }
        if (!item && fallbackKeywords.length > 0) {
          item = infoItems.find(
            (i) =>
              i.kind === "leadership_content" &&
              fallbackKeywords.some(
                (kw) =>
                  i.person_role_title?.includes(kw) ||
                  i.button_label?.includes(kw) ||
                  i.title?.includes(kw)
              )
          );
        }
        return {
          buttonLabel: item?.button_label || defaultTitle,
          modalTitle: item?.title || defaultTitle,
          personName: item?.person_name || headLeader.full_name,
          personRole: item?.person_role_title || defaultRole,
          paragraphs: item?.body
            ? item.body.split(/\r?\n+/).map((p) => p.trim()).filter(Boolean)
            : [],
          note: item?.source_note || "الموقع الرسمي للحزب",
        };
      };

      const secItems = centralSecs.map((s) => ({
        id: s.id,
        name: s.name_ar,
        head: s.head_name || "",
        source: s.source_note || undefined,
      }));

      const secBtnItem = infoItems.find(
        (i) =>
          i.kind === "leadership_content" &&
          (i.slug === "central-secretariats" ||
            i.slug === "secretariats" ||
            i.button_label?.includes("الأمانات المركزية"))
      );

      centralSecretariats = {
        president: {
          name: headLeader.full_name,
          title: headLeader.role_title || "رئيس الحزب",
          image: headLeader.photo_url || "/president.jpg",
          speech: findSpeech(
            ["speech-president", "speech"],
            ["رئيس الحزب", "الرئيس"],
            "كلمة رئيس الحزب",
            headLeader.role_title || "رئيس الحزب",
          ),
        },
        viceSpeech: findSpeech(
          ["speech-vice-president", "speech-vice"],
          ["النائب الأول", "نائب أول"],
          "كلمة النائب الأول",
          "النائب الأول لرئيس الحزب والأمين العام",
        ),
        secretaryGeneralSpeech: findSpeech(
          ["speech-secretary-general", "speech-general"],
          ["الأمين العام", "أمين عام", "نائب رئيس الحزب"],
          "كلمة نائب رئيس الحزب",
          "نائب رئيس الحزب",
        ),
        secretariats: {
          buttonLabel: secBtnItem?.button_label || "الأمانات المركزية",
          modalTitle: secBtnItem?.title || "الأمانات المركزية",
          footnote: secBtnItem?.source_note || undefined,
          items: secItems,
        },
        buttonsContents: infoItems.filter(
          (i) => i.kind === "leadership_content" && i.is_published
        ),
        leadership: {
          title: panelWithLeaders.leaders_heading || "قيادة الحزب",
          leaders: otherLeaders.map((l) => ({
            name: l.full_name,
            role: l.role_title || "",
            badge: l.badge_label || "",
          })),
        },
      };
    }

    // 3. Parliamentary Unit
    const parliamentaryData = parliamentary.map((p) => ({
      id: p.slug,
      title: p.title,
      subtitle: p.subtitle || "",
      icon: p.icon || "landmark",
      modal: {
        title: p.title,
        personName: p.head_name || null,
        personRole: p.head_role || null,
        paragraphs: p.body ? p.body.split("\n\n") : [],
        source: p.source_note || null,
      },
    }));

    // 4. Governorates & Local Secretariats
    const allNames = governoratesWithInfo.map((g) => g.name_ar);
    const peopleMap = {};

    for (const g of governoratesWithInfo) {
      if (
        g.governorate_secretariats_info &&
        g.governorate_secretariats_info.length > 0
      ) {
        peopleMap[g.name_ar] = g.governorate_secretariats_info.map((p) => ({
          name: p.full_name,
          role: p.role_title || "",
          photo: p.photo_url || undefined,
        }));
      }
    }

    const governoratesData = {
      main: allNames.slice(0, 8),
      other: allNames.slice(8),
      people: peopleMap,
      fallback: DEFAULT_GOV_FALLBACK,
    };

    // 5. Ministries & Sectors
    const entityNames = { "": "اختر الوزارة من القائمة أعلاه" };
    for (const m of ministries) {
      if (m.slug && !entityNames[m.slug]) {
        entityNames[m.slug] = m.name_ar;
      }
    }

    const requestsData = {
      ministriesTitle: "مع الحكومة والوزارات",
      requestTitle: "تقديم طلب",
      fields: DEFAULT_REQUEST_FIELDS,
      ministries: ministries.map((m) => ({
        id: m.slug,
        label: m.name_ar,
        dbId: m.id,
      })),
      sectorOptions: [
        { value: "", label: "طبي / هندسي / توظيف" },
        ...sectors.map((s) => ({
          value: s.code,
          label: s.name_ar,
          dbId: s.id,
        })),
      ],
      entityNames,
    };

    // 6. News
    const newsData = newsArticles.map((a) => ({
      id: a.id,
      title: a.title,
      meta: a.source?.name_ar || "",
      paras: a.body ? a.body.split("\n\n") : [],
      note: a.source?.name_ar || "",
      img: a.image_url || "/news1.jpg",
      link: a.source_url || "/",
      linkLabel: "التفاصيل من المصدر",
    }));

    // 7. Vision 2030
    const visionDb = infoItems.find((i) => i.slug === "vision-2030");
    const visionData = {
      eyebrow: DEFAULT_VISION_2030.eyebrow,
      title: visionDb?.title || DEFAULT_VISION_2030.title,
      intro: DEFAULT_VISION_2030.intro,
      chips: DEFAULT_VISION_2030.chips,
      buttonLabel: visionDb?.button_label || DEFAULT_VISION_2030.buttonLabel,
      stats: DEFAULT_VISION_2030.stats,
      modal: {
        title: visionDb?.title || DEFAULT_VISION_2030.modal.title,
        paras: visionDb?.body
          ? visionDb.body.split("\n\n")
          : DEFAULT_VISION_2030.modal.paras,
        note: visionDb?.source_note || DEFAULT_VISION_2030.modal.note,
        link: visionDb?.link_url || DEFAULT_VISION_2030.modal.link,
        linkLabel: visionDb?.link_label || DEFAULT_VISION_2030.modal.linkLabel,
      },
    };

    return {
      mainLinks,
      partyProgram,
      centralSecretariats,
      parliamentaryItems: parliamentaryData,
      governorates: governoratesData,
      requests: requestsData,
      news: newsData,
      vision: visionData,
    };
  } catch (error) {
    console.error("⚠️ Failed to load database home data:", error);
    return getDefaultHomeData();
  }
}

export function getDefaultHomeData() {
  return {
    mainLinks: [],
    partyProgram: { title: "برنامج الحزب", paragraphs: [], source: "" },
    centralSecretariats: {
      president: {
        name: "",
        title: "رئيس الحزب",
        image: "/president.jpg",
        speech: {
          buttonLabel: "كلمة رئيس الحزب",
          modalTitle: "كلمة رئيس الحزب",
          personName: "",
          personRole: "رئيس الحزب",
          paragraphs: [],
          note: "",
        },
      },
      viceSpeech: {
        buttonLabel: "كلمة النائب الأول",
        modalTitle: "كلمة النائب الأول",
        personName: "",
        personRole: "النائب الأول لرئيس الحزب",
        paragraphs: [],
        note: "",
      },
      secretaryGeneralSpeech: {
        buttonLabel: "كلمة نائب رئيس الحزب",
        modalTitle: "كلمة نائب رئيس الحزب",
        personName: "",
        personRole: "نائب رئيس الحزب",
        paragraphs: [],
        note: "",
      },
      secretariats: {
        buttonLabel: "الأمانات المركزية",
        modalTitle: "الأمانات المركزية",
        items: [],
      },
      leadership: { title: "قيادة الحزب", leaders: [] },
    },
    parliamentaryItems: [],
    governorates: {
      main: [],
      other: [],
      people: {},
      fallback: DEFAULT_GOV_FALLBACK,
    },
    requests: {
      ministriesTitle: "مع الحكومة والوزارات",
      requestTitle: "تقديم طلب",
      fields: DEFAULT_REQUEST_FIELDS,
      ministries: [],
      sectorOptions: [{ value: "", label: "طبي / هندسي / توظيف" }],
      entityNames: { "": "اختر الوزارة من القائمة أعلاه" },
    },
    news: [],
    vision: DEFAULT_VISION_2030,
  };
}
