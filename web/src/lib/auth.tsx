import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, tokenStore, setUnauthorizedHandler } from "./api";
import type { User } from "./types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (form: FormData) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
  refresh: () => Promise<void>;
}
const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => { tokenStore.set(null); setUser(null); }, []);
  const refresh = useCallback(async () => {
    const { user } = await api.get<{ user: User }>("/auth/me");
    setUser(user);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) { setLoading(false); return; }
    refresh().catch(logout).finally(() => setLoading(false));
  }, [logout, refresh]);

  const finish = ({ token, user }: { token: string; user: User }) => { tokenStore.set(token); setUser(user); return user; };
  const login = async (email: string, password: string) => finish(await api.post("/auth/login", { email, password }));
  const register = async (form: FormData) => finish(await api.post("/auth/register", form));

  return <Ctx.Provider value={{ user, loading, login, register, logout, setUser, refresh }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
export const isStaff = (u?: User | null) => u?.role === "ADMIN" || u?.role === "SUPER_ADMIN";
