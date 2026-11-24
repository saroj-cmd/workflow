import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import { Loader2, X, UploadCloud, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useAuthedFile } from "@/lib/hooks";
import { initials } from "@/lib/format";

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: LucideIcon; iconRight?: LucideIcon;
}
const variants: Record<BtnVariant, string> = {
  primary: "text-white bg-gradient-to-b from-brand to-[rgb(var(--brand)/0.85)] shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_6px_16px_-6px_rgb(var(--brand)/0.7)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_24px_-8px_rgb(var(--brand)/0.8)] hover:brightness-110",
  secondary: "bg-surface text-fg border border-border hover:bg-surface-2 hover:border-muted/30 shadow-sm",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "text-white bg-danger hover:brightness-110 shadow-[0_6px_16px_-6px_rgb(var(--danger)/0.7)]",
  success: "text-white bg-success hover:brightness-110 shadow-[0_6px_16px_-6px_rgb(var(--success)/0.7)]",
};
const sizes = { sm: "h-8 px-3 text-xs gap-1.5 rounded-lg", md: "h-10 px-4 text-sm gap-2 rounded-xl", lg: "h-12 px-6 text-[15px] gap-2 rounded-xl" };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = "primary", size = "md", loading, icon: Icon, iconRight: IconR, className, children, disabled, ...rest }, ref
) {
  return (
    <button ref={ref} disabled={disabled || loading}
      className={clsx("relative inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none", variants[variant], sizes[size], className)}
      {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
      {IconR && !loading && <IconR className="h-4 w-4" />}
    </button>
  );
});

/* ---------- Form fields ---------- */
interface FieldProps { label?: string; hint?: string; error?: string; icon?: LucideIcon }
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input(
  { label, hint, error, icon: Icon, className, id, ...rest }, ref
) {
  const fid = id ?? rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="label">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />}
        <input ref={ref} id={fid} className={clsx("input", Icon && "pl-10", error && "border-danger focus:border-danger focus:ring-danger/15")} {...rest} />
      </div>
      <FieldMsg hint={hint} error={error} />
    </div>
  );
});
export function Textarea({ label, hint, error, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  const fid = id ?? rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="label">{label}</label>}
      <textarea id={fid} className={clsx("input h-auto min-h-[96px] py-3 resize-y leading-relaxed", error && "border-danger")} {...rest} />
      <FieldMsg hint={hint} error={error} />
    </div>
  );
}
export function Select({ label, hint, error, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  const fid = id ?? rest.name;
  return (
    <div className={className}>
      {label && <label htmlFor={fid} className="label">{label}</label>}
      <select id={fid} className={clsx("input appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9 cursor-pointer", error && "border-danger")}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238c8faf' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` }}
        {...rest}>{children}</select>
      <FieldMsg hint={hint} error={error} />
    </div>
  );
}
function FieldMsg({ hint, error }: { hint?: string; error?: string }) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {error ? (
        <motion.p key="e" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 text-xs font-medium text-danger">{error}</motion.p>
      ) : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </AnimatePresence>
  );
}

/* ---------- Badge ---------- */
type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted ring-border",
  brand: "bg-brand/10 text-brand ring-brand/20",
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/25",
  danger: "bg-danger/10 text-danger ring-danger/20",
  info: "bg-info/10 text-info ring-info/20",
};
export function Badge({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------- Avatar ---------- */
const avatarColors = ["from-indigo-500 to-violet-500", "from-fuchsia-500 to-pink-500", "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500", "from-sky-500 to-cyan-500", "from-rose-500 to-red-500"];
export function Avatar({ user, size = 36, ring, version }: { user?: { id: string; name: string; hasPhoto?: boolean } | null; size?: number; ring?: boolean; version?: number }) {
  const url = useAuthedFile(user?.hasPhoto ? `/users/${user.id}/photo${version ? `?v=${version}` : ""}` : null);
  const style = { width: size, height: size, fontSize: size * 0.38 };
  const cls = clsx("relative shrink-0 rounded-full overflow-hidden", ring && "ring-2 ring-surface");
  if (!user) return <div className={clsx(cls, "border border-dashed border-muted/50 bg-surface-2")} style={style} />;
  if (url) return <img src={url} alt={user.name} className={clsx(cls, "object-cover")} style={style} />;
  const color = avatarColors[[...user.id].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  return (
    <div className={clsx(cls, "grid place-items-center bg-gradient-to-br font-bold text-white", color)} style={style} title={user.name}>
      {initials(user.name)}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, description, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-[rgb(9_10_20/0.5)] backdrop-blur-sm" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal aria-label={title}
            className="card relative w-full max-h-[90vh] overflow-hidden flex flex-col shadow-lift" style={{ maxWidth: width }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}>
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <IconButton icon={X} label="Close" onClick={onClose} />
            </div>
            <div className="overflow-y-auto px-6 pb-6">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-2/50 px-6 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, children, width = 680 }: { open: boolean; onClose: () => void; children: ReactNode; width?: number }) {
  useEscape(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div className="absolute inset-0 bg-[rgb(9_10_20/0.4)] backdrop-blur-[2px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside className="absolute right-0 top-0 h-full w-full bg-surface border-l border-border shadow-lift overflow-y-auto"
            style={{ maxWidth: width }}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
            {children}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

function useEscape(active: boolean, fn: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && fn();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [active, fn]);
}

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button aria-label={label} title={label} className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg active:scale-95", className)} {...rest}>
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

/* ---------- Misc ---------- */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("relative overflow-hidden rounded-xl bg-surface-2", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center px-6 py-14 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-2xl bg-brand/30 blur-xl" />
        <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        {eyebrow && <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
        <h1 className="text-[28px] font-extrabold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </motion.div>
      {actions && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-wrap gap-2">{actions}</motion.div>}
    </div>
  );
}

export function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 20 });
  const rounded = useTransform(spring, (v) => Math.round(v).toLocaleString());
  useEffect(() => { mv.set(value); }, [mv, value]);
  return <motion.span>{rounded}</motion.span>;
}

export function ProgressRing({ value, size = 44, stroke = 5 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--border))" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(1, value)) }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      <defs><linearGradient id="ringGrad"><stop offset="0" stopColor="rgb(var(--brand))" /><stop offset="1" stopColor="rgb(var(--brand-2))" /></linearGradient></defs>
    </svg>
  );
}

export function Dropzone({ onFile, accept, label = "Drop a file here or click to browse", hint, disabled }: {
  onFile: (f: File) => void; accept?: string; label?: string; hint?: string; disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <motion.button type="button" disabled={disabled}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      animate={{ scale: over ? 1.015 : 1 }}
      className={clsx("group relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors",
        over ? "border-brand bg-brand/5" : "border-border hover:border-brand/50 hover:bg-surface-2/60")}>
      <div className={clsx("grid h-12 w-12 place-items-center rounded-2xl transition-all", over ? "bg-brand text-white scale-110" : "bg-brand/10 text-brand group-hover:scale-105")}>
        <UploadCloud className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold">{label}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </motion.button>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 place-items-center rounded-[11px] bg-gradient-to-br from-brand to-brand-2 shadow-glow">
        <svg viewBox="0 0 32 32" className="h-6 w-6"><path d="M7 11l4.2 10 4.8-7.5 4.8 7.5L25 11" stroke="white" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {!compact && <span className="text-[17px] font-extrabold tracking-tight">Workflow</span>}
    </div>
  );
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } } },
};
export { animate };
