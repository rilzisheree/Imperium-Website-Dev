import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetTicketById,
  useUpdateTicketStatus,
  useAssignTicket,
  useAddTicketReply,
  useAddTicketNote,
  useListStaffMembers,
  useGetStaffMe,
  useStaffLogout,
  type TicketNote,
} from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

const statusOptions = [
  "pending", "awaiting-user", "under-investigation", "accepted", "denied", "resolved", "closed"
];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "awaiting-user": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "under-investigation": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  accepted: "bg-green-500/20 text-green-300 border-green-500/30",
  denied: "bg-red-500/20 text-red-300 border-red-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  closed: "bg-gray-500/20 text-gray-300 border-gray-500/30",
};

const eventIcons: Record<string, string> = {
  created: "○",
  status_changed: "◆",
  replied: "●",
  assigned: "▲",
  note_added: "■",
};

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

function DeleteTicketButton({ ticketId }: { ticketId: number }) {
  const { data: me } = useGetStaffMe();
  const [, navigate] = useLocation();
  const isOwner = me?.role === "owner" || me?.role === "developer";

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/staff/tickets/${ticketId}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => navigate("/staff/tickets"),
  });

  if (!isOwner) return null;

  return (
    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
      <h3 className="text-red-400/80 text-xs uppercase tracking-widest mb-3">Danger Zone</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (confirm("Delete this ticket permanently? This cannot be undone.")) {
            deleteMutation.mutate();
          }
        }}
        disabled={deleteMutation.isPending}
        className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm"
      >
        {deleteMutation.isPending ? "Deleting..." : "Delete Ticket"}
      </Button>
      {deleteMutation.isError && (
        <p className="text-red-400 text-xs mt-2">{(deleteMutation.error as any)?.error ?? "Failed to delete"}</p>
      )}
    </div>
  );
}

