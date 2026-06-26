import { useState } from "react";
import { Layout } from "@/components/layout";
import { motion } from "framer-motion";
import { useListUpdates } from "@workspace/api-client-react";

const categories = [
  { id: undefined, label: "All" },
  { id: "announcement", label: "Announcements" },
  { id: "lore-event", label: "Lore Events" },
  { id: "update", label: "Updates" },
  { id: "general", label: "General" },
];

const categoryColors: Record<string, string> = {
  announcement: "bg-primary/20 text-primary border-primary/30",
  "lore-event": "bg-secondary/20 text-secondary border-secondary/30",
  update: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  general: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function Updates() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data, isLoading } = useListUpdates(category ? { category } : {});

  return (
    <Layout>
      <section className="relative py-24 min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,210,63,0.06)_0%,transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <p className="text-primary text-sm tracking-[4px] uppercase font-semibold mb-4">Community</p>
            <h1 className="text-5xl font-black text-white tracking-tight mb-4">News & Updates</h1>
            <p className="text-white/40 text-lg">Stay informed on all Imperium lore events, patches, and announcements.</p>
          </motion.div>

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) => (
              <button
                key={cat.label}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
                  category === cat.id
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_-3px_rgba(255,210,63,0.5)]"
                    : "border-white/10 text-white/50 hover:border-primary/40 hover:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-24 text-white/30">Loading updates...</div>
          )}

          {!isLoading && (!data || data.length === 0) && (
            <div className="text-center py-24 text-white/30">No updates found.</div>
          )}

          <div className="max-w-4xl mx-auto space-y-6">
            {data?.map((update, i) => {
              const catColor = categoryColors[update.category] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
              return (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white/3 border rounded-2xl p-6 backdrop-blur-sm transition-all hover:bg-white/5 ${
                    update.pinned ? "border-primary/30" : "border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {update.pinned && (
                        <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded">
                          📌 Pinned
                        </span>
                      )}
                      <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${catColor}`}>
                        {update.category.replace(/-/g, " ")}
                      </span>
                    </div>
                    <p className="text-white/30 text-sm">{new Date(update.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-3">{update.title}</h2>
                  <p className="text-white/60 leading-relaxed line-clamp-4">{update.content}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-white/30 text-sm">By <span className="text-primary">{update.authorName}</span></p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </Layout>
  );
}
