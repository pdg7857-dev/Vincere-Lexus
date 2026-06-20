// Seeds the two editable picklists (stages, lead sources) and the single login.
// Safe to run repeatedly: picklists upsert by name; the user is only created if
// it doesn't already exist (so re-seeding never resets your password).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_STAGES, DEFAULT_LEAD_SOURCES } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  for (const s of DEFAULT_STAGES) {
    await prisma.stage.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        order: s.order,
        isTerminal: Boolean(s.isTerminal),
        isWon: Boolean(s.isWon),
      },
    });
  }
  console.log(`✓ ${DEFAULT_STAGES.length} stages`);

  let order = 1;
  for (const name of DEFAULT_LEAD_SOURCES) {
    await prisma.leadSource.upsert({
      where: { name },
      update: {},
      create: { name, order: order++ },
    });
  }
  console.log(`✓ ${DEFAULT_LEAD_SOURCES.length} lead sources`);

  const email = (process.env.ADMIN_EMAIL || "sales@vincere.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "changeme123";
  const name = process.env.ADMIN_NAME || "Sales";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`• user ${email} already exists — left unchanged`);
  } else {
    await prisma.user.create({
      data: { email, name, passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`✓ created login ${email}`);
    console.log("  → log in, then change the password in Settings.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
