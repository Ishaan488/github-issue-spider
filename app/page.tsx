"use client";

import { motion } from "framer-motion";
import { Github, Bug, Zap, Webhook } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function LandingPage() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative font-sans">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-20 relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-gray-300 mb-8"
        >
          <Bug className="w-4 h-4 text-purple-400" />
          <span>Never miss a high-value issue again</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-8"
        >
          The Ultimate <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
            GitHub Issue Spider
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12"
        >
          Crawl the open-source ecosystem with precision. Deliver high-value GitHub issues directly to your Discord webhooks instantly. Rate-limit safe and completely automated.
        </motion.p>

        <motion.button
          onClick={handleLogin}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)]"
        >
          <Github className="w-6 h-6" />
          Login with GitHub
        </motion.button>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 text-left w-full">
          <FeatureCard 
            icon={<Zap className="w-6 h-6 text-yellow-400" />}
            title="Lightning Fast"
            description="Precision-timed polling engine ensures you get notified before anyone else."
            delay={0.4}
          />
          <FeatureCard 
            icon={<Webhook className="w-6 h-6 text-green-400" />}
            title="Discord Integration"
            description="Beautiful, rich-embed alerts sent directly to your channels."
            delay={0.5}
          />
          <FeatureCard 
            icon={<Bug className="w-6 h-6 text-red-400" />}
            title="Custom Rules"
            description="Filter by language, minimum stars, labels, and more. Catch exactly what you want."
            delay={0.6}
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
    >
      <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-200">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </motion.div>
  )
}
