"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Mail, ChevronDown } from "lucide-react";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

type ProfileDropdownProps = {
  user: any;
};

export default function ProfileDropdown({ user }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const avatarUrl = user.user_metadata.avatar_url || "https://github.com/ghost.png";
  const userName = user.user_metadata.user_name || "GitHub User";
  const email = user.email || "";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 pr-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/50"
      >
        <img
          src={avatarUrl}
          alt="Avatar"
          className="w-8 h-8 rounded-full border border-white/20"
        />
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Animated Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-64 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header / Profile Info */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border border-purple-500/30"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-gray-100 truncate">{user.user_metadata.full_name || userName}</span>
                  <span className="text-xs text-purple-400 font-mono truncate">@{userName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-black/40 rounded-lg p-2 border border-white/5">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 space-y-1">
              <a
                href={`https://github.com/${userName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 w-full p-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <GithubIcon className="w-4 h-4 text-gray-400" />
                View GitHub Profile
              </a>
              
              <div className="h-px w-full bg-white/10 my-1"></div>
              
              <form action="/auth/signout" method="post" className="w-full">
                <button 
                  type="submit"
                  className="flex items-center gap-3 w-full p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
