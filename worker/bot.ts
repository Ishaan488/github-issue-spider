import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'spider.db');
const CONFIG_PATH = path.join(__dirname, 'config.json');

if (!GITHUB_TOKEN) {
  console.error("❌ Missing GITHUB_TOKEN in .env file.");
  process.exit(1);
}

// --- CONFIGURATION ENGINE ---
interface HuntingRule {
  name: string;
  webhookUrl: string;
  labels: string[];
  languages: string[];
  minStars: number;
}

interface AppConfig {
  rules: HuntingRule[];
}

let activeConfig: AppConfig = { rules: [] };

function loadConfig() {
  try {
    const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    activeConfig = JSON.parse(rawData);
    console.log(`\n⚙️ Config loaded successfully. Tracking ${activeConfig.rules.length} active rules.`);
  } catch (error) {
    console.error("❌ Failed to parse config.json. Ensure it is valid JSON.", error);
  }
}

// Hot-reload configuration when the user saves changes to config.json
fs.watch(CONFIG_PATH, (eventType) => {
  if (eventType === 'change') {
    console.log("\n🔄 config.json change detected. Hot-reloading preferences...");
    loadConfig();
  }
});

// Initial load
loadConfig();

// --- DATABASE STATE MANAGEMENT ---
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS processed_issues (
    issue_id INTEGER PRIMARY KEY,
    repo_name TEXT NOT NULL,
    discovered_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bot_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const isIssueProcessed = db.prepare('SELECT 1 FROM processed_issues WHERE issue_id = ?');
const markIssueProcessed = db.prepare('INSERT INTO processed_issues (issue_id, repo_name, discovered_at) VALUES (?, ?, ?)');
const getLastRunTime = db.prepare('SELECT value FROM bot_state WHERE key = ?');
const updateLastRunTime = db.prepare('INSERT OR REPLACE INTO bot_state (key, value) VALUES (?, ?)');

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
    await fetch(rule.webhookUrl, {
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
  const stateKey = `last_run_${rule.name}`;
  const lastRunState = getLastRunTime.get(stateKey) as { value: string } | undefined;

  let lookupTimestamp: string;
  if (lastRunState?.value) {
    lookupTimestamp = lastRunState.value;
  } else {
    const defaultBackdate = new Date();
    defaultBackdate.setMinutes(defaultBackdate.getMinutes() - 60); // 1 hour lookback for new rules
    lookupTimestamp = defaultBackdate.toISOString();
  }

  const currentExecutionTime = new Date().toISOString();

  const labelQuery = rule.labels.map(l => `label:"${l}"`).join(' ');
  const languageQuery = rule.languages.map(lang => `language:${lang}`).join(' ');
  const baseSearchQuery = `is:issue is:open ${labelQuery} ${languageQuery} created:>=${lookupTimestamp}`;

  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(baseSearchQuery)}&sort=created&order=asc&per_page=100`;

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!response.ok) return;

    const data = await response.json() as any;

    for (const item of data.items || []) {
      if (isIssueProcessed.get(item.id)) continue;

      const repoPath = item.repository_url.replace('https://api.github.com/repos/', '');

      // Fetch repo details for star validation
      const repoRes = await fetch(item.repository_url, {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
      });

      if (repoRes.ok) {
        const repoData = await repoRes.json() as any;
        if (repoData.stargazers_count >= rule.minStars) {
          console.log(`🎯 Match for [${rule.name}]: ${repoPath}`);
          await sendDiscordAlert(rule, item.title, item.html_url, repoPath, repoData.stargazers_count, repoData.language);
        }
      }

      markIssueProcessed.run(item.id, repoPath, new Date().toISOString());
    }

    updateLastRunTime.run(stateKey, currentExecutionTime);

  } catch (error) {
    console.error(`❌ Error processing rule [${rule.name}]:`, error);
  }
}

async function masterCron() {
  if (activeConfig.rules.length === 0) {
    console.log("⚠️ No rules defined in config.json. Waiting...");
    return;
  }

  console.log(`\n--- Starting Scan Cycle for ${activeConfig.rules.length} rules ---`);

  for (const rule of activeConfig.rules) {
    await processRule(rule);
    // 10-second delay between rules to respect GitHub's Search API rate limit (30 requests/min)
    await sleep(10000);
  }
}

// --- INITIALIZATION ---
console.log("🚀 Booting Up Configurable GitHub Spider...");
masterCron();
setInterval(masterCron, 120000); // Run cycle every 2 minutes