import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const DISCORD_URL = "https://discord.gg/7GMcWzJu28";

const navLinks = [
  { href: "/", label: "Home", active: true },
  { href: "/about", label: "About", active: false, comingSoon: true },
  { href: "/support", label: "Support", active: true },
  { href: "/updates", label: "Updates", active: true },
  { href: "/staff", label: "Staff", active: true },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans selection:bg-primary/30">
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-heading font-bold text-2xl tracking-wider text-primary hover:text-primary/80 transition-colors drop-shadow-[0_0_8px_rgba(255,210,63,0.3)]">
            IMPERIUM
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => {
              if (link.comingSoon) {
                return (
                  <div key={link.href} className="relative group">
                    <span className="text-sm font-medium text-muted-foreground/40 cursor-not-allowed select-none">
                      {link.label}
                    </span>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 border border-white/10 text-white/60 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Coming Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="hidden sm:flex border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary shadow-[0_0_15px_-3px_rgba(0,217,255,0.2)]"
              onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
            >
              Join Discord
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-white/5 bg-card py-12 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-heading font-bold text-xl text-primary mb-4 tracking-widest">IMPERIUM</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            A premium My Hero Academia lore roleplay experience on Roblox.
            Join the agency, build your legacy, and shape the future.
          </p>
          <div className="flex justify-center gap-6 mb-8 text-sm">
            <span className="text-muted-foreground/30 cursor-not-allowed select-none">About</span>
            <Link href="/support" className="text-muted-foreground hover:text-primary">Support</Link>
            <Link href="/updates" className="text-muted-foreground hover:text-primary">Updates</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Imperium Roleplay. Not affiliated with Roblox Corporation or Horikoshi Kouhei.
          </p>
        </div>
      </footer>
    </div>
  );
}
