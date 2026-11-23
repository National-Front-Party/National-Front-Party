import { createHash, randomBytes } from "node:crypto";
import { createRateLimiter } from "../rate-limit.js";
import { hasPermission, ROLES } from "../auth/permissions.js";
import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword,
} from "../auth/password.js";

const loginWindowMs = 15 * 60 * 1000;
const loginIpLimiter = createRateLimiter({ limit: 10, windowMs: loginWindowMs });
const loginEmailLimiter = createRateLimiter({ limit: 5, windowMs: loginWindowMs });
const dummyHashPromise = hashPassword(
  `no-account-${randomBytes(32).toString("base64url")}`,
);

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isKnownRole(role) {
  return ROLES.includes(role);
}

function rateLimitResult(email, ip) {
  const byIp = loginIpLimiter(ip || "unknown");
  const emailKey = createHash("sha256").update(email).digest("hex");
  const byEmail = loginEmailLimiter(emailKey);
  if (!byIp.allowed || !byEmail.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      retryAfterSeconds: Math.max(
        byIp.retryAfterSeconds,
        byEmail.retryAfterSeconds,
      ),
    };
  }
  return null;
}

export async function login(email, password, ip, db, now = Date.now) {
  const normalizedEmail = normalizeEmail(email);
  const limited = rateLimitResult(normalizedEmail, ip);
  if (limited) return limited;

  const database = db ?? (await import("../db.js")).prisma;

  const user = await database.staff_users.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      role: true,
      is_active: true,
      password_hash: true,
      must_change_password: true,
      locked_until: true,
    },
  });

  const eligibleAccount =
    user?.is_active === true &&
    isKnownRole(user.role) &&
    typeof user.password_hash === "string";
  const hashToVerify = eligibleAccount
    ? user.password_hash
    : await dummyHashPromise;
  const passwordMatches = await verifyPassword(password, hashToVerify);

  if (!eligibleAccount) return { ok: false, code: "INVALID_CREDENTIALS" };

  const currentTime = now();
  const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
  if (lockedUntil && lockedUntil.getTime() > currentTime && passwordMatches) {
    return {
      ok: false,
      code: "ACCOUNT_LOCKED",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((lockedUntil.getTime() - currentTime) / 1000),
      ),
    };
  }

  if (!passwordMatches) {
    const updated = await database.$queryRaw`
      UPDATE "staff_users"
      SET "failed_login_count" = CASE
            WHEN "failed_login_count" + 1 >= 5 THEN 0
            ELSE "failed_login_count" + 1
          END,
          "locked_until" = CASE
            WHEN "failed_login_count" + 1 >= 5
              THEN clock_timestamp() + INTERVAL ' minutes'
            ELSE "locked_until"
          END
      WHERE "id" = ${user.id}
        AND "is_active" = true
        AND "failed_login_count" < 5
        AND ("locked_until" IS NULL OR "locked_until" <= ${new Date(currentTime)})
      RETURNING "failed_login_count", "locked_until"
    `;

    if (updated.length === 0) {
      return { ok: false, code: "INVALID_CREDENTIALS" };
    }

    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  const updated = await database.staff_users.updateMany({
    where: {
      id: user.id,
      is_active: true,
      failed_login_count: { lt: 5 },
      OR: [
        { locked_until: null },
        { locked_until: { lte: new Date(currentTime) } },
      ],
    },
    data: {
      failed_login_count: 0,
      locked_until: null,
      last_login_at: new Date(currentTime),
    },
  });
  if (updated.count !== 1) {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  return {
    ok: true,
    staffId: user.id,
    mustChangePassword: user.must_change_password,
  };
}

export async function changePassword(
  staffId,
  currentPassword,
  newPassword,
  db,
) {
  const database = db ?? (await import("../db.js")).prisma;
  const user = await database.staff_users.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      is_active: true,
      password_hash: true,
    },
  });

  if (!user || user.is_active !== true || !user.password_hash) {
    return { ok: false, code: "UNAUTHENTICATED" };
  }

  if (!(await verifyPassword(currentPassword, user.password_hash))) {
    return { ok: false, code: "INVALID_CURRENT_PASSWORD" };
  }

  const strength = validatePasswordStrength(newPassword);
  if (!strength.valid) {
    return { ok: false, code: "WEAK_PASSWORD", errors: strength.errors };
  }

  if (await verifyPassword(newPassword, user.password_hash)) {
    return { ok: false, code: "PASSWORD_NOT_CHANGED" };
  }

  const passwordHash = await hashPassword(newPassword);
  const updated = await database.staff_users.updateMany({
    where: { id: staffId, is_active: true },
    data: { password_hash: passwordHash, must_change_password: false },
  });

  if (updated.count !== 1) return { ok: false, code: "UNAUTHENTICATED" };
  return { ok: true };
}

export function roleHasPermission(role, permission) {
  return hasPermission(role, permission);
}
