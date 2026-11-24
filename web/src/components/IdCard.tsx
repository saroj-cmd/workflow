import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { BadgeCheck } from "lucide-react";
import type { User } from "@/lib/types";
import { USER_STATUS, ROLE_LABEL, date } from "@/lib/format";
import { Avatar, Badge } from "./ui";

// A tilt-on-hover digital employee ID card.
export function IdCard({ user, photoVersion }: { user: User; photoVersion?: number }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const rx = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(x, [-0.5, 0.5], [-10, 10]), { stiffness: 200, damping: 20 });
  const glareX = useTransform(x, [-0.5, 0.5], ["0%", "100%"]);
  const st = USER_STATUS[user.status];
  return (
    <div style={{ perspective: 1000 }}>
      <motion.div
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); x.set((e.clientX - r.left) / r.width - 0.5); y.set((e.clientY - r.top) / r.height - 0.5); }}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        initial={{ opacity: 0, y: 20, rotateX: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 16 }}
        className="relative w-full max-w-[400px] overflow-hidden rounded-[22px] bg-[#0f0f22] p-6 text-white shadow-lift">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#635bff] opacity-60 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-[#d946ef] opacity-40 blur-3xl" />
        <motion.div className="pointer-events-none absolute inset-0 opacity-30"
          style={{ background: useTransform(glareX, (g) => `radial-gradient(circle at ${g} 30%, rgba(255,255,255,0.35), transparent 50%)`) }} />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Employee ID</p>
            <Badge tone={st.tone} className="!bg-white/10 !text-white !ring-white/20" dot>{st.label}</Badge>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="rounded-full p-[3px] bg-gradient-to-br from-[#a5a0ff] to-[#f0abfc]">
              <div className="rounded-full bg-[#0f0f22] p-[2px]"><Avatar user={user} size={72} version={photoVersion} /></div>
            </div>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate text-xl font-extrabold tracking-tight">
                {user.name}{user.status === "APPROVED" && <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />}
              </p>
              <p className="text-sm text-white/60">{user.designation || ROLE_LABEL[user.role]}{user.department ? ` · ${user.department}` : ""}</p>
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">ID number</p>
              <p className="font-mono text-lg tracking-wider">{user.employeeId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Since</p>
              <p className="text-sm font-semibold">{date(user.createdAt)}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
