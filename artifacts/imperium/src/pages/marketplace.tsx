import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const DISCORD_URL = "https://discord.gg/7GMcWzJu28";

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  available: { label: "Available", cls: "bg-primary/15 text-primary border-primary/30" },
  sold:      { label: "Sold",      cls: "bg-white/5 text-white/30 border-white/10 line-through" },
  reserved:  { label: "Reserved",  cls: "bg-secondary/15 text-secondary border-secondary/30" },
  unavailable: { label: "Unavailable", cls: "bg-red-500/15 text-red-400 border-red-500/20" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, cls: "bg-white/10 text-white/50 border-white/10" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-semibold tracking-wider uppercase ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Listing Card ─────────────────────────────────────────────────────────────

function ListingCard({ listing, onClick }: { listing: MarketplaceListing; onClick: () => void }) {
  const isSold = listing.status === "sold" || listing.status === "unavailable";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`group relative rounded-xl border border-white/8 bg-card overflow-hidden flex flex-col transition-colors ${isSold ? "opacity-60" : "hover:border-primary/30 hover:bg-white/3"}`}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-white/5">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${isSold ? "" : "group-hover:scale-105"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white/10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={listing.status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading font-bold text-base text-white/90 leading-tight line-clamp-1">{listing.name}</h3>
          <span className="text-xs text-white/30 bg-white/5 rounded px-1.5 py-0.5 shrink-0">{listing.category}</span>
        </div>

        <div className="flex items-center gap-1.5 text-white/40 text-xs">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          {listing.location}
        </div>

        <p className="text-white/40 text-xs leading-relaxed line-clamp-2 mt-0.5">{listing.description}</p>

        <div className="mt-auto pt-3 flex items-center justify-between border-t border-white/5">
          <span className={`font-heading font-black text-lg tracking-wide ${isSold ? "text-white/20 line-through" : "text-primary drop-shadow-[0_0_8px_rgba(255,210,63,0.3)]"}`}>
            {listing.price}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={onClick}
            disabled={isSold}
            className="text-xs border-white/15 text-white/60 hover:border-primary/50 hover:text-primary transition-colors"
          >
            View Details
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function ListingDetailModal({ listing, onClose }: { listing: MarketplaceListing; onClose: () => void }) {
  const isSold = listing.status === "sold" || listing.status === "unavailable";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-white/10 bg-card">
        <DialogTitle className="sr-only">{listing.name}</DialogTitle>

        {/* Image */}
        {listing.imageUrl && (
          <div className="aspect-video w-full overflow-hidden bg-white/5">
            <img src={listing.imageUrl} alt={listing.name} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading font-black text-2xl text-white tracking-wide">{listing.name}</h2>
              <div className="flex items-center gap-1.5 text-white/40 text-sm mt-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                {listing.location}
              </div>
            </div>
            <StatusBadge status={listing.status} />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Category</p>
              <p className="text-white/80 text-sm font-medium">{listing.category}</p>
            </div>
            <div className="bg-white/3 rounded-lg p-3">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Status</p>
              <p className="text-white/80 text-sm font-medium capitalize">{listing.status}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Description</p>
            <p className="text-white/60 text-sm leading-relaxed">{listing.description}</p>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-white/8">
            <div>
              <p className="text-white/30 text-xs uppercase tracking-widest mb-0.5">Asking Price</p>
              <p className={`font-heading font-black text-3xl tracking-wide ${isSold ? "text-white/20 line-through" : "text-primary drop-shadow-[0_0_12px_rgba(255,210,63,0.4)]"}`}>
                {listing.price}
              </p>
            </div>
            {isSold ? (
              <span className="text-white/20 text-sm italic">No longer available</span>
            ) : (
              <Button
                onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
                className="bg-primary text-black font-bold hover:bg-primary/90 shadow-[0_0_20px_rgba(255,210,63,0.25)]"
              >
                Inquire on Discord
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

const ALL_STATUSES = ["", "available", "reserved", "sold", "unavailable"];
const STATUS_LABELS: Record<string, string> = {
  "": "All", available: "Available", reserved: "Reserved", sold: "Sold", unavailable: "Unavailable",
};

export default function Marketplace() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [detailListing, setDetailListing] = useState<MarketplaceListing | null>(null);

  const { data: listings = [], isLoading, isError } = useQuery<MarketplaceListing[]>({
    queryKey: ["marketplace"],
    queryFn: () => apiFetch<MarketplaceListing[]>("/api/marketplace"),
  });

  const categories = useMemo(() => {
    const cats = [...new Set(listings.map((l) => l.category))].sort();
    return cats;
  }, [listings]);

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (selectedCategory && l.category !== selectedCategory) return false;
      if (selectedStatus && l.status !== selectedStatus) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()) && !l.location.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [listings, selectedCategory, selectedStatus, search]);

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-white/3 to-transparent">
        <div className="container mx-auto px-4 py-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-secondary text-xs font-semibold tracking-[0.3em] uppercase mb-3">Hosu City</p>
            <h1 className="font-heading font-black text-5xl md:text-6xl tracking-wider text-white mb-4 drop-shadow-[0_0_30px_rgba(255,210,63,0.15)]">
              HOSU <span className="text-primary">MARKETPLACE</span>
            </h1>
            <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
              Browse properties, businesses, and venues available in Hosu City. Inquire on Discord to begin acquisition.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <div className="sticky top-16 z-30 border-b border-white/5 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <Input
              placeholder="Search listings…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white/3 border-white/10 text-sm h-8 focus:border-primary/40"
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategory("")}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCategory === "" ? "bg-primary text-black border-primary" : "bg-white/3 text-white/50 border-white/10 hover:border-white/20"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? "" : cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat ? "bg-primary text-black border-primary" : "bg-white/3 text-white/50 border-white/10 hover:border-white/20"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Status select */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white/3 border border-white/10 text-white/60 text-xs rounded-md px-2.5 h-8 focus:outline-none focus:border-primary/40 appearance-none pr-6"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} className="bg-[#0B0B0F]">{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-white/5" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <p className="text-white/30 text-sm">Failed to load listings. Please try again.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-12 h-12 text-white/10 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
            <p className="text-white/30 text-sm">
              {listings.length === 0 ? "No listings yet. Check back soon." : "No listings match your filters."}
            </p>
            {(search || selectedCategory || selectedStatus) && (
              <button
                onClick={() => { setSearch(""); setSelectedCategory(""); setSelectedStatus(""); }}
                className="mt-3 text-primary/60 hover:text-primary text-xs transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-white/30 text-sm">
                {filtered.length} listing{filtered.length !== 1 ? "s" : ""}
                {selectedCategory || selectedStatus || search ? " matching filters" : ""}
              </p>
            </div>
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence mode="popLayout">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} onClick={() => setDetailListing(listing)} />
                ))}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailListing && (
        <ListingDetailModal listing={detailListing} onClose={() => setDetailListing(null)} />
      )}
    </Layout>
  );
}
