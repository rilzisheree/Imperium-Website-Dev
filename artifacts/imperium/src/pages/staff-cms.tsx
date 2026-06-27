import { useState, useRef, useCallback, useEffect } from "react";
import { useGetStaffMe, useStaffLogout } from "@workspace/api-client-react";
import { StaffGuard } from "@/components/staff-guard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface ContentItem {
  id: number;
  key: string;
  value: string;
  label: string;
  section: string;
  updatedByName: string | null;
  updatedAt: string;
}

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  pinned: boolean;
  imageUrl: string | null;
  publishedAt: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "🏠 Hero Section",
  general: "⚙ General Settings",
  footer: "📎 Footer",
  about: "ℹ About Page",
  support: "🎫 Support Page",
  updates: "📰 Updates Page",
};

const CATEGORY_OPTIONS = [
  { value: "announcement", label: "📢 Announcement", color: "text-primary" },
  { value: "lore-event",   label: "⚔ Lore Event",    color: "text-secondary" },
  { value: "update",       label: "🔧 Update",         color: "text-purple-400" },
  { value: "general",      label: "💬 General",        color: "text-gray-400" },
];

const ADMIN_ROLES = ["owner", "developer", "administrator", "head-administrator"];

/* ──────────────────────────────────────────────
   Rich Text Editor
────────────────────────────────────────────── */
function RichEditor({ onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Set initial content once on mount — never update innerHTML from React after that
  // (updating dangerouslySetInnerHTML on every keystroke resets the cursor to position 0)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML === "") {
      ref.current.innerHTML = "";
    }
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const insertImage = useCallback(() => {
    const url = prompt("Enter image URL:");
    if (url?.trim()) exec("insertImage", url.trim());
  }, [exec]);

  const toolbarBtns = [
    { label: "B",  title: "Bold",          cmd: () => exec("bold"),          cls: "font-black" },
    { label: "I",  title: "Italic",        cmd: () => exec("italic"),        cls: "italic" },
    { label: "U",  title: "Underline",     cmd: () => exec("underline"),     cls: "underline" },
    { label: "H",  title: "Heading",       cmd: () => exec("formatBlock", "h3") },
    { label: "•",  title: "Bullet List",   cmd: () => exec("insertUnorderedList") },
    { label: "🖼", title: "Insert Image",  cmd: insertImage },
  ];

  return (
    <div className="rounded-lg border border-white/10 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-white/5 border-b border-white/10 px-2 py-1.5 flex-wrap">
        {toolbarBtns.map((b) => (
          <button
            key={b.title}
            type="button"
            title={b.title}
            onMouseDown={(e) => { e.preventDefault(); b.cmd(); }}
            className={`px-2.5 py-1 rounded text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors ${b.cls ?? ""}`}
          >
            {b.label}
          </button>
        ))}
      </div>
      {/* Editable area — uncontrolled: React never touches innerHTML after mount */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="min-h-[140px] p-3 text-white/80 text-sm leading-relaxed outline-none bg-white/3
          [&_h3]:text-white [&_h3]:font-bold [&_h3]:text-base [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-0.5
          [&_b]:text-white [&_strong]:text-white
          [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-white/10"
        data-placeholder="Write your post content here..."
      />
    </div>
  );
}

/* ──────────────────────────────────────────────
   Posts Panel (all categories)
────────────────────────────────────────────── */
function PostsPanel() {
  const base = import.meta.env.BASE_URL;
  const qc = useQueryClient();

  const blankForm = { title: "", content: "", category: "announcement", pinned: false, imageUrl: "" };
  const [form, setForm] = useState(blankForm);
  const [editorKey, setEditorKey] = useState(0);
  const [error, setError] = useState("");

  const { data: posts, refetch } = useQuery<Post[]>({
    queryKey: ["staff-posts"],
    queryFn: async () => {
      const res = await fetch(`${base}api/updates`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        content: form.content,
        category: form.category,
        pinned: form.pinned,
        imageUrl: form.imageUrl.trim() || null,
      };
      const res = await fetch(`${base}api/staff/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      setForm(blankForm);
      setEditorKey((k) => k + 1);
      setError("");
      refetch();
      qc.invalidateQueries({ queryKey: ["updates"] });
    },
    onError: (e: any) => setError(e?.error ?? "Failed to post"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${base}api/staff/updates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => { refetch(); qc.invalidateQueries({ queryKey: ["updates"] }); },
  });

  const catInfo = CATEGORY_OPTIONS.find((c) => c.value === form.category);
  const canSubmit = form.title.trim() && form.content && form.content !== "<br>";

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <h2 className="text-white/50 text-sm font-bold uppercase tracking-widest mb-4">📰 Publish Posts</h2>

      {/* Create form */}
      <div className="bg-white/3 border border-primary/20 rounded-xl p-5 mb-5 space-y-4">
        <p className="text-white/60 text-sm font-medium">New Post</p>

        {/* Category */}
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
              className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                form.category === cat.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Post title..."
            className="bg-white/5 border-white/10 text-white text-sm"
          />
        </div>

        {/* Rich text content */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Content</Label>
          <RichEditor key={editorKey} value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} />
        </div>

        {/* Banner image URL */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs">Banner Image URL (optional)</Label>
          <Input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://example.com/image.png"
            className="bg-white/5 border-white/10 text-white text-sm font-mono"
          />
          {form.imageUrl && (
            <img src={form.imageUrl} alt="preview" className="h-24 rounded-lg object-cover border border-white/10 mt-1" onError={(e) => (e.currentTarget.style.display = "none")} />
          )}
        </div>

        {/* Pin toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              form.pinned ? "bg-primary border-primary" : "border-white/30"
            }`}
          >
            {form.pinned && <span className="text-[10px] text-black font-bold">✓</span>}
          </button>
          <span className="text-white/60 text-sm cursor-pointer select-none" onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}>
            📌 Pin this post
          </span>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          disabled={!canSubmit || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
        >
          {createMutation.isPending ? "Publishing..." : `Publish ${catInfo?.label ?? "Post"}`}
        </Button>
      </div>

      {/* Existing posts */}
      <div className="space-y-3">
        {(!posts || posts.length === 0) && (
          <p className="text-white/20 text-sm text-center py-6 bg-white/3 border border-white/8 rounded-xl">
            No posts yet. Publish one above — it will appear on the Updates page.
          </p>
        )}
        {posts?.map((p) => {
          const cat = CATEGORY_OPTIONS.find((c) => c.value === p.category);
          return (
            <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {p.pinned && <span className="text-primary text-xs">📌</span>}
                  <span className={`text-xs font-semibold ${cat?.color ?? "text-white/50"}`}>{cat?.label ?? p.category}</span>
                  <span className="text-white font-semibold text-sm truncate">{p.title}</span>
                </div>
                <p className="text-white/40 text-xs line-clamp-1" dangerouslySetInnerHTML={{ __html: p.content }} />
                <p className="text-white/20 text-xs mt-1.5">
                  By <span className="text-primary/60">{p.authorName}</span> · {new Date(p.publishedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { if (confirm("Delete this post?")) deleteMutation.mutate(p.id); }}
                disabled={deleteMutation.isPending}
                className="border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 flex-shrink-0"
              >
                Delete
              </Button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   CMS text content editor (unchanged)
────────────────────────────────────────────── */
function StaffNav({ active }: { active: string }) {
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
            <a key={l.href} href={l.href}
              className={`transition-colors ${active === l.href ? "text-primary" : "text-white/50 hover:text-primary"}`}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-white/30 text-xs hidden sm:block capitalize">{me?.role} — {me?.username}</span>
          <Button variant="outline" size="sm"
            onClick={() => logout.mutate(undefined, { onSuccess: () => { qc.clear(); window.location.href = "/staff"; } })}
            className="border-white/10 text-white/60 text-xs">Sign Out</Button>
        </div>
      </div>
    </header>
  );
}

function ContentEditor({ item, onSaved }: { item: ContentItem; onSaved: () => void }) {
  const [value, setValue] = useState(item.value);
  const [saved, setSaved] = useState(false);
  const base = import.meta.env.BASE_URL;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${base}api/cms/${item.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw await res.json();
      return res.json();
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    },
  });

  const isLong = item.value.length > 80;
  const changed = value !== item.value;

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white font-semibold text-sm">{item.label}</p>
          <p className="text-white/25 text-xs font-mono mt-0.5">{item.key}</p>
        </div>
        {item.updatedByName && (
          <p className="text-white/20 text-xs flex-shrink-0">
            Last edited by <span className="text-primary/50">{item.updatedByName}</span>
            {" "}· {new Date(item.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      {isLong ? (
        <Textarea value={value} onChange={(e) => setValue(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-sm resize-none min-h-[80px]" />
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-sm" />
      )}
      <div className="flex items-center justify-end gap-2">
        {changed && <span className="text-yellow-400/60 text-xs">Unsaved changes</span>}
        <Button size="sm" disabled={!changed || mutation.isPending} onClick={() => mutation.mutate()}
          className={`text-xs px-4 ${saved ? "bg-green-500 text-white" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
          {mutation.isPending ? "Saving..." : saved ? "✓ Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function CMSContent() {
  const base = import.meta.env.BASE_URL;
  const { data: me } = useGetStaffMe();
  const { data, refetch, isLoading } = useQuery<ContentItem[]>({
    queryKey: ["cms-all"],
    queryFn: async () => {
      const res = await fetch(`${base}api/cms/all`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const isAdmin = me?.role && ADMIN_ROLES.includes(me.role);
  const sections = data ? [...new Set(data.map((c) => c.section))].sort() : [];

  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Site Content</h1>
        <p className="text-white/40 mt-1">Publish posts and edit any text on the public website.</p>
      </div>

      {isLoading && <div className="text-white/30 text-center py-20">Loading content...</div>}

      <div className="space-y-10">
        {isAdmin && <PostsPanel />}

        {sections.map((section) => {
          const items = data!.filter((c) => c.section === section);
          return (
            <motion.div key={section} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-white/50 text-sm font-bold uppercase tracking-widest mb-4">
                {SECTION_LABELS[section] ?? section}
              </h2>
              <div className="space-y-3">
                {items.map((item) => (
                  <ContentEditor key={item.key} item={item} onSaved={() => refetch()} />
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function StaffCMS() {
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#0B0B0F] text-white">
        <StaffNav active="/staff/cms" />
        <CMSContent />
      </div>
    </StaffGuard>
  );
}
