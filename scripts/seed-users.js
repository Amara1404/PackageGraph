import { config } from "dotenv";
config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { getPool } from "../lib/db/postgres.js";

async function upsertUser(username, password, role) {
  if (!username || !password) {
    console.log(`skip ${role}: username/password not set in env`);
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const pool = getPool();
  await pool.query(
    `INSERT INTO app_user (username, password_hash, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role`,
    [username, hash, role]
  );
  console.log(`seeded user "${username}" (${role})`);
}

async function main() {
  await upsertUser(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD, "security_admin");
  await upsertUser(process.env.DEV_USERNAME, process.env.DEV_PASSWORD, "developer");
  const pool = getPool();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
