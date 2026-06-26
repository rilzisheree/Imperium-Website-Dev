import { useState } from "react";
import { useGetStaffMe, useListStaffMembers, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";

const ROLE_OPTIONS = ["support-team", "moderator", "administrator", "head-administrator", "developer", "owner"];
const ROLE_COLORS: Record<string, string> = {
  owner: "text-primary bg-primary/10 border-primary/30",
  developer: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  "head-administrator": "text-red-400 bg-red-500/10 border-red-500/30",
  administrator: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  moderator: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "support-team": "text-green-400 bg-green-500/10 border-green-500/30",
};

function StaffNav() {
  const { data: me } = useGetStaffMe();
  const logout = useStaffLogout();
  const qc = useQueryClient();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0B0F]/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-primary font-black tracking-widest text-lg">IMPERIUM</a>
          <span className="text-white/20">|</span>
          <span className="text-white/40 text-sm">Owner Portal</span>
        </div>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {[
            { href: "/staff/dashboard", label: "Dashboard" },
            { href: "/staff/tickets", label: "Tickets" },
            { href: "/staff/members", label: "Team" },
            { href: "/staff/logs", label: "Logs" },
            { href: "/staff/cms", label: "Site Content" },
          ].map((l) => (
            <a key={l.href} href={l.href} className={`transition-colors ${location.pathname === l.href ? "text-primary" : "text-white/50 hover:text-primary"}`}>{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs hidden sm:block capitalize">{me?.role} — {me?.username}</span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate(undefined, { onSuccess: () => { qc.clear(); window.location.href = "/staff"; } })} className="border-white/10 text-white/60 text-xs">Sign Out</Button>
        </div>
      </div>
    </header>
  );
}

function MembersContent() {
  const { data: me } = useGetStaffMe();
  const { data: members, refetch } = useListStaffMembers();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showPwd, setShowPwd] = useState<number | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "moderator" });
  const [pwdForm, setPwdForm] = useState({ password: "" });
  const [error, setError] = useState("");

  const isOwner = me?.role === "owner" || me?.role === "developer";

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/staff/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => { refetch(); setShowCreate(false); setForm({ username: "", password: "", role: "moderator" }); },
    onError: (e: any) => setError(e.error ?? "Failed to create account"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/staff/members/${id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => refetch(),
  });

  const pwdMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/staff/members/${id}/password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ password }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => { setShowPwd(null); setPwdForm({ password: "" }); refetch(); },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Team Management</h1>
          <p className="text-white/40 mt-1">{members?.length ?? 0} staff accounts</p>
        </div>
        {isOwner && (
          <Button onClick={() => { setShowCreate(true); setError(""); }} className="bg-primary text-primary-foreground hover:bg-primary/90">
            + New Account
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {members?.map((member) => (
          <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-white/20" />
              <div>
                <span className="text-white font-semibold">{member.username}</span>
                {member.id === me?.id && <span className="ml-2 text-xs text-primary">(you)</span>}
                <p className="text-white/30 text-xs mt-0.5">{new Date(member.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${ROLE_COLORS[member.role] ?? "text-white/50 bg-white/5 border-white/10"}`}>
                {member.role.replace(/-/g, " ")}
              </span>
            </div>
            {isOwner && member.id !== me?.id && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setShowPwd(member.id); setPwdForm({ password: "" }); }}
                  className="border-white/10 text-white/50 text-xs hover:text-white">Reset Password</Button>
                <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete ${member.username}?`)) deleteMutation.mutate(member.id); }}
                  className="border-red-500/30 text-red-400 text-xs hover:bg-red-500/10">Delete</Button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Create Account Dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); setError(""); }}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-primary">Create Staff Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Username</Label>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="staffname" className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Strong password" className="bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Role</Label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm">
                {ROLE_OPTIONS.map((r) => <option key={r} value={r} className="bg-[#0f0f1a] capitalize">{r.replace(/-/g, " ")}</option>)}
              </select>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1 border-white/10 text-white/50">Cancel</Button>
              <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.username || !form.password}
                className="flex-1 bg-primary text-primary-foreground">
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showPwd !== null} onOpenChange={(o) => { if (!o) setShowPwd(null); }}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-sm">
          <DialogHeader><DialogTitle className="text-primary">Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">New Password</Label>
              <Input type="password" value={pwdForm.password} onChange={(e) => setPwdForm({ password: e.target.value })}
                placeholder="New password" className="bg-white/5 border-white/10 text-white" />
            </div>
            <p className="text-white/30 text-xs">This will also sign out the user's current session.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowPwd(null)} className="flex-1 border-white/10 text-white/50">Cancel</Button>
              <Button onClick={() => showPwd && pwdMutation.mutate({ id: showPwd, password: pwdForm.password })}
                disabled={pwdMutation.isPending || !pwdForm.password}
                className="flex-1 bg-primary text-primary-foreground">
                {pwdMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StaffMembers() {
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white">
        <StaffNav />
        <MembersContent />
      </div>
    </StaffGuard>
  );
}
