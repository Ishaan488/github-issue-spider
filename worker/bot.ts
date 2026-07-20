import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Load from both Next.js default locations
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// We MUST use the service role key to bypass RLS in the background worker
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase URL or Service Role Key in environment variables.");
  console.error("Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file.");
  process.exit(1);
}
if (!GITHUB_TOKEN) {
  console.warn("⚠️ No GITHUB_TOKEN found. The bot will run unauthenticated (limited to 10 requests per minute).");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface HuntingRule {
  id: string;
  name: string;
  webhook_url: string;
  labels: string[];
  languages: string[];
  min_stars: number;
  last_run_timestamp: string | null;
}

// --- UTILITIES ---
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendDiscordAlert(rule: HuntingRule, title: string, url: string, repoName: string, stars: number, language: string) {
  const payload = {
    embeds: [{
      title: `🎯 ${rule.name}`,
      url: url,
      color: 2067276,
      fields: [
        { name: "Repository", value: `[${repoName}](https://github.com/${repoName})`, inline: true },
        { name: "Language", value: language || "Unspecified", inline: true },
        { name: "Stars ⭐", value: stars.toLocaleString(), inline: true },
        { name: "Issue Context", value: title, inline: false }
      ],
      footer: { text: `GitHub Spider • ${new Date().toISOString()}` }
    }]
  };

  try {
    await fetch(rule.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error(`❌ Discord Alert failed for rule [${rule.name}]:`, error);
  }
}

// --- CORE SYSTEM PIPELINE ---
async function processRule(rule: HuntingRule) {
  let lookupTimestamp: string;
  if (rule.last_run_timestamp) {
    lookupTimestamp = rule.last_run_timestamp;
  } else {
    const defaultBackdate = new Date();
    defaultBackdate.setMinutes(defaultBackdate.getMinutes() - 60); // 1 hour lookback
    lookupTimestamp = defaultBackdate.toISOString();
  }

  const currentExecutionTime = new Date().toISOString();

  const labelQuery = rule.labels.map(l => `label:"${l}"`).join(' ');
  const languageQuery = rule.languages.map(lang => `language:${lang}`).join(' ');
  const baseSearchQuery = `is:issue is:open ${labelQuery} ${languageQuery} created:>=${lookupTimestamp}`;

  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(baseSearchQuery)}&sort=created&order=asc&per_page=100`;

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error(`❌ GitHub API Error for rule [${rule.name}]: ${response.status} ${response.statusText}`);
      return;
    }

    const data = await response.json() as any;

    for (const item of data.items || []) {
      // Check if processed
      const { data: existing } = await supabase
        .from('processed_issues')
        .select('issue_id')
        .eq('issue_id', item.id)
        .eq('rule_id', rule.id)
        .maybeSingle();

      if (existing) continue;

      const repoPath = item.repository_url.replace('https://api.github.com/repos/', '');

      // Fetch repo details for star validation
      const repoRes = await fetch(item.repository_url, { headers });

      if (repoRes.ok) {
        const repoData = await repoRes.json() as any;
        if (repoData.stargazers_count >= rule.min_stars) {
          console.log(`🎯 Match for [${rule.name}]: ${repoPath}`);
          await sendDiscordAlert(rule, item.title, item.html_url, repoPath, repoData.stargazers_count, repoData.language);
        }
      }

      // Mark processed
      await supabase.from('processed_issues').insert([{
        issue_id: item.id,
        repo_name: repoPath,
        rule_id: rule.id,
        discovered_at: new Date().toISOString()
      }]);
    }

    // Update last run time
    await supabase
      .from('rules')
      .update({ last_run_timestamp: currentExecutionTime })
      .eq('id', rule.id);

  } catch (error) {
    console.error(`❌ Error processing rule [${rule.name}]:`, error);
  }
}

async function masterCron() {
  console.log("\n--- Starting Global Scan Cycle ---");
  
  const { data: rules, error } = await supabase.from('rules').select('*');
  
  if (error || !rules || rules.length === 0) {
    console.log("⚠️ No active rules found across all users. Waiting...");
    return;
  }

  console.log(`Tracking ${rules.length} active rules globally.`);

  for (const rule of rules) {
    await processRule(rule);
    // 10-second delay between rules to respect GitHub's Search API rate limit (30 requests/min)
    await sleep(10000);
  }
}

// --- INITIALIZATION ---
console.log("🚀 Booting Up Global Supabase Bot Engine...");
masterCron();
setInterval(masterCron, 120000); // Run cycle every 2 minutes