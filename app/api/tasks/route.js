export async function GET() {
  return Response.json(
    { error: "The tasks endpoint has not been implemented yet." },
    { status: 501 },
  );
}
