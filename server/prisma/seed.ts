import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { nextEmployeeId } from "../src/lib/ids.js";

// Creates the first super admin from .env (idempotent).
const email = (process.env.SUPERADMIN_EMAIL || "superadmin@example.com").toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe@123";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`Super admin already exists: ${email}`);
} else {
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "SUPER_ADMIN",
      status: "APPROVED",
      designation: "Super Admin",
      employeeId: await nextEmployeeId(),
    },
  });
  console.log(`Created super admin: ${email}`);
}
await prisma.$disconnect();
