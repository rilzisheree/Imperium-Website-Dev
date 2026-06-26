import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function About() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 border-b border-primary/20 pb-4">
            ABOUT IMPERIUM
          </h1>
          <div className="prose prose-invert prose-yellow max-w-none">
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Imperium is a premium, cinematic roleplay experience set in the My Hero Academia universe on Roblox. 
              We focus on deep, story-driven progression where every player's choices matter.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
              {[
                { title: "Heroes", desc: "Uphold peace and justice. Climb the billboard charts through heroic deeds." },
                { title: "Villains", desc: "Shape the underworld. Form syndicates and challenge the status quo." },
                { title: "Students", desc: "Attend the prestigious academy. Train your quirks and prepare for the future." },
                { title: "Civilians", desc: "The backbone of society. Influence the economy and public opinion." }
              ].map((section, i) => (
                <Card key={i} className="bg-background/50 border-white/10 hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-2 font-heading">{section.title}</h3>
                    <p className="text-muted-foreground">{section.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}