import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, KanbanSquare, FolderKanban, Users, FileText, UserCircle, LogOut, Moon, Sun, Menu, X, Rocket, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useAuth, isStaff } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { Avatar, IconButton, Logo } from "./ui";

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [dark, toggleTheme] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setMobileOpen(false), [location.pathname]);
  if (!user) return null;

  const staff = isStaff(user);
  const onboarding = !staff && user.status !== "APPROVED";
  const nav = onboarding
    ? [{ to: "/onboarding", label: "Onboarding", icon: Rocket }, { to: "/profile", label: "My profile", icon: UserCircle }]
    : [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/tasks", label: staff ? "Work board" : "My work", icon: KanbanSquare },
        ...(staff
          ? [{ to: "/projects", label: "Projects", icon: FolderKanban }, { to: "/people", label: "People", icon: Users }]
          : [{ to: "/documents", label: "My documents", icon: FileText }]),
        { to: "/profile", label: "My profile", icon: UserCircle },
      ];

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5"><Logo /></div>
      <nav className="mt-2 flex-1 space-y-1 px-3">
        <p className="px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted/70">Workspace</p>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"}
            className={({ isActive }) => clsx("group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              isActive ? "text-fg" : "text-muted hover:text-fg")}>
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-surface shadow-soft border border-border"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                <n.icon className={clsx("relative h-[18px] w-[18px] transition", isActive ? "text-brand" : "group-hover:scale-110")} />
                <span className="relative">{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {staff && (
        <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-4 text-white shadow-glow">
          <ShieldCheck className="mb-2 h-5 w-5 opacity-90" />
          <p className="text-sm font-bold">{ROLE_LABEL[user.role]} access</p>
          <p className="mt-0.5 text-xs text-white/80">
            {user.role === "SUPER_ADMIN" ? "Manage admins, people and all work." : "Review people and assign work."}
          </p>
        </div>
      )}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <button onClick={() => navigate("/profile")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Avatar user={user} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="truncate font-mono text-[11px] text-muted">{user.employeeId}</p>
            </div>
          </button>
          <IconButton icon={dark ? Sun : Moon} label="Toggle theme" onClick={toggleTheme} />
          <IconButton icon={LogOut} label="Sign out" onClick={logout} className="hover:!text-danger" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border bg-surface-2/40 backdrop-blur lg:block">{sidebar}</aside>

      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-x-0 border-t-0 px-4 lg:hidden">
        <Logo />
        <IconButton icon={Menu} label="Open menu" onClick={() => setMobileOpen(true)} />
      </header>
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-[280px] bg-bg border-r border-border"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: "spring", stiffness: 340, damping: 34 }}>
              <IconButton icon={X} label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3.5 z-10" />
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="lg:pl-[264px]">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname.split("/")[1]}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: "easeOut" }}
            className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-9">
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
