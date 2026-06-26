import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const DISCORD_URL = "https://discord.gg/7GMcWzJu28";
const ROBLOX_URL = "https://www.roblox.com/games/???";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Support" },
  { href: "/updates", label: "Updates" },
  { href: "/staff", label: "Staff" },
];

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 z-50 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_rgba(255,210,63,0.5)] hover:bg-primary/90 transition-colors font-bold text-lg"
          aria-label="Back to top"
        >
          ↑
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
      <BackToTop />

      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/85 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-black text-2xl tracking-wider text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_rgba(255,210,63,0.3)]">
            IMPERIUM
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary shadow-[0_0_12px_-3px_rgba(0,217,255,0.2)] text-sm"
              onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
            >
              Discord
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_12px_-3px_rgba(255,210,63,0.4)] text-sm font-bold"
              onClick={() => window.open(ROBLOX_URL, "_blank", "noopener,noreferrer")}
            >
              Play
            </Button>
            <button
              className="md:hidden text-white/60 hover:text-white p-1 ml-1"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? (
                  <>
                    <path d="M6 6l10 10M16 6l-10 10" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h14M4 12h14M4 17h14" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/5 overflow-hidden"
            >
              <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`text-sm font-medium py-1 transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="flex gap-3 pt-2 border-t border-white/5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-secondary/50 text-secondary hover:bg-secondary/10"
                    onClick={() => { window.open(DISCORD_URL, "_blank", "noopener,noreferrer"); setMobileOpen(false); }}
                  >
                    Discord
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={() => { window.open(ROBLOX_URL, "_blank", "noopener,noreferrer"); setMobileOpen(false); }}
                  >
                    Play
                  </Button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-white/5 bg-card py-14 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              <h2 className="font-heading font-black text-xl text-primary mb-3 tracking-widest">IMPERIUM</h2>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                A premium My Hero Academia lore roleplay experience on Roblox.
                Join the agency, build your legacy, and shape the future.
              </p>
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-4 font-semibold">Navigation</p>
              <div className="flex flex-col gap-2.5 text-sm">
                {navLinks.map(link => (
                  <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-primary transition-colors w-fit">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-widest mb-4 font-semibold">Community & Legal</p>
              <div className="flex flex-col gap-2.5 text-sm">
                <button onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")} className="text-muted-foreground hover:text-secondary transition-colors text-left w-fit">Discord Server</button>
                <button onClick={() => window.open(ROBLOX_URL, "_blank", "noopener,noreferrer")} className="text-muted-foreground hover:text-accent transition-colors text-left w-fit">Roblox Game</button>
                <Link href="/support" className="text-muted-foreground hover:text-primary transition-colors w-fit">Support Center</Link>
                <Link href="/track" className="text-muted-foreground hover:text-primary transition-colors w-fit">Track Ticket</Link>
                <span className="text-muted-foreground/30 text-xs mt-1 select-none">Privacy Policy (coming soon)</span>
                <span className="text-muted-foreground/30 text-xs select-none">Terms of Service (coming soon)</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/40">
              &copy; {new Date().getFullYear()} Imperium Roleplay. Not affiliated with Roblox Corporation or Horikoshi Kouhei.
            </p>
            <div className="flex items-center gap-5">
              <button onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")} className="text-xs text-muted-foreground/40 hover:text-secondary transition-colors">Discord</button>
              <button onClick={() => window.open(ROBLOX_URL, "_blank", "noopener,noreferrer")} className="text-xs text-muted-foreground/40 hover:text-accent transition-colors">Roblox</button>
              <Link href="/support" className="text-xs text-muted-foreground/40 hover:text-primary transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
