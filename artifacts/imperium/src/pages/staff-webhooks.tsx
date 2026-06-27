import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetStaffMe, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";

const ALL_EVENTS = [
  { id: "ticket.created", label: "Ticket Created" },
  { id: "ticket.status_changed", label: "Status Changed" },
  { id: "ticket.reply_added", label: "Reply Added" },
  { id: "ticket.note_added", label: "Note Added" },
  { id: "ticket.assigned", label: "Ticket Assigned" },
  { id: "ticket.deleted", label: "Ticket Deleted" },
];

interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  createdAt: string;
}

function StaffHeader() {
  const { data: me } = useGetStaffMe();
  const logout = useStaffLogout();
  const queryClient = useQueryClient();
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0B0F]/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/" className="text-primary font-black tracking-widest text-lg">IMPERIUM</a>
          <span className="text-white/20">|</span>
          <span className="text-white/40 text-sm">Staff Portal</span>
          <a href="/" className="text-white/25 text-xs hover:text-primary transition-colors hidden sm:flex items-center gap-1">← Site</a>
        </div>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {[
            { href: "/staff/dashboard", label: "Dashboard" },
            { href: "/staff/tickets", label: "Tickets" },
            { href: "/staff/members", label: "Team" },
            { href: "/staff/logs", label: "Logs" },
            { href: "/staff/cms", label: "Site Content" },
            { href: "/staff/webhooks", label: "Webhooks" },
          ].map((l) => (
            <a key={l.href} href={l.href} className={`transition-colors ${location.pathname === l.href ? "text-primary" : "text-white/60 hover:text-primary"}`}>{l.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm hidden sm:block">
            <span className="text-primary capitalize">{me?.role}</span> — {me?.username}
          </span>
          <Button variant="outline" size="sm" onClick={() => logout.mutate(undefined, { onSuccess: () => { queryClient.clear(); window.location.href = "/staff"; } })} className="border-white/10 text-white/60 text-xs">
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function useWebhooks() {
  return useQuery<Webhook[]>({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load webhooks");
      return res.json();
    },
  });
}

function CreateWebhookForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, events: selectedEvents, secret: secret || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create webhook");
      }
      return res.json();
    },
    onSuccess: () => {
      setName(""); setUrl(""); setSecret(""); setSelectedEvents([]);
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleEvent = (id: string) =>
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);

  return (
    <div className="bg-white/3 border border-white/10 rounded-xl p-6 space-y-5">
      <h3 className="text-white font-bold text-base">Create Webhook</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs uppercase tracking-wider">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Discord Notifications"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
        </div>
        <div className="space-y-1.5">
          <label className="text-white/50 text-xs uppercase tracking-wider">URL</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/25" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs uppercase tracking-wider">Signing Secret <span className="text-white/25">(optional)</span></label>
        <Input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Used for HMAC-SHA256 signature verification"
          className="bg-white/5 border-white/10 text-white placeholder:text-white/25" type="password" />
      </div>
      <div className="space-y-2">
        <label className="text-white/50 text-xs uppercase tracking-wider">Events to Subscribe</label>
        <div className="flex flex-wrap gap-2">
          {ALL_EVENTS.map((ev) => (
            <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${selectedEvents.includes(ev.id) ? "bg-primary/15 border-primary/50 text-primary" : "border-white/10 text-white/40 hover:text-white hover:border-white/25"}`}>
              {ev.label}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !name.trim() || !url.trim() || selectedEvents.length === 0}
        className="bg-primary text-primary-foreground hover:bg-primary/90">
        {mutation.isPending ? "Creating..." : "Create Webhook"}
      </Button>
    </div>
  );
}

function WebhookCard({ webhook, onRefresh }: { webhook: Webhook; onRefresh: () => void }) {
  const [testResult, setTestResult] = useState<{ success: boolean; status?: number; error?: string } | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks/${webhook.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !webhook.active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => onRefresh(),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks/${webhook.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => onRefresh(),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks/${webhook.id}/test`, {
        method: "POST",
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: (data) => setTestResult(data),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white/3 border rounded-xl p-5 space-y-4 ${webhook.active ? "border-white/10" : "border-white/5 opacity-60"}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold">{webhook.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${webhook.active ? "bg-green-500/15 text-green-400 border-green-500/30" : "bg-gray-500/15 text-gray-400 border-gray-500/30"}`}>
              {webhook.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-white/40 text-xs font-mono break-all">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}
            className="border-white/10 text-white/50 hover:text-white text-xs">
            {testMutation.isPending ? "Sending..." : "Test"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate()} disabled={toggleMutation.isPending}
            className={`text-xs border-white/10 ${webhook.active ? "text-yellow-400 hover:bg-yellow-500/10" : "text-green-400 hover:bg-green-500/10"}`}>
            {webhook.active ? "Disable" : "Enable"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => { if (confirm("Delete this webhook?")) deleteMutation.mutate(); }}
            disabled={deleteMutation.isPending}
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
            Delete
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {webhook.events.map((ev) => (
          <span key={ev} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary/70 border border-primary/20">
            {ev}
          </span>
        ))}
      </div>

      {webhook.secret && (
        <p className="text-white/25 text-xs">🔒 Signed with secret</p>
      )}

      <AnimatePresence>
        {testResult && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className={`text-xs rounded-lg px-3 py-2 border ${testResult.success ? "bg-green-500/10 border-green-500/25 text-green-400" : "bg-red-500/10 border-red-500/25 text-red-400"}`}>
            {testResult.success ? `✓ Test delivered successfully (HTTP ${testResult.status})` : `✗ Delivery failed: ${testResult.error ?? `HTTP ${testResult.status}`}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WebhooksContent() {
  const queryClient = useQueryClient();
  const { data: me } = useGetStaffMe();
  const { data: webhooks, isLoading } = useWebhooks();
  const isOwner = me?.role === "owner" || me?.role === "developer";
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["webhooks"] });

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Webhooks</h1>
        <p className="text-white/40 text-sm">Send real-time HTTP POST payloads to external URLs when ticket events occur.</p>
      </motion.div>

      {!isOwner && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-yellow-400 text-sm mb-6">
          Only owners can create or manage webhooks.
        </div>
      )}

      {isOwner && (
        <div className="mb-8">
          <CreateWebhookForm onCreated={refresh} />
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white/60 text-xs uppercase tracking-widest">Configured Webhooks</h2>
          <span className="text-white/30 text-xs">{webhooks?.length ?? 0} total</span>
        </div>
        {isLoading && <p className="text-white/30 text-sm py-4">Loading...</p>}
        {!isLoading && webhooks?.length === 0 && (
          <div className="text-center py-12 text-white/25 text-sm border border-white/5 rounded-xl">
            No webhooks configured yet.
          </div>
        )}
        {webhooks?.map((w) => (
          <WebhookCard key={w.id} webhook={w} onRefresh={refresh} />
        ))}
      </div>

      <div className="mt-10 bg-white/2 border border-white/8 rounded-xl p-6 space-y-3">
        <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Payload Format</h3>
        <pre className="text-xs text-white/50 font-mono leading-relaxed overflow-x-auto">{`{
  "event": "ticket.created",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "data": { ... ticket details }
}`}</pre>
        <p className="text-white/30 text-xs">If a signing secret is set, each request includes an <code className="text-primary/60">X-Webhook-Signature</code> header formatted as <code className="text-primary/60">sha256=&lt;hmac&gt;</code>.</p>
      </div>
    </div>
  );
}

export default function StaffWebhooks() {
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white">
        <StaffHeader />
        <WebhooksContent />
      </div>
    </StaffGuard>
  );
}
