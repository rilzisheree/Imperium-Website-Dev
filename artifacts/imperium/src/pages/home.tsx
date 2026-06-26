import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

const DISCORD_URL = "https://discord.gg/7GMcWzJu28";

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,210,63,0.15)_0%,transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />

        <div className="container mx-auto px-4 z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-6xl md:text-8xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 tracking-tighter mb-4 drop-shadow-2xl">
              IMPERIUM
            </h1>
            <p className="text-xl md:text-2xl text-primary font-medium tracking-wide mb-8 drop-shadow-[0_0_10px_rgba(255,210,63,0.5)]">
              A MY HERO ACADEMIA LORE EXPERIENCE
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
              Step into a living breathing world where your choices matter.
              Join the ranks of elite heroes, formidable villains, or ordinary citizens caught in the crossfire.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                className="border-secondary text-secondary hover:bg-secondary/10 text-lg px-8 h-14 shadow-[0_0_20px_-5px_rgba(0,217,255,0.3)]"
                onClick={() => window.open(DISCORD_URL, "_blank", "noopener,noreferrer")}
              >
                Join Discord
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="py-24 bg-card/50 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">FORGE YOUR PATH</h2>
            <div className="w-24 h-1 bg-primary mx-auto shadow-[0_0_10px_rgba(255,210,63,0.5)]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Story-Driven Roleplay",
                desc: "Immerse yourself in a narrative that evolves based on community actions. Every event has consequences."
              },
              {
                title: "Hero & Villain Progression",
                desc: "Start as a student or thug and climb the ranks through missions, exams, and decisive battles."
              },
              {
                title: "Player Choices Matter",
                desc: "Your allegiance, your quirk mastery, and your alliances will shape the very foundation of society."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
              >
                <Card className="bg-background/40 backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all duration-300 group">
                  <CardContent className="p-8">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                      <div className="w-6 h-6 rounded-full bg-primary shadow-[0_0_15px_rgba(255,210,63,0.8)]" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 font-heading">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="py-20 border-y border-white/5 bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,210,63,0.03)_50%,transparent_75%)] bg-[length:250%_250%]" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Active Players" },
              { label: "Unique Quirks" },
              { label: "Lore Events" },
              { label: "Agencies" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-4xl md:text-5xl font-heading font-bold text-primary mb-2 drop-shadow-[0_0_8px_rgba(255,210,63,0.4)] tracking-widest">
                  ???
                </span>
                <span className="text-sm md:text-base text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
