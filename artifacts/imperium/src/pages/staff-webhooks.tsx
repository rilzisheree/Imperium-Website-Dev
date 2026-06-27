import { useState, useEffect } from "react";
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
] as const;

const EVENT_STYLES: Record<string, string> = {
  "ticket.created": "bg-indigo-500/10 text-indigo-300 border-indigo-500/25",
  "ticket.status_changed": "bg-orange-500/10 text-orange-300 border-orange-500/25",
  "ticket.reply_added": "bg-green-500/10 text-green-300 border-green-500/25",
  "ticket.note_added": "bg-yellow-500/10 text-yellow-300 border-yellow-500/25",
  "ticket.assigned": "bg-pink-500/10 text-pink-300 border-pink-500/25",
  "ticket.deleted": "bg-red-500/10 text-red-300 border-red-500/25",
};

const EVENT_LABELS: Record<string, string> = {
  "ticket.created": "Ticket Created",
  "ticket.status_changed": "Status Changed",
  "ticket.reply_added": "Reply Added",
  "ticket.note_added": "Note Added",
  "ticket.assigned": "Ticket Assigned",
  "ticket.deleted": "Ticket Deleted",
};

interface Webhook {
  id: number;
  name: string;
  url: string | null;
  discordChannelId: string | null;
  events: string[];
  secret: string | null;
  active: boolean;
  createdAt: string;
}

interface TestResult {
  success: boolean;
  status: number;
  rateLimited: boolean;
  retryAfterMs: number;
  error?: string;
  detail?: string;
}

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const LONG_BAN_THRESHOLD_MS = 5 * 60 * 1000;

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

