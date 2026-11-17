import { createApplication } from "../../../lib/services/applications.js";
import { applicationSchema } from "../../../lib/validation/application.js";

const responseStatusByCode = {
  INVALID_NATIONAL_ID: 400,
  INVALID_GOVERNORATE: 400,
  DUPLICATE: 409,
};

function logUnexpectedError(error) {
  console.error({
    name: error?.name,
    code: error?.code,
  });
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "VALIDATION" }, { status: 400 });
  }

  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "VALIDATION",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip =
    (forwardedFor && forwardedFor.split(",")[0].trim()) ||
    request.headers.get("x-real-ip") ||
    null;

  try {
    const result = await createApplication(parsed.data, ip);

    if (result.ok) {
      return Response.json(
        { application_no: result.applicationNo },
        { status: 201 },
      );
    }

    const status = responseStatusByCode[result.code];
    if (status === undefined) {
      const error = new Error();
      error.name = "UnexpectedApplicationResult";
      error.code = "UNEXPECTED_APPLICATION_RESULT";
      throw error;
    }

    return Response.json({ error: result.code }, { status });
  } catch (error) {
    logUnexpectedError(error);
    return Response.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
