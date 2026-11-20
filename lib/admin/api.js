import { getErrorMessage, DEFAULT_ERROR_MESSAGE } from "./errors.js";

export class ApiError extends Error {
  constructor({ status, code, message, issues, retryAfterSeconds }) {
    super(message || getErrorMessage(code) || DEFAULT_ERROR_MESSAGE);
    this.name = "ApiError";
    this.status = status;
    this.code = code || (status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR");
    this.issues = issues;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

let onUnauthenticatedHandler = null;
let onPasswordChangeRequiredHandler = null;

export function setApiAuthHandlers({ onUnauthenticated, onPasswordChangeRequired }) {
  if (onUnauthenticated) onUnauthenticatedHandler = onUnauthenticated;
  if (onPasswordChangeRequired) onPasswordChangeRequiredHandler = onPasswordChangeRequired;
}

export async function adminFetch(endpoint, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    skipAuthRedirect = false,
    ...restOptions
  } = options;

  const url = endpoint.startsWith("/") ? endpoint : `/api/admin/${endpoint}`;

  const fetchOptions = {
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...restOptions,
  };

  if (body !== undefined) {
    fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch {
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت",
    });
  }

  // Handle empty or JSON response
  let json = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (response.ok) {
    return json ?? { ok: true };
  }

  const code = json?.error || "";
  const retryAfterSeconds = json?.retryAfterSeconds;
  const issues = json?.issues;

  // 401 UNAUTHENTICATED
  if (response.status === 401) {
    if (!skipAuthRedirect && onUnauthenticatedHandler) {
      onUnauthenticatedHandler();
    }
    throw new ApiError({
      status: 401,
      code: code || "UNAUTHENTICATED",
      message: getErrorMessage("UNAUTHENTICATED"),
    });
  }

  // 403 PASSWORD_CHANGE_REQUIRED
  if (response.status === 403 && code === "PASSWORD_CHANGE_REQUIRED") {
    if (!skipAuthRedirect && onPasswordChangeRequiredHandler) {
      onPasswordChangeRequiredHandler();
    }
    throw new ApiError({
      status: 403,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: getErrorMessage("PASSWORD_CHANGE_REQUIRED"),
    });
  }

  // 403 FORBIDDEN
  if (response.status === 403) {
    throw new ApiError({
      status: 403,
      code: code || "FORBIDDEN",
      message: getErrorMessage("FORBIDDEN"),
    });
  }

  // 423 ACCOUNT_LOCKED or 429 RATE_LIMITED
  if (response.status === 423 || response.status === 429) {
    const errorKey = response.status === 423 ? "ACCOUNT_LOCKED" : "RATE_LIMITED";
    throw new ApiError({
      status: response.status,
      code: code || errorKey,
      message: getErrorMessage(code || errorKey),
      retryAfterSeconds: typeof retryAfterSeconds === "number" ? retryAfterSeconds : undefined,
    });
  }

  // 400 Validation or business errors
  if (response.status === 400) {
    throw new ApiError({
      status: 400,
      code: code || "VALIDATION",
      message: getErrorMessage(code || "VALIDATION"),
      issues,
    });
  }

  // 413 / 415
  if (response.status === 413) {
    throw new ApiError({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: getErrorMessage("PAYLOAD_TOO_LARGE"),
    });
  }

  if (response.status === 415) {
    throw new ApiError({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: getErrorMessage("UNSUPPORTED_MEDIA_TYPE"),
    });
  }

  // 5xx or other status
  throw new ApiError({
    status: response.status,
    code: code || "SERVER_ERROR",
    message: getErrorMessage(code || "SERVER_ERROR"),
  });
}