function formatDuration(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function RateLimitBanner({ retryAfterMs, onDismiss }: { retryAfterMs: number; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(retryAfterMs);
  const isBan = retryAfterMs >= LONG_BAN_THRESHOLD_MS;

  useEffect(() => {
    if (isBan) return;
    const t = setInterval(() => {
      setRemaining((s) => {
        const next = s - 1000;
        if (next <= 0) { clearInterval(t); onDismiss(); return 0; }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isBan]);

  if (isBan) {
    return (
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Discord has banned this webhook URL ({formatDuration(retryAfterMs)} cooldown)
        </div>
        <p className="text-red-400/70 leading-relaxed">
          This happens when a webhook is hit too many times in a short period. Go to your Discord server → Server Settings → Integrations → Webhooks, delete this webhook and create a new one, then update the URL here.
        </p>
        <button onClick={onDismiss} className="text-red-400/50 hover:text-red-400 underline transition-colors">Dismiss</button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
      <svg className="w-4 h-4 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span>Rate limited — try again in <strong>{formatDuration(remaining)}</strong></span>
    </motion.div>
  );
}

type DeliveryMode = "url" | "bot";

function ModeToggle({ mode, onChange }: { mode: DeliveryMode; onChange: (m: DeliveryMode) => void }) {
  return (
    <div className="flex gap-0 rounded-lg overflow-hidden border border-white/10 w-fit">
      {([
        { value: "url", label: "Webhook URL" },
        { value: "bot", label: "Discord Bot" },
      ] as { value: DeliveryMode; label: string }[]).map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 text-xs font-semibold transition-all ${
            mode === opt.value
              ? "bg-primary text-primary-foreground"
              : "bg-white/3 text-white/40 hover:text-white/70"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function CreateWebhookForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<DeliveryMode>("bot");
  const [url, setUrl] = useState("");
  const [channelId, setChannelId] = useState("");
  const [secret, setSecret] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          url: mode === "url" ? url : undefined,
          discordChannelId: mode === "bot" ? channelId : undefined,
          events: selectedEvents,
          secret: mode === "url" ? (secret || undefined) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create webhook");
      }
      return res.json();
    },
    onSuccess: () => {
      setName(""); setUrl(""); setChannelId(""); setSecret(""); setSelectedEvents([]);
      setError("");
      onCreated();
    },
    onError: (err: Error) => setError(err.message),
  });

  const toggleEvent = (id: string) =>
    setSelectedEvents((prev) => prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]);

  const isValid = name.trim() && selectedEvents.length > 0 &&
    (mode === "url" ? url.trim() : channelId.trim());

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-white/3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">New Webhook</span>
        </div>
        <svg className={`w-4 h-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 pt-5 space-y-5 border-t border-white/5 bg-white/[0.01]">
              {/* Mode + Name row */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5 flex-1 min-w-[180px]">
                  <label className="text-white/40 text-xs uppercase tracking-widest">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff Notifications"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/40" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/40 text-xs uppercase tracking-widest">Delivery Mode</label>
                  <ModeToggle mode={mode} onChange={setMode} />
                </div>
              </div>

              {/* URL or Channel ID */}
              <AnimatePresence mode="wait">
                {mode === "bot" ? (
                  <motion.div key="bot" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-1.5">
                    <label className="text-white/40 text-xs uppercase tracking-widest">Discord Channel ID</label>
                    <Input value={channelId} onChange={(e) => setChannelId(e.target.value)}
                      placeholder="1234567890123456789"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/40 font-mono" />
                    <p className="text-white/25 text-xs">Right-click a channel in Discord → Copy Channel ID. Your bot must be in the server with Send Messages permission in that channel.</p>
                  </motion.div>
                ) : (
                  <motion.div key="url" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-white/40 text-xs uppercase tracking-widest">Webhook URL</label>
                      <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/40" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-white/40 text-xs uppercase tracking-widest">
                        Signing Secret <span className="text-white/20 normal-case tracking-normal">(optional — not needed for Discord)</span>
                      </label>
                      <Input value={secret} onChange={(e) => setSecret(e.target.value)}
                        placeholder="HMAC-SHA256 key"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-primary/40" type="password" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Events */}
              <div className="space-y-2">
                <label className="text-white/40 text-xs uppercase tracking-widest">Events</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_EVENTS.map((ev) => {
                    const active = selectedEvents.includes(ev.id);
                    return (
                      <button key={ev.id} type="button" onClick={() => toggleEvent(ev.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border font-medium transition-all ${
                          active ? EVENT_STYLES[ev.id] : "border-white/8 text-white/35 hover:text-white/70 hover:border-white/20"
                        }`}>
                        {ev.label}
                      </button>
                    );
                  })}
                </div>
                {selectedEvents.length === 0 && (
                  <p className="text-white/25 text-xs">Select at least one event to subscribe to.</p>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-white/25 text-xs">
                  {selectedEvents.length > 0 ? `${selectedEvents.length} event${selectedEvents.length > 1 ? "s" : ""} selected` : "No events selected"}
                </p>
                <Button onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !isValid}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs px-5">
                  {mutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Creating...
                    </span>
                  ) : "Create Webhook"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WebhookCard({ webhook, onRefresh }: { webhook: Webhook; onRefresh: () => void }) {
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isBotMode = !!webhook.discordChannelId;
  const isDiscordWebhook = !isBotMode && !!webhook.url && /discord(?:app)?\.com\/api\/webhooks\//i.test(webhook.url);

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/staff/webhooks/${webhook.id}`, {
        method: "PATCH", credentials: "include",
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
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => onRefresh(),
  });

  const testMutation = useMutation({
    mutationFn: async (): Promise<TestResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);
      try {
        const res = await fetch(`${BASE}/api/staff/webhooks/${webhook.id}/test`, {
          method: "POST", credentials: "include", signal: controller.signal,
        });
        return await res.json();
      } finally {
        clearTimeout(timeout);
      }
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.rateLimited && data.retryAfterMs > 0) setRateLimitCountdown(data.retryAfterMs);
    },
    onError: (err: Error) => {
      setTestResult({ success: false, status: 0, rateLimited: false, retryAfterMs: 0, error: err.name === "AbortError" ? "Request timed out" : err.message });
    },
  });

  const truncate = (str: string, max = 52) =>
    str.length <= max ? str : str.slice(0, 30) + "…" + str.slice(-18);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all ${webhook.active ? "border-white/8 bg-white/[0.02]" : "border-white/4 bg-white/[0.01] opacity-55"}`}>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <span className="text-white font-semibold text-sm">{webhook.name}</span>

              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                webhook.active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-white/5 text-white/30 border-white/10"
              }`}>
                {webhook.active ? "Active" : "Inactive"}
              </span>

              {isBotMode && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/25 font-medium flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.053a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  Bot
                </span>
              )}
              {isDiscordWebhook && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/25 font-medium">Discord</span>
              )}
              {webhook.secret && (
                <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 text-white/30 border-white/10 font-medium">🔒 Signed</span>
              )}
            </div>

            {isBotMode ? (
              <p className="text-white/30 text-xs font-mono">Channel ID: {webhook.discordChannelId}</p>
            ) : (
              <p className="text-white/30 text-xs font-mono" title={webhook.url ?? ""}>{truncate(webhook.url ?? "")}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="outline"
              onClick={() => { setTestResult(null); setRateLimitCountdown(0); testMutation.mutate(); }}
              disabled={testMutation.isPending || (rateLimitCountdown > 0 && rateLimitCountdown < LONG_BAN_THRESHOLD_MS)}
              className="border-white/10 text-white/50 hover:text-white hover:border-white/25 text-xs h-7 px-3 gap-1.5">
              {testMutation.isPending ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Sending…
                </>
              ) : rateLimitCountdown > 0 && rateLimitCountdown < LONG_BAN_THRESHOLD_MS ? (
                `Wait ${formatDuration(rateLimitCountdown)}`
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Test
                </>
              )}
            </Button>

            <Button size="sm" variant="outline"
              onClick={() => toggleMutation.mutate()}
              disabled={toggleMutation.isPending}
              className={`text-xs h-7 px-3 border-white/10 transition-colors ${
                webhook.active
                  ? "text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/25"
                  : "text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/25"
              }`}>
              {webhook.active ? "Disable" : "Enable"}
            </Button>

            {!confirmDelete ? (
              <Button size="sm" variant="outline"
                onClick={() => setConfirmDelete(true)}
                className="border-white/10 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/25 text-xs h-7 px-3">
                Delete
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/15 text-xs h-7 px-2.5">
                  {deleteMutation.isPending ? "…" : "Confirm"}
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  className="border-white/10 text-white/40 text-xs h-7 px-2.5">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {webhook.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {webhook.events.map((ev) => (
              <span key={ev} className={`text-xs px-2 py-0.5 rounded border font-medium ${EVENT_STYLES[ev] ?? "bg-white/5 text-white/40 border-white/10"}`}>
                {EVENT_LABELS[ev] ?? ev}
              </span>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {rateLimitCountdown > 0 && (
          <div className="px-5 pb-4">
            <RateLimitBanner retryAfterMs={rateLimitCountdown} onDismiss={() => setRateLimitCountdown(0)} />
          </div>
        )}
        {testResult && !testResult.rateLimited && (
          <motion.div key="result"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="px-5 pb-4">
            <div className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border text-xs font-medium ${
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-red-500/10 border-red-500/25 text-red-400"
            }`}>
              {testResult.success ? (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Delivered successfully{testResult.status ? ` — HTTP ${testResult.status}` : ""}</span>
                </>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>{testResult.error ?? `Delivery failed — HTTP ${testResult.status}`}</span>
                  </div>
                  {testResult.detail && (
                    <p className="text-red-400/60 font-mono text-xs pl-5 break-all">{testResult.detail.slice(0, 200)}</p>
                  )}
                </div>
              )}
            </div>
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Webhooks</h1>
            <p className="text-white/35 text-sm">Send ticket events to Discord via your bot or a webhook URL</p>
          </div>
        </div>
      </motion.div>

      {isOwner && (
        <div className="mb-6">
          <CreateWebhookForm onCreated={refresh} />
        </div>
      )}

      {isLoading ? (
        <div className="text-white/30 text-center py-20">Loading webhooks...</div>
      ) : webhooks?.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/20 text-sm">No webhooks yet.</p>
          {isOwner && <p className="text-white/15 text-xs mt-1">Create one above to get started.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks?.map((webhook) => (
            <WebhookCard key={webhook.id} webhook={webhook} onRefresh={refresh} />
          ))}
        </div>
      )}

      {!isOwner && (
        <p className="text-white/20 text-xs text-center mt-6">Only owners can create or manage webhooks.</p>
      )}
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
