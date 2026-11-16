
import prisma from "@/lib/db";

export async function GET() {
    try {
        const governorates = await prisma.governorates.findMany({
            orderBy: {
                sort_order: "asc",
            },
        });

        return Response.json({
            success: true,
            count: governorates.length,
            data: governorates,
        });
    } catch (error) {
        console.error("Database Error:", error);

        return Response.json(
            {
                success: false,
                message: "Failed to fetch governorates",
            },
            { status: 500 }
        );
    }
}
