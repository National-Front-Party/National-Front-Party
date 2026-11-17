import "dotenv/config";
import pg from "pg";
import { hashPassword, validatePasswordStrength } from "../lib/auth/password.js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const fullName = process.argv[3]?.trim();
  const password = process.env.CREATE_ADMIN_PASSWORD;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName) {
    console.error("Usage: npm run create:super-admin -- <email> \"<full name>\"");
    process.exitCode = 1;
    return;
  }
  if (!password) {
    console.error("CREATE_ADMIN_PASSWORD is required in the environment.");
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required in the environment.");
    process.exitCode = 1;
    return;
  }

  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    for (const message of strength.errors) console.error(message);
    process.exitCode = 1;
    return;
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const passwordHash = await hashPassword(password);
    const result = await pool.query(
      `INSERT INTO staff_users
        (email, full_name, role, is_active, password_hash, must_change_password)
       VALUES ($1, $2, 'super_admin', true, $3, true)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, fullName, passwordHash],
    );
    if (result.rowCount !== 1) {
      console.error("A staff account with this email already exists.");
      process.exitCode = 1;
      return;
    }
    console.log("Super admin account created. Change the temporary password after first login.");
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  console.error({ name: error?.name, code: error?.code });
  process.exitCode = 1;
}
