import { getActiveGovernorates } from "../../../lib/services/governorates.js";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

export async function GET() {
  try {
    const governorates = await getActiveGovernorates();
    return Response.json({ governorates }, { headers: cacheHeaders });
  } catch (error) {
    console.error({
      name: error?.name,
      code: error?.code,
    });
    return Response.json(
      { error: "SERVER_ERROR" },
      { status: 500, headers: cacheHeaders },
    );
  }
}
