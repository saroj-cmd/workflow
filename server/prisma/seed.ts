import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";
import { nextEmployeeId } from "../src/lib/ids.js";
import { supabase, BUCKET } from "../src/lib/storage.js";

// 1. Creates the first super admin from .env (safe to run again).
const email = (process.env.SUPERADMIN_EMAIL || "superadmin@example.com").toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD || "ChangeMe@123";

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log(`✓ Super admin already exists: ${email}`);
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
  console.log(`✓ Created super admin: ${email}`);
}

// 2. Creates the private Supabase Storage bucket for uploads (if Supabase is configured).
if (supabase) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) {
    console.log(`✓ Storage bucket "${BUCKET}" exists${data.public ? " — WARNING: it is PUBLIC, make it private in Supabase" : " (private)"}`);
  } else {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
    if (error) throw new Error(`Couldn't create bucket "${BUCKET}": ${error.message}`);
    console.log(`✓ Created private storage bucket "${BUCKET}"`);
  }
} else {
  console.log("• Supabase not configured — uploads will be stored on local disk (server/uploads)");
}
await prisma.$disconnect();
