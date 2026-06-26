import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetStaffMe, useGetDashboardStats, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`bg-white/3 border rounded-xl p-6 backdrop-blur-sm ${color}`}>
      <p className="text-white/40 text-xs uppercase tracking-widest mb-2">{label}</p>
      <p className="text-4xl font-black text-white">{value}</p>
    </div>
  );
}

function StaffDashboardContent() {
  const [, navigate] = useLocation();
  const { data: me } = useGetStaffMe();
  const { data: stats, isLoading } = useGetDashboardStats();
  const logout = useStaffLogout();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        navigate("/staff");
      },
    });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    "awaiting-user": "bg-blue-500/20 text-blue-300 border-blue-500/30",
    "under-investigation": "bg-purple-500/20 text-purple-300 border-purple-500/30",
    accepted: "bg-green-500/20 text-green-300 border-green-500/30",
    denied: "bg-red-500/20 text-red-300 border-red-500/30",
    resolved: "bg-green-500/20 text-green-300 border-green-500/30",
    closed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      {/* Staff Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0B0F]/90 backdrop-blur-md">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-primary font-black tracking-widest text-lg hover:text-primary/80 transition-colors">
              IMPERIUM
            </a>
            <span className="text-white/20">|</span>
            <span className="text-white/40 text-sm">Staff Portal</span>
            <a href="/" className="text-white/25 text-xs hover:text-primary transition-colors hidden sm:flex items-center gap-1">
              ← Site
            </a>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {[
              { href: "/staff/dashboard", label: "Dashboard" },
              { href: "/staff/tickets", label: "Tickets" },
              { href: "/staff/members", label: "Team" },
              { href: "/staff/logs", label: "Logs" },
              { href: "/staff/cms", label: "Site Content" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`transition-colors ${location.pathname === link.href ? "text-primary" : "text-white/60 hover:text-primary"}`}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-white/40 text-sm hidden sm:block">
              <span className="text-primary capitalize">{me?.role}</span> — {me?.username}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-white/10 text-white/60 hover:text-white text-xs">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-black text-white mb-1">Dashboard</h1>
          <p className="text-white/40">Welcome back, <span className="text-primary">{me?.username}</span></p>
        </motion.div>

        {isLoading ? (
          <div className="text-white/30 py-20 text-center">Loading stats...</div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <StatCard label="Open Tickets" value={Number(stats.openTickets)} color="border-primary/20" />
              <StatCard label="Pending Review" value={Number(stats.pendingTickets)} color="border-yellow-500/20" />
              <StatCard label="Closed Today" value={Number(stats.closedToday)} color="border-green-500/20" />
              <StatCard label="Total Tickets" value={Number(stats.totalTickets)} color="border-white/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* By Type */}
              <div className="bg-white/3 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">Tickets by Type</h3>
                <div className="space-y-3">
                  {stats.ticketsByType.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">{item.label}</span>
                      <span className="text-primary font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* By Status */}
              <div className="bg-white/3 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">Tickets by Status</h3>
                <div className="space-y-3">
                  {stats.ticketsByStatus.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">{item.label}</span>
                      <span className="text-primary font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Tickets */}
            <div className="bg-white/3 border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold">Recent Tickets</h3>
                <a href="/staff/tickets" className="text-primary text-sm hover:underline">View all →</a>
              </div>
              <div className="space-y-3">
                {stats.recentTickets.map((ticket) => (
                  <a
                    key={ticket.id}
                    href={`/staff/tickets/${ticket.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/3 hover:bg-white/5 transition-colors border border-white/5 hover:border-primary/20"
                  >
                    <div>
                      <span className="text-primary font-mono text-sm font-bold">{ticket.ticketCode}</span>
                      <span className="text-white/40 text-sm ml-3">{ticket.robloxUsername}</span>
                      <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{ticket.subject}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[ticket.status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
                        {ticket.status.replace(/-/g, " ")}
                      </span>
                      <span className="text-white/20 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </a>
                ))}
                {stats.recentTickets.length === 0 && (
                  <p className="text-white/30 text-sm text-center py-4">No tickets yet.</p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

export default function StaffDashboard() {
  return (
    <StaffGuard>
      <StaffDashboardContent />
    </StaffGuard>
  );
}
