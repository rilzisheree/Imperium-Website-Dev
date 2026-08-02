import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetStaffMe, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

// ── Types ────────────────────────────────────────────────────────────────────

interface MarketplaceListing {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  price: string;
  location: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ListingFormData {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  location: string;
  category: string;
  status: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Status config ─────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  available: "bg-primary/15 text-primary border-primary/30",
  sold: "bg-white/5 text-white/30 border-white/10",
  reserved: "bg-secondary/15 text-secondary border-secondary/30",
  unavailable: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUSES = ["available", "reserved", "sold", "unavailable"];

// ── Staff Header ──────────────────────────────────────────────────────────────

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
            { href: "/staff/webhooks", label: "Webhooks" },
            { href: "/staff/marketplace", label: "Marketplace" },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`transition-colors ${location.pathname === l.href ? "text-primary" : "text-white/60 hover:text-primary"}`}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-white/40 text-sm hidden sm:block">
            <span className="text-primary capitalize">{me?.role}</span> — {me?.username}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: () => { queryClient.clear(); window.location.href = "/staff"; },
              })
            }
            className="border-white/10 text-white/60 text-xs"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

// ── Listing Form Dialog ───────────────────────────────────────────────────────

const emptyForm: ListingFormData = {
  name: "", description: "", imageUrl: "", price: "", location: "", category: "", status: "available",
};

function ListingFormDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ListingFormData | null;
  onSave: (data: ListingFormData) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<ListingFormData>(initial ?? emptyForm);

  // sync when initial changes (edit mode)
  useState(() => { setForm(initial ?? emptyForm); });

  const set = (k: keyof ListingFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading text-white">{initial ? "Edit Listing" : "New Listing"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Name *</label>
              <Input value={form.name} onChange={set("name")} required placeholder="Hosu Auto Shop" className="bg-white/3 border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Price *</label>
              <Input value={form.price} onChange={set("price")} required placeholder="$250,000" className="bg-white/3 border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Location *</label>
              <Input value={form.location} onChange={set("location")} required placeholder="Hosu City" className="bg-white/3 border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Category *</label>
              <Input value={form.category} onChange={set("category")} required placeholder="Auto Shop" className="bg-white/3 border-white/10 text-white text-sm" />
            </div>
            <div>
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Status</label>
              <select
                value={form.status}
                onChange={set("status")}
                className="w-full bg-white/3 border border-white/10 text-white/80 text-sm rounded-md px-3 h-9 focus:outline-none focus:border-primary/40"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="bg-[#0B0B0F] capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Image URL</label>
              <Input value={form.imageUrl} onChange={set("imageUrl")} placeholder="https://…" className="bg-white/3 border-white/10 text-white text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-white/40 text-xs mb-1 block uppercase tracking-wider">Description *</label>
              <textarea
                value={form.description}
                onChange={set("description")}
                required
                rows={3}
                placeholder="A fully equipped automotive shop…"
                className="w-full bg-white/3 border border-white/10 text-white/80 text-sm rounded-md px-3 py-2 focus:outline-none focus:border-primary/40 resize-none placeholder:text-white/20"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/10 text-white/50">
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="bg-primary text-black font-bold hover:bg-primary/90">
              {isPending ? "Saving…" : initial ? "Save Changes" : "Create Listing"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffMarketplace() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editListing, setEditListing] = useState<MarketplaceListing | null>(null);
  const [deleteListing, setDeleteListing] = useState<MarketplaceListing | null>(null);

  const { data: listings = [], isLoading } = useQuery<MarketplaceListing[]>({
    queryKey: ["staff-marketplace"],
    queryFn: () => apiFetch<MarketplaceListing[]>("/api/marketplace"),
  });

  const createMutation = useMutation({
    mutationFn: (data: ListingFormData) =>
      apiFetch<MarketplaceListing>("/api/staff/marketplace", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      setCreateOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: (data: ListingFormData) =>
      apiFetch<MarketplaceListing>(`/api/staff/marketplace/${editListing!.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      setEditListing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/staff/marketplace/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-marketplace"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace"] });
      setDeleteListing(null);
    },
  });

  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white font-sans">
        <StaffHeader />

        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-heading font-black text-2xl text-white tracking-wide">Marketplace</h1>
              <p className="text-white/30 text-sm mt-0.5">Manage property and business listings</p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-black font-bold hover:bg-primary/90"
            >
              + New Listing
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-white/3 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-xl">
              <p className="text-white/30 text-sm">No listings yet.</p>
              <button onClick={() => setCreateOpen(true)} className="mt-2 text-primary/60 hover:text-primary text-sm transition-colors">
                Create your first listing →
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/2 text-white/30 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Location</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing, i) => (
                    <motion.tr
                      key={listing.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {listing.imageUrl && (
                            <img src={listing.imageUrl} alt="" className="w-8 h-8 rounded object-cover opacity-70 shrink-0" />
                          )}
                          <span className="font-medium text-white/80 truncate max-w-[160px]">{listing.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-white/40">{listing.category}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-white/40">{listing.location}</td>
                      <td className="px-4 py-3 font-heading font-bold text-primary/80">{listing.price}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wider uppercase ${statusColors[listing.status] ?? "bg-white/5 text-white/30 border-white/10"}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditListing(listing)}
                            className="border-white/10 text-white/50 hover:text-white text-xs h-7"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteListing(listing)}
                            className="border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 text-xs h-7"
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create dialog */}
        <ListingFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          initial={null}
          onSave={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />

        {/* Edit dialog */}
        {editListing && (
          <ListingFormDialog
            open={!!editListing}
            onOpenChange={(open) => !open && setEditListing(null)}
            initial={{
              name: editListing.name,
              description: editListing.description,
              imageUrl: editListing.imageUrl ?? "",
              price: editListing.price,
              location: editListing.location,
              category: editListing.category,
              status: editListing.status,
            }}
            onSave={(data) => editMutation.mutate(data)}
            isPending={editMutation.isPending}
          />
        )}

        {/* Delete confirm */}
        <AlertDialog open={!!deleteListing} onOpenChange={(open) => !open && setDeleteListing(null)}>
          <AlertDialogContent className="border-white/10 bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete listing?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/40">
                <span className="font-semibold text-white/60">"{deleteListing?.name}"</span> will be permanently removed from the marketplace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-white/10 text-white/50">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteListing && deleteMutation.mutate(deleteListing.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </StaffGuard>
  );
}
