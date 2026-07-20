import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Bug, LogOut } from "lucide-react";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Bug className="w-6 h-6 text-purple-400" />
            <span className="font-bold text-lg tracking-tight">GitHub Issue Spider</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={user.user_metadata.avatar_url || "https://github.com/ghost.png"} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-white/20"
              />
              <span className="text-sm text-gray-300 hidden md:block">
                {user.user_metadata.user_name || user.email}
              </span>
            </div>
            
            <form action="/auth/signout" method="post">
              <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                <LogOut className="w-4 h-4" />
                <span className="hidden md:block">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
