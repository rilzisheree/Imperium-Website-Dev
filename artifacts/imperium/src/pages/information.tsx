import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Book, Shield, Skull, Zap, Users, Trophy, Scroll, Calendar, Flame } from "lucide-react";

export default function Information() {
  const categories = [
    { icon: Scroll, title: "Rules", desc: "Server guidelines and roleplay standards" },
    { icon: Book, title: "FAQ", desc: "Frequently asked questions" },
    { icon: Zap, title: "Beginner Guide", desc: "Getting started in Imperium" },
    { icon: Shield, title: "Hero Guide", desc: "Agency protocols and rankings" },
    { icon: Skull, title: "Villain Guide", desc: "Underworld operations" },
    { icon: Flame, title: "Quirks", desc: "Tier lists and awakening guides" },
    { icon: Users, title: "Departments", desc: "Support and management roles" },
    { icon: Trophy, title: "Ranks", desc: "Progression requirements" },
    { icon: Calendar, title: "Events", desc: "Upcoming lore events" }
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
              INFORMATION HUB
            </h1>
            <p className="text-lg text-muted-foreground">Everything you need to know about the world of Imperium.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="bg-background/40 border-white/10 hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all duration-300 h-full group">
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <cat.icon className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 font-heading">{cat.title}</h3>
                    <p className="text-sm text-muted-foreground">{cat.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}