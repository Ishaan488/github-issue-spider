"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Webhook, Tag, Code, Star, Clock, AlertCircle, Pause, Play, ExternalLink, Zap } from "lucide-react";

type Rule = {
  id: string;
  name: string;
  webhook_url: string;
  labels: string[];
  languages: string[];
  min_stars: number;
  is_active: boolean;
  last_run_timestamp: string | null;
};

type ProcessedIssue = {
  issue_id: number;
  repo_name: string;
  issue_title: string;
  issue_url: string;
  discovered_at: string;
  rule: { name: string };
};

export default function DashboardPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [recentMatches, setRecentMatches] = useState<ProcessedIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Token State
  const [hasToken, setHasToken] = useState<boolean>(true);
  const [githubToken, setGithubToken] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  
  
  // Form State
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [labels, setLabels] = useState("");
  const [languages, setLanguages] = useState("");
  const [minStars, setMinStars] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    fetchRules();
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const res = await fetch('/api/settings/token');
      if (res.ok) {
        const data = await res.json();
        setHasToken(data.hasToken);
      }
    } catch (e) {
      console.error("Error checking token:", e);
    }
  };

  const saveGithubToken = async () => {
    if (!githubToken) return;
    setSavingToken(true);
    try {
      const res = await fetch('/api/settings/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: githubToken })
      });
      const data = await res.json();
      if (data.success) {
        setHasToken(true);
        setGithubToken("");
        alert("GitHub Token saved securely!");
      } else {
        alert(data.error || "Error saving token");
      }
    } catch (e) {
      alert("Error saving token");
    }
    setSavingToken(false);
  };

  const fetchRules = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("rules")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching rules:", error);
        alert(`Error fetching rules: ${error.message}`);
      } else if (data) {
        setRules(data);
      }
      
      // Fetch recent matches
      const { data: matches } = await supabase
        .from("processed_issues")
        .select("*, rule:rules(name)")
        .order("discovered_at", { ascending: false })
        .limit(10);
      
      if (matches) {
        setRecentMatches(matches as any);
      }
    }
    setLoading(false);
  };

  const openModal = (rule?: Rule) => {
    if (rule) {
      setEditingRuleId(rule.id);
      setName(rule.name);
      setWebhookUrl(rule.webhook_url);
      setLabels(rule.labels.join(", "));
      setLanguages(rule.languages.join(", "));
      setMinStars(rule.min_stars);
    } else {
      setEditingRuleId(null);
      setName("");
      setWebhookUrl("");
      setLabels("");
      setLanguages("");
      setMinStars(0);
    }
    setIsModalOpen(true);
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newRule = {
      user_id: user.id,
      name,
      webhook_url: webhookUrl,
      labels: labels.split(",").map((l) => l.trim()).filter(Boolean),
      languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
      min_stars: minStars,
    };

    if (editingRuleId) {
      const { error } = await supabase.from("rules").update(newRule).eq("id", editingRuleId);
      if (error) {
        alert(`Error updating rule: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("rules").insert([newRule]);
      if (error) {
        alert(`Error creating rule: ${error.message}`);
        return;
      }
    }

    setIsModalOpen(false);
    fetchRules(false);
  };

  const deleteRule = async (id: string) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      await supabase.from("rules").delete().eq("id", id);
      fetchRules(false);
    }
  };

  const toggleRuleStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from("rules").update({ is_active: !currentStatus }).eq("id", id);
    fetchRules(false);
  };

  return (
    <div className="py-8">
      {!hasToken && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold">Action Required: GitHub Token Missing</p>
              <p className="text-sm opacity-80">Your bot will not work until you provide a GitHub Personal Access Token.</p>
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="password" 
              placeholder="ghp_xxxxxxxxxxxx" 
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              className="w-full md:w-64 bg-black/20 border border-red-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
            />
            <button 
              onClick={saveGithubToken}
              disabled={savingToken || !githubToken}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium whitespace-nowrap disabled:opacity-50"
            >
              {savingToken ? "Saving..." : "Save Token"}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Hunting Rules</h1>
          <p className="text-gray-400">Manage your automated GitHub issue crawlers.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Rule</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <p className="text-gray-400 mb-4">You don't have any rules set up yet.</p>
          <button
            onClick={() => openModal()}
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create your first rule
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AnimatePresence>
            {rules.map((rule) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-[#111] border ${rule.is_active ? 'border-white/10' : 'border-gray-800 opacity-60'} rounded-xl p-6 relative group transition-opacity`}
              >
                {!rule.is_active && (
                  <div className="absolute -top-3 -left-3 bg-gray-800 text-gray-400 text-xs font-bold px-2 py-1 rounded-md border border-gray-700 uppercase tracking-wider shadow-lg">
                    Paused
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleRuleStatus(rule.id, rule.is_active)} className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors" title={rule.is_active ? "Pause Rule" : "Resume Rule"}>
                    {rule.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-green-400" />}
                  </button>
                  <button onClick={() => openModal(rule)} className="p-2 bg-white/5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-md text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-xl font-semibold mb-4 pr-24">{rule.name}</h3>
                
                <div className="space-y-3 text-sm text-gray-300">
                  <div className="flex items-center gap-3">
                    <Webhook className="w-4 h-4 text-gray-500" />
                    <span className="truncate max-w-[200px] sm:max-w-[300px] opacity-70">{rule.webhook_url}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Tag className="w-4 h-4 text-gray-500" />
                    <div className="flex flex-wrap gap-1">
                      {rule.labels.map(l => (
                        <span key={l} className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs">{l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Code className="w-4 h-4 text-gray-500" />
                    <div className="flex flex-wrap gap-1">
                      {rule.languages.map(l => (
                        <span key={l} className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">{l}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-gray-500" />
                    <span>Min {rule.min_stars.toLocaleString()} stars</span>
                  </div>
                  {rule.last_run_timestamp && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Last run: {new Date(rule.last_run_timestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Recent Matches Section */}
      {!loading && recentMatches.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Recent Discoveries</h2>
          </div>
          
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="divide-y divide-white/5">
              {recentMatches.map((match) => (
                <a 
                  key={match.issue_id}
                  href={match.issue_url || `https://github.com/${match.repo_name}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 sm:p-6 hover:bg-white/[0.02] transition-colors group relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-500 truncate">{match.repo_name}</span>
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-purple-500/20 truncate">
                          {match.rule?.name || "Unknown Rule"}
                        </span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors flex items-center gap-2 truncate">
                        {match.issue_title || `Issue #${match.issue_id}`}
                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400" />
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 shrink-0">
                      <Clock className="w-4 h-4" />
                      {new Date(match.discovered_at).toLocaleString()}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <h2 className="text-xl font-semibold">{editingRuleId ? 'Edit Rule' : 'Create New Rule'}</h2>
              </div>
              <form onSubmit={saveRule} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Rule Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} type="text" placeholder="e.g. High-Value Frontend Bugs" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Discord Webhook URL</label>
                  <input required value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} type="url" placeholder="https://discord.com/api/webhooks/..." className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Labels (comma-separated)</label>
                  <input required value={labels} onChange={e => setLabels(e.target.value)} type="text" placeholder="bug, help wanted, good first issue" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Languages (comma-separated)</label>
                  <input required value={languages} onChange={e => setLanguages(e.target.value)} type="text" placeholder="TypeScript, Python, Rust" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Minimum Repository Stars</label>
                  <input required value={minStars} onChange={e => setMinStars(parseInt(e.target.value))} type="number" min="0" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium">{editingRuleId ? 'Save Changes' : 'Create Rule'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
