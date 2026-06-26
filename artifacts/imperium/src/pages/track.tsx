import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { useTrackTicket } from "@workspace/api-client-react";
import type { TicketDetail } from "@workspace/api-client-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "awaiting-user": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "under-investigation": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  accepted: "bg-green-500/20 text-green-400 border-green-500/30",
  denied: "bg-red-500/20 text-red-400 border-red-500/30",
  resolved: "bg-green-500/20 text-green-400 border-green-500/30",
  closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const eventIcons: Record<string, string> = {
  created: "○",
  status_changed: "◆",
  replied: "●",
  assigned: "▲",
  note_added: "■",
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusColors[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const label = status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${colors}`}>
      {label}
    </span>
  );
}

export default function Track() {
  const [ticketCode, setTicketCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<TicketDetail | null>(null);
  const mutation = useTrackTicket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!ticketCode.trim() || !email.trim()) {
      setError("Both Ticket ID and email are required.");
      return;
    }
    mutation.mutate(
      { ticketCode: ticketCode.trim().toUpperCase(), email: email.trim() },
      {
        onSuccess: (data) => setResult(data),
        onError: (err: any) => {
          setError(err?.response?.data?.error ?? "Ticket not found. Check your Ticket ID and email address.");
        },
      }
    );
  };

  return (
    <Layout>
      <section className="relative py-24 min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,217,255,0.05)_0%,transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10 max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <p className="text-secondary text-sm tracking-[4px] uppercase font-semibold mb-4">Support Center</p>
            <h1 className="text-5xl font-black text-white tracking-tight mb-4">Track Your Ticket</h1>
            <p className="text-white/40 text-lg">Enter your Ticket ID and email to view your ticket status and staff replies.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm mb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Ticket ID</Label>
                  <Input
                    value={ticketCode}
                    onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                    placeholder="IMP-593821"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 font-mono text-lg tracking-widest"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-sm">Email Address</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <Button type="submit" disabled={mutation.isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 text-base shadow-[0_0_20px_-5px_rgba(255,210,63,0.4)]">
                {mutation.isPending ? "Searching..." : "Find Ticket"}
              </Button>
            </form>
          </motion.div>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                {/* Ticket overview */}
                <div className="bg-white/3 border border-primary/20 rounded-2xl p-6 backdrop-blur-sm">
                  <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
                    <div>
                      <p className="text-primary/60 text-xs uppercase tracking-widest mb-1">Ticket ID</p>
                      <p className="text-primary text-2xl font-black tracking-widest font-mono">{result.ticket.ticketCode}</p>
                    </div>
                    <StatusBadge status={result.ticket.status} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {[
                      ["Type", result.ticket.type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())],
                      ["Subject", result.ticket.subject],
                      ["Roblox Username", result.ticket.robloxUsername],
                      ["Assigned To", result.ticket.assignedToName ?? "Unassigned"],
                      ["Submitted", new Date(result.ticket.createdAt).toLocaleDateString()],
                      ["Last Updated", new Date(result.ticket.updatedAt).toLocaleDateString()],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="text-white font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                {result.timeline.length > 0 && (
                  <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold text-lg mb-4">Timeline</h3>
                    <div className="space-y-3">
                      {result.timeline.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 text-sm">
                          <span className="text-primary mt-0.5 w-4 text-center flex-shrink-0">{eventIcons[event.eventType] ?? "○"}</span>
                          <div>
                            <span className="text-white/80">{event.description}</span>
                            {event.actorName && <span className="text-white/40 ml-2">by {event.actorName}</span>}
                            <p className="text-white/30 text-xs mt-0.5">{new Date(event.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Staff Replies */}
                {result.replies.length > 0 && (
                  <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-white font-bold text-lg mb-4">Staff Replies</h3>
                    <div className="space-y-4">
                      {result.replies.map((reply) => (
                        <div key={reply.id} className="border-l-2 border-primary/40 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-primary font-semibold text-sm">{reply.authorName}</span>
                            <span className="text-white/30 text-xs capitalize">{reply.authorRole}</span>
                            <span className="text-white/20 text-xs ml-auto">{new Date(reply.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.replies.length === 0 && (
                  <div className="text-center py-8 text-white/30 text-sm">
                    No staff replies yet. Our team will respond within 24–72 hours.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </Layout>
  );
}
