import dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

if (!GITHUB_TOKEN || !DISCORD_WEBHOOK_URL) {
  console.error("❌ Missing environment variables (GITHUB_TOKEN or DISCORD_WEBHOOK_URL).");
  process.exit(1);
}

// --- HUNTING CONFIGURATION ---
const TARGET_LABELS = ["good first issue", "help wanted"];
const TARGET_LANGUAGES = ["TypeScript", "JavaScript", "Python", "Go", "Rust"];
const MIN_STARS = 500;
const POLL_INTERVAL_MS = 60000; // 60 seconds (GitHub allows 5000 req/hr; 1/min is very safe)

// --- CACHE & STATE ---
let lastEtag: string | null = null;
const seenIssues = new Set<number>();

// --- TYPES ---
interface GitHubEvent {
  type: string;
  repo: { name: string };
  payload: {
    action: string;
    issue?: {
      id: number;
      title: string;
      html_url: string;
      labels: { name: string }[];
    };
  };
}

interface RepoDetails {
  stargazers_count: number;
  language: string | null;
}

// --- CORE FUNCTIONS ---
async function getRepoDetails(repoName: string): Promise<RepoDetails | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoName}`, {
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (response.status === 200) {
      const data = await response.json() as any;
      return {
        stargazers_count: data.stargazers_count || 0,
        language: data.language
      };
    }
  } catch (error) {
    console.error(`❌ Error fetching repo details for ${repoName}:`, error);
  }
  return null;
}

async function sendDiscordAlert(title: string, url: string, repoName: string, stars: number, language: string) {
  const payload = {
    embeds: [{
      title: "🎯 New High-Value Issue Found!",
      url: url,
      color: 3066993, // GitHub Green
      fields: [
        { name: "Repository", value: repoName, inline: true },
        { name: "Language", value: language || "Unknown", inline: true },
        { name: "Stars ⭐", value: stars.toString(), inline: true },
        { name: "Issue", value: title, inline: false }
      ],
      footer: { text: `GitHub Sniper Bot • ${new Date().toLocaleTimeString()}` }
    }]
  };

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) console.error(`❌ Discord Webhook Error: ${res.status}`);
  } catch (error) {
    console.error("❌ Failed to send Discord alert:", error);
  }
}

async function pollGitHubEvents() {
  // Prevent memory leaks for long-running bots
  if (seenIssues.size > 5000) {
    seenIssues.clear();
    console.log("🧹 Cleared issue cache to free memory.");
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  if (lastEtag) headers['If-None-Match'] = lastEtag;

  try {
    const response = await fetch('https://api.github.com/events?per_page=100', { headers });

    if (response.status === 304) {
      process.stdout.write("\x1b[2m.\x1b[0m"); // Dim dot for unchanged data
      return;
    }

    const etag = response.headers.get('etag');
    if (etag) lastEtag = etag;

    if (response.status !== 200) {
      // Check for rate limiting
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining === "0") {
        console.warn("\n⚠️ GitHub API rate limit exceeded. Waiting for reset...");
      } else {
        console.error(`\n❌ GitHub API returned status: ${response.status}`);
      }
      return;
    }

    const events = await response.json() as GitHubEvent[];
    process.stdout.write("\x1b[32m✓\x1b[0m"); // Green checkmark for new data processed

    for (const event of events) {
      if (event.type === 'IssuesEvent' && event.payload.issue) {
        const action = event.payload.action;
        const issue = event.payload.issue;

        // Only process newly opened or newly labeled issues
        if ((action === 'opened' || action === 'labeled') && !seenIssues.has(issue.id)) {
          
          const labels = issue.labels.map(l => l.name.toLowerCase());
          const hasMatchingLabel = labels.some(label => TARGET_LABELS.includes(label));

          if (hasMatchingLabel) {
            const repoName = event.repo.name;
            const repoInfo = await getRepoDetails(repoName);

            if (
              repoInfo && 
              repoInfo.stargazers_count >= MIN_STARS && 
              repoInfo.language
            //   TARGET_LANGUAGES.includes(repoInfo.language)
            ) {
              console.log(`\n🎯 MATCH! ${repoName} | ⭐ ${repoInfo.stargazers_count} | ${repoInfo.language}`);
              console.log(`Sending alert for: ${issue.title}`);
              
              await sendDiscordAlert(
                issue.title,
                issue.html_url,
                repoName,
                repoInfo.stargazers_count,
                repoInfo.language
              );
            }
            
            // Mark as seen regardless of if it passed the final repo filter
            // so we don't waste API calls re-fetching repo details on the next poll
            seenIssues.add(issue.id);
          }
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Error during poll cycle:", error);
  }
}

// --- INITIALIZATION ---
console.log("🚀 Starting GitHub Sniper Bot...");
console.log(`Targeting: ${TARGET_LABELS.join(', ')}`);
// console.log(`Languages: ${TARGET_LANGUAGES.join(', ')}`);
console.log(`Min Stars: ${MIN_STARS}`);

pollGitHubEvents();
setInterval(pollGitHubEvents, POLL_INTERVAL_MS);