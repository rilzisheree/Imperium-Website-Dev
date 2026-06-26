import { useEffect, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, useScroll, useTransform } from "framer-motion";
import orangeServerImg from "@assets/image_1782497587581.png";

const DISCORD_URL = "https://discord.gg/7GMcWzJu28";

const features = [
  {
    title: "Story-Driven Roleplay",
    desc: "Immerse yourself in a narrative that evolves based on community actions. Every event has consequences that ripple through the lore.",
    icon: "📖",
  },
  {
    title: "Hero & Villain Progression",
    desc: "Start as a student or thug and climb the ranks through missions, exams, and decisive battles.",
    icon: "⚡",
  },
  {
    title: "Frequent Lore Events",
    desc: "Experience scheduled and surprise lore events that permanently shape the world and its factions.",
    icon: "🌐",
  },
  {
    title: "Active Community",
    desc: "Join thousands of passionate roleplayers who breathe life into the Imperium universe every day.",
    icon: "👥",
  },
  {
    title: "Player Choices Matter",
    desc: "Your allegiance, quirk mastery, and alliances will shape the very foundation of society.",
    icon: "⚖",
  },
];

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-8 right-8 z-50 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_20px_rgba(255,210,63,0.4)] hover:bg-primary/90 transition-colors pointer-events-auto"
      aria-label="Back to top"
      style={{ pointerEvents: visible ? "auto" : "none" }}
    >
      ↑
    </motion.button>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <Layout>
      <BackToTop />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        <motion.div
          style={{ y: heroY }}
          className="absolute inset-0 bg-background"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,210,63,0.18)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(0,217,255,0.06)_0%,transparent_40%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.1em" }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <h1 className="text-7xl md:text-9xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tight mb-4 drop-shadow-2xl select-none">
                IMPERIUM
              </h1>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-lg md:text-2xl text-primary font-semibold tracking-[4px] mb-6 drop-shadow-[0_0_12px_rgba(255,210,63,0.6)] uppercase"
            >
              A My Hero Academia Lore Experience on Roblox
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-muted-foreground max-w-2xl mx-auto mb-12 text-base md:text-lg leading-relaxed"
            >
              Step into a living, breathing world where your choices matter.
              Join the ranks of elite heroes, formidable villains, or ordinary citizens caught in the crossfire.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="flex flex-wrap justify-center gap-4"
            >
              <Button
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-14 shadow-[0_0_30px_-5px_rgba(255,210,63,0.6)] font-bold tracking-wide"
                onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
              >
                Join Discord
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 text-base px-8 h-14"
                onClick={() => document.getElementById("about-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-white/20 text-xs uppercase tracking-widest">Scroll</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-px h-8 bg-gradient-to-b from-primary/60 to-transparent"
            />
          </motion.div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="about-section" className="py-24 bg-card/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(255,210,63,0.03),transparent)]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-primary text-sm tracking-[4px] uppercase font-semibold mb-4">What Awaits You</p>
            <h2 className="text-4xl md:text-5xl font-heading font-black text-white mb-4">FORGE YOUR PATH</h2>
            <div className="w-24 h-1 bg-primary mx-auto shadow-[0_0_12px_rgba(255,210,63,0.6)] rounded-full" />
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-background/40 backdrop-blur-sm border-white/8 hover:border-primary/50 transition-all duration-300 group h-full hover:shadow-[0_0_30px_-10px_rgba(255,210,63,0.3)]">
                  <CardContent className="p-8 h-full flex flex-col">
                    <div className="text-3xl mb-5 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-3 font-heading group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed flex-1">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="py-20 border-y border-white/5 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,210,63,0.025)_50%,transparent_75%)] bg-[length:250%_250%]" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-primary/60 text-xs uppercase tracking-[4px]">Live Statistics</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Favorites", icon: "❤" },
              { label: "Total Visits", icon: "👁" },
              { label: "Likes", icon: "👍" },
              { label: "Current Players", icon: "🎮" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center group"
              >
                <div className="text-2xl mb-2 opacity-50 group-hover:opacity-100 transition-opacity">{stat.icon}</div>
                <span className="text-4xl md:text-5xl font-heading font-black text-primary mb-2 drop-shadow-[0_0_8px_rgba(255,210,63,0.4)] tracking-widest">
                  ???
                </span>
                <span className="text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roblox Game Section */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.06)_0%,transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <p className="text-accent text-sm tracking-[4px] uppercase font-semibold mb-4">Coming Soon</p>
              <h2 className="text-4xl md:text-5xl font-heading font-black text-white mb-4">IN DEVELOPMENT</h2>
              <p className="text-white/40 text-lg max-w-xl mx-auto">
                Imperium is currently under development. The world is being built — stay tuned for the official launch on Roblox.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/3 border border-accent/20 rounded-2xl p-8 backdrop-blur-sm hover:border-accent/40 transition-all duration-300 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)]"
            >
              {/* Game banner */}
              <div className="w-full h-48 md:h-64 rounded-xl mb-8 overflow-hidden">
                <img src={orangeServerImg} alt="Imperium" className="w-full h-full object-cover" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Favorites", value: "???" },
                  { label: "Visits", value: "???" },
                  { label: "Likes", value: "???" },
                  { label: "Players", value: "???" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-2xl font-black text-primary font-heading">{s.value}</p>
                    <p className="text-white/40 text-xs uppercase tracking-wider mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="bg-accent text-white hover:bg-accent/90 text-base px-10 h-13 shadow-[0_0_25px_-5px_rgba(59,130,246,0.5)] font-bold opacity-50 cursor-not-allowed"
                  disabled
                >
                  Launching Soon
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5 text-base px-10 h-13"
                  onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
                >
                  Join Community
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Discord Section */}
      <section className="py-24 bg-card/30 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,217,255,0.05)_0%,transparent_60%)]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-secondary text-sm tracking-[4px] uppercase font-semibold mb-4">Community</p>
              <h2 className="text-4xl md:text-5xl font-heading font-black text-white mb-6">JOIN THE DISCORD</h2>
              <p className="text-white/40 text-lg mb-10 max-w-xl mx-auto">
                Connect with thousands of heroes and villains. Get real-time updates, participate in events, and build lasting alliances.
              </p>

              {/* Discord widget placeholder */}
              <div className="bg-[#36393F]/60 border border-secondary/20 rounded-2xl p-6 mb-8 max-w-sm mx-auto backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-lg">I</div>
                  <div className="text-left">
                    <p className="text-white font-bold text-sm">Imperium</p>
                    <p className="text-white/40 text-xs">Official Server</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" />
                    <span className="text-white/60">Members Online</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold"
                  onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
                >
                  Join Server
                </Button>
              </div>

              <Button
                size="lg"
                variant="outline"
                className="border-secondary/50 text-secondary hover:bg-secondary/10 text-base px-10 h-14 shadow-[0_0_20px_-5px_rgba(0,217,255,0.2)]"
                onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
              >
                discord.gg/7GMcWzJu28
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
