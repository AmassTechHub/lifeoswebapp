/**
 * Wipes ALL data from the database so the app starts completely fresh — no
 * users, no courses, no tasks, nothing. Use this on your dev/test database to
 * verify the brand-new-user experience.
 *
 * The schema itself is left intact (this is NOT a migration). Every user-owned
 * record is removed via the User cascade; standalone auth verification rows are
 * cleared separately.
 *
 * Usage:
 *   node scripts/reset-db.mjs --yes
 *   npm run db:reset -- --yes
 *
 * The --yes flag (or RESET_DB_CONFIRM=yes) is REQUIRED so this can never run by
 * accident. Without it the script prints what it would do and exits.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const confirmed =
  process.argv.includes("--yes") || process.env.RESET_DB_CONFIRM === "yes";

async function main() {
  const userCount = await prisma.user.count();

  if (!confirmed) {
    console.log("");
    console.log("⚠️  This will PERMANENTLY DELETE all data in the database.");
    console.log(`   Current accounts: ${userCount}`);
    console.log("");
    console.log("   Re-run with --yes to actually wipe it:");
    console.log("     npm run db:reset -- --yes");
    console.log("");
    return;
  }

  console.log(`Wiping database (${userCount} account(s))...`);

  // Deleting users cascades to every user-owned table (sessions, accounts,
  // courses, tasks, goals, finance, etc.) via onDelete: Cascade in the schema.
  await prisma.user.deleteMany({});
  // Verification rows (email/reset tokens) are not tied to a user.
  await prisma.verification.deleteMany({});

  console.log("✅ Database is empty. Every new sign-up now starts fresh.");
}

main()
  .catch((err) => {
    console.error("Reset failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
