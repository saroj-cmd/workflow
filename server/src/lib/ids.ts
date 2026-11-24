import { prisma } from "./prisma.js";

const PREFIX = process.env.EMPLOYEE_ID_PREFIX || "EMP";

// Generates sequential IDs like EMP-2026-0001, unique per year.
export async function nextEmployeeId() {
  const year = new Date().getFullYear();
  const counter = await prisma.counter.upsert({
    where: { name: `employee-${year}` },
    create: { name: `employee-${year}`, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `${PREFIX}-${year}-${String(counter.value).padStart(4, "0")}`;
}
