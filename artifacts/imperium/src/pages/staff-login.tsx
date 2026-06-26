import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useStaffLogin } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function StaffLogin() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const mutation = useStaffLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutation.mutate(
      { data: { username, password } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries();
          navigate("/staff/dashboard");
        },
        onError: (err: any) => {
          setError(err?.data?.error ?? "Invalid credentials. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,210,63,0.06)_0%,transparent_60%)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm mx-4 relative z-10"
      >
        <div className="text-center mb-8">
          <a href="/" className="inline-block font-black text-3xl text-primary tracking-widest mb-2 hover:text-primary/80 transition-colors">
            IMPERIUM
          </a>
          <p className="text-white/30 text-sm tracking-widest uppercase">Staff Portal</p>
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-xl font-bold text-white mb-6 text-center">Sign In</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 shadow-[0_0_20px_-5px_rgba(255,210,63,0.5)]"
            >
              {mutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 flex flex-col items-center gap-2">
          <a href="/" className="text-white/30 text-xs hover:text-primary transition-colors flex items-center gap-1.5">
            ← Return to Main Site
          </a>
          <p className="text-white/15 text-xs">Imperium Staff Portal — Authorized Personnel Only</p>
        </div>
      </motion.div>
    </div>
  );
}
