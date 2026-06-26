import { useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { useCreateTicket } from "@workspace/api-client-react";

const ticketTypes = [
  {
    id: "report-user",
    title: "Report a User",
    description: "Report a player for breaking community rules, exploiting, or toxic behavior during roleplay.",
    color: "from-red-500/20 to-red-900/10",
    border: "border-red-500/30 hover:border-red-400/60",
    glow: "hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)]",
    icon: "⚠",
  },
  {
    id: "appeal-ban",
    title: "Appeal Your Ban",
    description: "Believe your ban was issued in error? Submit a formal appeal for review by our moderation team.",
    color: "from-primary/20 to-yellow-900/10",
    border: "border-primary/30 hover:border-primary/60",
    glow: "hover:shadow-[0_0_30px_-5px_rgba(255,210,63,0.4)]",
    icon: "⚖",
  },
  {
    id: "appeal-character-death",
    title: "Appeal Your Character Death",
    description: "Contest a character death you believe was improperly handled or violated our roleplay rules.",
    color: "from-secondary/20 to-cyan-900/10",
    border: "border-secondary/30 hover:border-secondary/60",
    glow: "hover:shadow-[0_0_30px_-5px_rgba(0,217,255,0.4)]",
    icon: "✦",
  },
  {
    id: "permadeath-event",
    title: "Request a Permadeath Event",
    description: "Submit a formal request to host or participate in a permadeath lore event in the Imperium world.",
    color: "from-accent/20 to-blue-900/10",
    border: "border-accent/30 hover:border-accent/60",
    glow: "hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]",
    icon: "★",
  },
];

interface TicketSuccess {
  ticketCode: string;
  accessCode: string;
}

interface TicketFormProps {
  type: (typeof ticketTypes)[0];
  onClose: () => void;
  onSuccess: (result: TicketSuccess) => void;
}

function TicketForm({ type, onClose, onSuccess }: TicketFormProps) {
  const [form, setForm] = useState({
    robloxUsername: "",
    discordUsername: "",
    discordUserId: "",
    email: "",
    subject: "",
    reason: "",
    additionalInfo: "",
    agreedToTerms: false,
  });
  const [error, setError] = useState("");
  const mutation = useCreateTicket();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.agreedToTerms) {
      setError("You must agree to the terms before submitting.");
      return;
    }
    mutation.mutate(
      { ...form, type: type.id },
      {
        onSuccess: (data) => onSuccess({ ticketCode: data.ticketCode, accessCode: data.accessCode }),
        onError: () => setError("Failed to submit ticket. Please try again."),
      }
    );
  };

  const field = (key: keyof typeof form, label: string, placeholder: string, isTextarea = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={key} className="text-white/80 text-sm font-medium">{label}</Label>
      {isTextarea ? (
        <Textarea
          id={key}
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px] resize-none"
        />
      ) : (
        <Input
          id={key}
          value={form[key] as string}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={placeholder}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
        />
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      {field("robloxUsername", "Roblox Username", "YourRobloxName")}
      {field("discordUsername", "Discord Username", "username#0000")}
      {field("discordUserId", "Discord User ID", "123456789012345678")}
      {field("email", "Email Address", "your@email.com")}
      {field("subject", "Subject", "Brief summary of your request")}
      {field("reason", "Reason / Description", "Provide as much detail as possible...", true)}
      {field("additionalInfo", "Additional Information (optional)", "Links, evidence, context...", true)}
      <div className="flex items-start gap-3 pt-1">
        <Checkbox
          id="terms"
          checked={form.agreedToTerms}
          onCheckedChange={(v) => setForm((f) => ({ ...f, agreedToTerms: !!v }))}
          className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
        <Label htmlFor="terms" className="text-white/60 text-sm leading-snug cursor-pointer">
          I confirm all information provided is accurate and I understand that false reports may result in consequences.
        </Label>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-white/10 text-white/60 hover:text-white">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(255,210,63,0.5)]"
        >
          {mutation.isPending ? "Submitting..." : "Submit Ticket"}
        </Button>
      </div>
    </form>
  );
}

export default function Support() {
  const [activeType, setActiveType] = useState<(typeof ticketTypes)[0] | null>(null);
  const [success, setSuccess] = useState<TicketSuccess | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!success) return;
    const text = `Ticket ID: ${success.ticketCode}\nAccess Code: ${success.accessCode}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Layout>
      <section className="relative py-24 min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,210,63,0.08)_0%,transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-primary text-sm tracking-[4px] uppercase font-semibold mb-4">Support Center</p>
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight mb-6">
              How Can We <span className="text-primary">Help?</span>
            </h1>
            <p className="text-white/50 max-w-xl mx-auto text-lg">
              Submit a support ticket and our staff team will review it. All tickets are handled confidentially.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {ticketTypes.map((type, i) => (
              <motion.div
                key={type.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <button
                  onClick={() => setActiveType(type)}
                  className={`w-full text-left p-6 rounded-xl border bg-gradient-to-br ${type.color} ${type.border} ${type.glow} backdrop-blur-sm transition-all duration-300 group`}
                >
                  <div className="text-3xl mb-4 text-white/40 group-hover:text-white/60 transition-colors">{type.icon}</div>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{type.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{type.description}</p>
                  <div className="mt-4 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Submit Ticket →
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <p className="text-white/30 text-sm">
              Already submitted a ticket?{" "}
              <a href="/track" className="text-primary hover:underline">Track its status here</a>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Ticket Form Dialog */}
      <Dialog open={!!activeType} onOpenChange={(open) => { if (!open) setActiveType(null); }}>
        <DialogContent className="bg-[#0f0f1a] border-white/10 text-white max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-primary">{activeType?.title}</DialogTitle>
          </DialogHeader>
          {activeType && (
            <TicketForm
              type={activeType}
              onClose={() => setActiveType(null)}
              onSuccess={(result) => { setActiveType(null); setSuccess(result); }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!success} onOpenChange={(open) => { if (!open) setSuccess(null); }}>
        <DialogContent className="bg-[#0f0f1a] border-primary/30 text-white max-w-md text-center">
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto text-2xl text-primary font-bold">✓</div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Ticket Submitted!</h2>
              <p className="text-white/50 text-sm">Save both codes below — you will need them to track your ticket.</p>
            </div>

            <div className="space-y-3">
              <div className="bg-black/40 border border-primary/30 rounded-lg p-4">
                <p className="text-primary/60 text-xs uppercase tracking-widest mb-1">Ticket ID</p>
                <p className="text-primary text-2xl font-black tracking-widest font-mono">{success?.ticketCode}</p>
              </div>
              <div className="bg-black/40 border border-secondary/30 rounded-lg p-4">
                <p className="text-secondary/60 text-xs uppercase tracking-widest mb-1">Access Code</p>
                <p className="text-secondary text-2xl font-black tracking-widest font-mono">{success?.accessCode}</p>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-yellow-400 text-xs leading-relaxed">
                ⚠ Save both codes now. They cannot be recovered and are required to view your ticket. Do not share them.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="border-white/10 text-white/70 hover:text-white"
                onClick={handleCopy}
              >
                {copied ? "✓ Copied!" : "Copy Ticket Information"}
              </Button>
              <Button
                className="bg-primary text-primary-foreground"
                onClick={() => { setSuccess(null); window.location.href = "/track"; }}
              >
                Track Ticket
              </Button>
              <Button
                variant="ghost"
                className="text-white/40 hover:text-white text-sm"
                onClick={() => setSuccess(null)}
              >
                Return Home
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
