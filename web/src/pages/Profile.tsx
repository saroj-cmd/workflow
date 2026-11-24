import { useState, type FormEvent } from "react";
import { Save, KeyRound, Camera } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { bustFileCache } from "@/lib/hooks";
import type { User } from "@/lib/types";
import { Button, Input, PageHeader, Textarea } from "@/components/ui";
import { IdCard } from "@/components/IdCard";

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const [photoV, setPhotoV] = useState(0);
  const [form, setForm] = useState({
    name: user?.name ?? "", phone: user?.phone ?? "", department: user?.department ?? "", designation: user?.designation ?? "",
    address: user?.address ?? "", dateOfBirth: user?.dateOfBirth?.slice(0, 10) ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [busy, setBusy] = useState<string | null>(null);
  if (!user) return null;
  const locked = user.role === "EMPLOYEE" && user.status === "PENDING";

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy("profile");
    try {
      const { user: u } = await api.patch<{ user: User }>("/me", {
        ...form,
        phone: form.phone || null, department: form.department || null, designation: form.designation || null,
        address: form.address || null, dateOfBirth: form.dateOfBirth || null,
      });
      setUser(u);
      toast.success("Profile saved");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function changePw(e: FormEvent) {
    e.preventDefault();
    setBusy("pw");
    try {
      await api.post("/me/password", pw);
      setPw({ current: "", next: "" });
      toast.success("Password changed");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  }
  async function photo(f?: File) {
    if (!f) return;
    const fd = new FormData(); fd.append("photo", f);
    try {
      const { user: u } = await api.post<{ user: User }>("/me/photo", fd);
      bustFileCache(`/users/${u.id}/photo`); setPhotoV(Date.now()); setUser(u);
      toast.success("Photo updated");
    } catch (e) { toast.error((e as Error).message); }
  }
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader eyebrow="Account" title="My profile" subtitle="Keep your details up to date." />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <IdCard user={user} photoVersion={photoV} />
          <label className="inline-flex">
            <span className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold shadow-sm transition hover:bg-surface-2">
              <Camera className="h-4 w-4" /> Change photo
            </span>
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => photo(e.target.files?.[0])} />
          </label>
        </div>
        <div className="space-y-6">
          <form onSubmit={save} className="card p-6">
            <h2 className="text-lg font-bold">Personal details</h2>
            {locked && <p className="mt-1 text-sm text-warning">Your application is under review — details can't be changed right now.</p>}
            <fieldset disabled={locked} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Full name" value={form.name} onChange={set("name")} required />
              <Input label="Email" value={user.email} disabled hint="Contact an admin to change your email" />
              <Input label="Phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
              <Input label="Date of birth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
              <Input label="Department" value={form.department} onChange={set("department")} placeholder="e.g. Operations" />
              <Input label="Designation" value={form.designation} onChange={set("designation")} placeholder="e.g. Field Executive" />
              <Textarea label="Address" className="sm:col-span-2" value={form.address} onChange={set("address")} placeholder="House, street, city, PIN" />
            </fieldset>
            <div className="mt-5 flex justify-end"><Button type="submit" icon={Save} loading={busy === "profile"} disabled={locked}>Save changes</Button></div>
          </form>
          <form onSubmit={changePw} className="card p-6">
            <h2 className="text-lg font-bold">Password</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />
              <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required />
            </div>
            <div className="mt-5 flex justify-end"><Button type="submit" variant="secondary" icon={KeyRound} loading={busy === "pw"}>Update password</Button></div>
          </form>
        </div>
      </div>
    </>
  );
}