function TicketDetailContent() {
  const [, params] = useRoute("/staff/tickets/:id");
  const ticketId = Number(params?.id);
  const queryClient = useQueryClient();
  const qk = { query: { enabled: !isNaN(ticketId) } as any };

  const { data, isLoading, refetch } = useGetTicketById(ticketId, qk);
  const { data: notes, refetch: refetchNotes } = useQuery<TicketNote[]>({
    queryKey: ["ticket-notes", ticketId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/staff/tickets/${ticketId}/notes`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !isNaN(ticketId),
  });
  const { data: staffMembers } = useListStaffMembers();
  const updateStatus = useUpdateTicketStatus();
  const assign = useAssignTicket();
  const addReply = useAddTicketReply();
  const addNote = useAddTicketNote();

  const [replyText, setReplyText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"replies" | "notes" | "timeline">("replies");

  if (isLoading) return <div className="text-center py-20 text-white/30">Loading ticket...</div>;
  if (!data) return <div className="text-center py-20 text-red-400">Ticket not found.</div>;

  const { ticket, replies, timeline } = data;

  const handleStatusChange = (status: string) => {
    updateStatus.mutate({ ticketId, data: { status } }, { onSuccess: () => refetch() });
  };

  const handleAssign = (staffId: number | null) => {
    assign.mutate({ ticketId, data: { staffId } }, { onSuccess: () => refetch() });
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    addReply.mutate({ ticketId, data: { message: replyText.trim() } }, {
      onSuccess: () => { setReplyText(""); refetch(); }
    });
  };

  const handleNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ ticketId, data: { note: noteText.trim() } }, {
      onSuccess: () => { setNoteText(""); refetchNotes(); }
    });
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <a href="/staff/tickets" className="text-white/30 hover:text-primary transition-colors text-sm">← Back to Tickets</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/10 rounded-xl p-6">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <span className="text-primary font-mono font-black text-2xl tracking-widest">{ticket.ticketCode}</span>
                <p className="text-white/40 text-sm mt-1 capitalize">{ticket.type.replace(/-/g, " ")}</p>
              </div>
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${statusColors[ticket.status] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}>
                {ticket.status.replace(/-/g, " ")}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">{ticket.subject}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ["Roblox Username", ticket.robloxUsername],
                ["Discord", ticket.discordUsername],
                ["Submitted", new Date(ticket.createdAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-white/80">{value}</p>
                </div>
              ))}
            </div>
            {ticket.reason && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Reason</p>
                <p className="text-white/70 text-sm leading-relaxed">{ticket.reason}</p>
              </div>
            )}
            {ticket.additionalInfo && (
              <div className="mt-3">
                <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Additional Info</p>
                <p className="text-white/70 text-sm leading-relaxed">{ticket.additionalInfo}</p>
              </div>
            )}
          </motion.div>

          {/* Tabs */}
          <div>
            <div className="flex gap-1 mb-4">
              {(["replies", "notes", "timeline"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab ? "bg-primary text-primary-foreground" : "text-white/40 hover:text-white"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "replies" && ` (${replies.length})`}
                  {tab === "notes" && ` (${notes?.length ?? 0})`}
                </button>
              ))}
            </div>

            {activeTab === "replies" && (
              <div className="space-y-4">
                {replies.map((r) => (
                  <div key={r.id} className="bg-white/3 border border-primary/20 border-l-4 border-l-primary rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary font-semibold text-sm">{r.authorName}</span>
                      <span className="text-white/30 text-xs capitalize">{r.authorRole}</span>
                      <span className="text-white/20 text-xs ml-auto">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{r.message}</p>
                  </div>
                ))}
                {replies.length === 0 && <p className="text-white/30 text-sm py-4">No replies yet.</p>}
                <div className="space-y-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply to the user..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] resize-none"
                  />
                  <Button onClick={handleReply} disabled={addReply.isPending || !replyText.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {addReply.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "notes" && (
              <div className="space-y-4">
                {notes?.map((n: TicketNote) => (
                  <div key={n.id} className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Internal Note</span>
                      <span className="text-white/40 text-sm">{n.authorName}</span>
                      <span className="text-white/20 text-xs ml-auto">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-white/70 text-sm">{n.note}</p>
                  </div>
                ))}
                {(!notes || notes.length === 0) && <p className="text-white/30 text-sm py-4">No internal notes yet.</p>}
                <div className="space-y-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add an internal note (not visible to user)..."
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px] resize-none"
                  />
                  <Button onClick={handleNote} disabled={addNote.isPending || !noteText.trim()}
                    variant="outline" className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                    {addNote.isPending ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-3">
                {timeline.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 text-sm">
                    <span className="text-primary mt-0.5 w-4 text-center flex-shrink-0">{eventIcons[event.eventType] ?? "○"}</span>
                    <div>
                      <span className="text-white/80">{event.description}</span>
                      {event.actorName && <span className="text-white/40 ml-2 text-xs">by {event.actorName}</span>}
                      <p className="text-white/30 text-xs mt-0.5">{new Date(event.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status */}
          <div className="bg-white/3 border border-white/10 rounded-xl p-5">
            <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Update Status</h3>
            <div className="space-y-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={ticket.status === s || updateStatus.isPending}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all capitalize border ${
                    ticket.status === s
                      ? (statusColors[s] ?? "bg-gray-500/20 text-gray-300 border-gray-500/30")
                      : "border-white/5 text-white/50 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {s.replace(/-/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Assign */}
          <div className="bg-white/3 border border-white/10 rounded-xl p-5">
            <h3 className="text-white/60 text-xs uppercase tracking-widest mb-3">Assign To</h3>
            <div className="space-y-1">
              <button
                onClick={() => handleAssign(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                  !ticket.assignedToId ? "border-primary/40 text-primary bg-primary/10" : "border-white/5 text-white/50 hover:text-white"
                }`}
              >
                Unassigned
              </button>
              {staffMembers?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleAssign(member.id)}
                  disabled={assign.isPending}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                    ticket.assignedToId === member.id ? "border-primary/40 text-primary bg-primary/10" : "border-white/5 text-white/50 hover:text-white"
                  }`}
                >
                  {member.username}
                  <span className="ml-2 text-white/20 text-xs capitalize">{member.role}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Delete (Owner only) */}
          <DeleteTicketButton ticketId={ticketId} />
        </div>
      </div>
    </div>
  );
}

export default function StaffTicketDetail() {
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white">
        <StaffHeader />
        <TicketDetailContent />
      </div>
    </StaffGuard>
  );
}
