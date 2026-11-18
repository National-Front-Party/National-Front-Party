import { prisma } from "../../../../lib/db.js";

export async function GET() {
  try {
    const program = await prisma.party_programs.findFirst({
      where: { is_published: true },
      orderBy: { id: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        source_note: true,
      },
    });

    if (!program) {
      return Response.json(
        {
          party_program: {
            title: "برنامج الحزب",
            body: "نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده.",
            paragraphs: ["نص برنامج الحزب ومحاوره يضاف هنا بعد اعتماده."],
            source_note: "الموقع الرسمي للحزب",
          },
        },
        { status: 200 },
      );
    }

    return Response.json(
      {
        party_program: {
          ...program,
          paragraphs: program.body ? program.body.split(/\r?\n+/) : [],
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return Response.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
