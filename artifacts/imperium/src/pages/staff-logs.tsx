import { useState } from "react";
import { useGetStaffMe, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const EVENT_STYLES: Record<string, string> = {
  login: "text-green-400 bg-green-500/10 border-green-500/30",
  logout: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  failed_login: "text-red-400 bg-red-500/10 border-red-500/30",
  session_conflict: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  forced_out: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  account_created: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const EVENT_ICONS: Record<string, string> = {
  login: "→",
  logout: "←",
  failed_login: "✕",
  session_conflict: "⚠",
  forced_out: "!",
  account_created: "+",
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
          ].map((l) => (
            <a key={l.href} href={l.href} className={`transition-colors ${window.location.pathname === l.href ? "text-primary" : "text-white/50 hover:text-primary"}`}>{l.label}</a>
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

function LogsContent() {
  const [page, setPage] = useState(1);
  const base = import.meta.env.BASE_URL;

  const { data, isLoading } = useQuery({
    queryKey: ["login-logs", page],
    queryFn: async () => {
      const res = await fetch(`${base}api/staff/login-logs?page=${page}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json() as Promise<{ logs: any[]; total: number; page: number; totalPages: number }>;
    },
  });

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Login Activity Logs</h1>
        <p className="text-white/40 mt-1">{data?.total ?? 0} total events</p>
      </div>

      {isLoading ? (
        <div className="text-white/30 text-center py-20">Loading logs...</div>
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-white/3 border border-white/5 rounded-xl p-4 flex items-start gap-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 w-8 text-center ${EVENT_STYLES[log.eventType] ?? "text-white/50 bg-white/5 border-white/10"}`}>
                {EVENT_ICONS[log.eventType] ?? "?"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-white font-semibold text-sm">{log.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${EVENT_STYLES[log.eventType] ?? "text-white/40 bg-white/5 border-white/10"}`}>
                    {log.eventType.replace(/_/g, " ")}
                  </span>
                  {log.note && <span className="text-white/40 text-xs">{log.note}</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-white/25 flex-wrap">
                  <span>{new Date(log.createdAt).toLocaleString()}</span>
                  {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                  {log.userAgent && <span className="truncate max-w-xs">{log.userAgent.slice(0, 60)}{log.userAgent.length > 60 ? "..." : ""}</span>}
                </div>
              </div>
            </motion.div>
          ))}
          {data?.logs.length === 0 && (
            <div className="text-center py-20 text-white/30">No activity logs yet.</div>
          )}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-white/10 text-white/60">Previous</Button>
          <span className="text-white/40 text-sm">Page {page} of {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="border-white/10 text-white/60">Next</Button>
        </div>
      )}
    </div>
  );
}

export default function StaffLogs() {
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white">
        <StaffNav />
        <LogsContent />
      </div>
    </StaffGuard>
  );
}
