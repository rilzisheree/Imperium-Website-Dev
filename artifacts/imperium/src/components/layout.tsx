import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

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
            {[
              { href: "/", label: "Home" },
              { href: "/about", label: "About" },
              { href: "/information", label: "Information" },
              { href: "/support", label: "Support" },
              { href: "/updates", label: "Updates" },
              { href: "/staff", label: "Staff" }
            ].map(link => (
              <Link 
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${location === link.href ? "text-primary" : "text-muted-foreground"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="hidden sm:flex border-secondary/50 text-secondary hover:bg-secondary/10 hover:text-secondary shadow-[0_0_15px_-3px_rgba(0,217,255,0.2)]">
              Join Discord
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_-3px_rgba(255,210,63,0.4)]">
              Play Now
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
            <Link href="/about" className="text-muted-foreground hover:text-primary">About</Link>
            <Link href="/information" className="text-muted-foreground hover:text-primary">Information</Link>
            <Link href="/support" className="text-muted-foreground hover:text-primary">Support</Link>
          </div>
          <p className="text-xs text-muted-foreground/50">
            &copy; {new Date().getFullYear()} Imperium Roleplay. Not affiliated with Roblox Corporation or Horikoshi Kouhei.
          </p>
        </div>
      </footer>
    </div>
  );
}