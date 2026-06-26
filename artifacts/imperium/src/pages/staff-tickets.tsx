import { useState } from "react";
import { useGetStaffMe, useListTickets } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStaffLogout } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "awaiting-user": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "under-investigation": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  accepted: "bg-green-500/20 text-green-300 border-green-500/30",
  denied: "bg-red-500/20 text-red-300 border-red-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const ticketTypes = ["", "report-user", "appeal-ban", "appeal-character-death", "permadeath-event"];
const ticketStatuses = ["", "pending", "awaiting-user", "under-investigation", "accepted", "denied", "resolved", "closed"];

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
        </div>
        <nav className="hidden md:flex items-center gap-5 text-sm">
          {[
            { href: "/staff/dashboard", label: "Dashboard" },
            { href: "/staff/tickets", label: "Tickets" },
            { href: "/staff/members", label: "Team" },
            { href: "/staff/logs", label: "Logs" },
            { href: "/staff/cms", label: "Site Content" },
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

function StaffTicketsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListTickets({
    status: status || undefined,
    type: type || undefined,
    search: search || undefined,
    page,
  });

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      <StaffHeader />
      <main className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Ticket Queue</h1>
          <p className="text-white/40">{data?.total ?? 0} tickets total</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search username, code, subject..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 max-w-xs"
          />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
          >
            {ticketStatuses.map((s) => (
              <option key={s} value={s} className="bg-[#0B0B0F]">
                {s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "All Statuses"}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 text-sm"
          >
            {ticketTypes.map((t) => (
              <option key={t} value={t} className="bg-[#0B0B0F]">
                {t ? t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "All Types"}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-white/30 text-center py-20">Loading tickets...</div>
        ) : (
          <div className="space-y-3">
            {data?.tickets.map((ticket) => (
              <a
                key={ticket.id}
                href={`/staff/tickets/${ticket.id}`}
                className="block p-4 bg-white/3 border border-white/10 hover:border-primary/30 rounded-xl hover:bg-white/5 transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-primary font-mono font-bold text-sm">{ticket.ticketCode}</span>
                      <span className="text-white/30 text-xs capitalize">{ticket.type.replace(/-/g, " ")}</span>
                    </div>
                    <p className="text-white font-medium line-clamp-1">{ticket.subject}</p>
                    <p className="text-white/40 text-sm mt-0.5">
                      {ticket.robloxUsername} · {ticket.discordUsername}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColors[ticket.status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
                      {ticket.status.replace(/-/g, " ")}
                    </span>
                    <span className="text-white/20 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </a>
            ))}
            {data?.tickets.length === 0 && (
              <div className="text-center py-20 text-white/30">No tickets found.</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="border-white/10 text-white/60">
              Previous
            </Button>
            <span className="text-white/40 text-sm">Page {page} of {data.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)} className="border-white/10 text-white/60">
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function StaffTickets() {
  return (
    <StaffGuard>
      <StaffTicketsContent />
    </StaffGuard>
  );
}
