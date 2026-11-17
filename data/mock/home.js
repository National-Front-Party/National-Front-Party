export const mainLinks = [
  {
    id: "about",
    title: "من نحن؟",
    icon: "user",
    paragraphs: [
      "حزب الجبهة الوطنية حزب سياسي مدني ديمقراطي يحق لأي مصري الانتماء إلى عضويته دون تفرقة أو تمييز.",
      "كيان سياسي مصري يهدف إلى إحداث تغيير حقيقي في المشهد السياسي من خلال تعزيز المشاركة الشعبية الفاعلة والصادقة.",
    ],
    source: "الموقع الرسمي للحزب",
  },
  {
    id: "goals",
    title: "هدفنا؟",
    icon: "target",
    paragraphs: [
      "إعلاء قيم العدل والمساواة والحرية واحترام حقوق الإنسان.",
      "إحداث تغيير حقيقي في المشهد السياسي من خلال تعزيز المشاركة الشعبية الفاعلة والصادقة.",
      "تحقيق العدالة الاجتماعية والتنمية المستدامة.",
    ],
    source: "الموقع الرسمي للحزب",
  },
  {
    id: "vision",
    title: "رؤيتنا؟",
    icon: "eye",
    paragraphs: [
      "أن يكون الحزب بيت خبرة وطني يخدم مصلحة الوطن العليا بعيدا عن أي توجهات ضيقة أو شخصية، مستندا إلى رؤية شاملة تقوم على قيم الحرية والعدالة وسيادة القانون.",
    ],
    source: "الموقع الرسمي للحزب",
  },
  {
    id: "mission",
    title: "رسالتنا؟",
    icon: "send",
    paragraphs: [
      "بناء نموذج ديمقراطي يعزز ثقافة الحوار والتعاون بين جميع أطياف المجتمع، مع التركيز على تحقيق العدالة الاجتماعية والتنمية المستدامة.",
    ],
    source: "الموقع الرسمي للحزب",
  },
  {
    id: "why",
    title: "لماذا نحن؟",
    icon: "message",
    paragraphs: [
      "لأنه حزب مفتوح لكل مصري دون تفرقة أو تمييز.",
      "لأنه يجمع بين طاقات الشباب وخبرات الأجيال لإيجاد حلول حقيقية للتحديات التي تواجه الوطن.",
      "لأنه يؤمن بأن العمل الجماعي هو السبيل لتحقيق تطلعات الشعب المصري نحو مستقبل أفضل.",
    ],
    source: "الموقع الرسمي للحزب",
  },
];

export const programCard = {
  title: "برنامج الحزب",
};

export const centralLeaders = {
  title: "الأمانات المركزية",
  president: {
    name: "اسم رئيس الحزب",
    role: "رئيس الحزب",
    photo: null,
  },
  actions: [
    { id: "leadership", label: "قيادة الحزب" },
    { id: "secretariats", label: "الأمانات المركزية" },
    { id: "members", label: "أعضاء الحزب" },
    { id: "contact", label: "تواصل معنا" },
  ],
  leaders: [
    { id: "leader-1", name: "اسم المسؤول", role: "المسمى الوظيفي", photo: null },
    { id: "leader-2", name: "اسم المسؤول", role: "المسمى الوظيفي", photo: null },
  ],
};

export const governorates = {
  title: "أمانات المحافظات",
  items: [
    {
      id: "cairo",
      name: "محافظة القاهرة",
      officials: [
        { id: "official-1", name: "اسم المسؤول", role: "المسمى الوظيفي", photo: null },
      ],
    },
    {
      id: "giza",
      name: "محافظة الجيزة",
      officials: [
        { id: "official-2", name: "اسم المسؤول", role: "المسمى الوظيفي", photo: null },
      ],
    },
  ],
};

export const parliamentaryItems = {
  title: "الوحدة البرلمانية",
  items: [
    { id: "parliament-1", title: "عنوان العنصر", subtitle: "وصف مختصر" },
    { id: "parliament-2", title: "عنوان العنصر", subtitle: "وصف مختصر" },
    { id: "parliament-3", title: "عنوان العنصر", subtitle: "وصف مختصر" },
  ],
};

export const ministries = {
  title: "مع الحكومة والوزارات",
  items: [
    { id: "ministry-1", label: "اسم الوزارة" },
    { id: "ministry-2", label: "اسم الوزارة" },
    { id: "ministry-3", label: "اسم الوزارة" },
  ],
};

export const formSectors = {
  title: "تقديم طلب",
  options: ["قطاع أول", "قطاع ثان", "قطاع ثالث"],
};
