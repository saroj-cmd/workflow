import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User as UserIcon, Phone, ArrowRight, Camera, CheckCircle2, FileCheck2, KanbanSquare, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useAuth } from "@/lib/auth";
import { Button, Input, Logo } from "@/components/ui";

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}
        className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Workflow · People & work, in one place</p>
      </motion.div>
      <Hero />
    </div>
  );
}

function Hero() {
  const float = (d: number) => ({ y: [0, -10, 0], transition: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: d } });
  return (
    <div className="relative hidden overflow-hidden bg-[#0b0b1a] lg:block">
      <div className="grid-bg absolute inset-0 opacity-[0.08] [--border:255_255_255]" />
      <div className="absolute -left-20 top-10 h-[420px] w-[420px] animate-float rounded-full bg-[#635bff] opacity-50 blur-[110px]" />
      <div className="absolute -bottom-24 right-0 h-[460px] w-[460px] animate-float rounded-full bg-[#d946ef] opacity-40 blur-[120px] [animation-delay:-6s]" />
      <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
        <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }}
          className="max-w-md text-[40px] font-extrabold leading-[1.1] tracking-tight text-white">
          Onboard people. <br />
          <span className="bg-gradient-to-r from-[#a5a0ff] to-[#f0abfc] bg-clip-text text-transparent">Ship the work.</span>
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/60">
          Verified employee records, secure documents and a work board your whole team actually enjoys using.
        </motion.p>

        <div className="relative mt-14 h-[300px] max-w-[520px]">
          <motion.div animate={float(0)} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1 }}
            className="absolute left-0 top-0 w-[290px] rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-400 to-pink-500" />
              <div>
                <p className="text-sm font-bold text-white">Priya Sharma</p>
                <p className="font-mono text-[11px] text-white/50">EMP-2026-0042</p>
              </div>
              <BadgeCheck className="ml-auto h-5 w-5 text-emerald-400" />
            </div>
            <div className="mt-4 space-y-2">
              {["Aadhaar card", "PAN card"].map((d) => (
                <div key={d} className="flex items-center justify-between rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-white/80">
                  <span className="flex items-center gap-2"><FileCheck2 className="h-3.5 w-3.5 text-[#a5a0ff]" />{d}</span>
                  <span className="text-emerald-400">Verified</span>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div animate={float(1.5)} className="absolute right-0 top-24 w-[250px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-white/60"><KanbanSquare className="h-3.5 w-3.5" /> OPS-128</div>
            <p className="text-sm font-semibold text-white">Prepare Q4 vendor audit report</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">In progress</span>
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full border-2 border-[#1a1a2e] bg-gradient-to-br from-emerald-400 to-teal-500" />
                <div className="h-6 w-6 rounded-full border-2 border-[#1a1a2e] bg-gradient-to-br from-indigo-400 to-violet-500" />
              </div>
            </div>
          </motion.div>
          <motion.div animate={float(3)} className="absolute bottom-0 left-16 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 backdrop-blur-xl">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-400/20"><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div>
            <div>
              <p className="text-sm font-bold text-white">Application approved</p>
              <p className="text-[11px] text-white/50">Welcome to the team 🎉</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(form.email, form.password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[30px] font-extrabold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-muted">Sign in to your workspace.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Input label="Email" type="email" icon={Mail} placeholder="you@company.com" autoComplete="email" required autoFocus
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input label="Password" type="password" icon={Lock} placeholder="••••••••" autoComplete="current-password" required
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={ArrowRight}>Sign in</Button>
      </form>
      <p className="mt-8 text-center text-sm text-muted">
        New employee? <Link to="/register" className="font-semibold text-brand hover:underline">Create your profile</Link>
      </p>
    </AuthShell>
  );
}

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const s = strength(form.password);

  function pickPhoto(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Please choose an image");
    if (f.size > 4 * 1024 * 1024) return toast.error("Photo must be under 4 MB");
    setPhoto(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your full name";
    if (form.password.length < 8) errs.password = "Use at least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append("photo", photo);
      const u = await register(fd);
      toast.success(`Your employee ID is ${u.employeeId}`, { description: "Next, upload your documents." });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-[30px] font-extrabold tracking-tight">Create your profile</h1>
      <p className="mt-1.5 text-muted">You'll get an employee ID right away.</p>
      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-border p-3 transition hover:border-brand/50 hover:bg-surface-2/50">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-2 ring-4 ring-brand/10">
            {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <Camera className="absolute inset-0 m-auto h-6 w-6 text-muted transition group-hover:scale-110 group-hover:text-brand" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{photo ? "Change photo" : "Add your photo"}</p>
            <p className="text-xs text-muted">A clear, front-facing photo. JPG or PNG, up to 4 MB.</p>
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </label>
        <Input label="Full name" icon={UserIcon} placeholder="As on your ID proof" required error={errors.name}
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" icon={Mail} placeholder="you@company.com" required
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="tel" icon={Phone} placeholder="+91 98765 43210"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Input label="Password" type="password" icon={Lock} placeholder="At least 8 characters" required error={errors.password} autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {form.password && (
            <div className="mt-2 flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div key={i} className="h-1 flex-1 rounded-full bg-border overflow-hidden">
                  <motion.div className={clsx("h-full", s <= 1 ? "bg-danger" : s <= 2 ? "bg-warning" : "bg-success")}
                    initial={{ width: 0 }} animate={{ width: i < s ? "100%" : "0%" }} transition={{ duration: 0.3 }} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" size="lg" className="w-full" loading={busy} iconRight={ArrowRight}>Create profile</Button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
