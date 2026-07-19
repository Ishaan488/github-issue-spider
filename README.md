# 🕷️ GitHub Issue Spider

A production-grade, highly configurable bot that crawls the open-source ecosystem for specific GitHub issues and delivers matches directly to your Discord webhooks. 

Instead of relying on the noisy and delayed GitHub Events firehose, this spider uses a precision-timed polling engine against the GitHub Search API. It features hot-reloading, local state persistence, and automatic API rate-limiting to ensure you never miss a high-value issue while remaining completely invisible to GitHub rate-limit bans.

## ✨ Features

* **Multi-Threaded Web Engine:** Run multiple "hunting profiles" concurrently. Send beginner front-end tasks to one Discord channel, and heavyweight Rust bugs to another.
* **Hot-Reloading Configuration:** Tweak your rules, languages, star limits, or webhooks in `config.json`. The bot updates instantly on the next cycle without requiring a process restart.
* **Persistent Memory:** Uses a local SQLite database (`better-sqlite3`) to track processed issues. It survives crashes and guarantees you will never receive duplicate Discord alerts.
* **Rate-Limit Safe:** Automatically paces requests with internal delays to respect GitHub's 30-requests-per-minute Search API limit.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher recommended)
* A **GitHub Personal Access Token (PAT)** (No special scopes required for public repositories)
* One or more **Discord Webhook URLs**

### 1. Installation

Clone the repository and install the required dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/github-issue-spider.git
cd github-issue-spider
npm install
npm install -D typescript @types/node @types/better-sqlite3 tsx
```

### 2. Environment Setup

Create a `.env` file in the root directory and add your GitHub token:

```env
GITHUB_TOKEN=your_personal_access_token_here
```

### 3. Rule Configuration

Copy the template configuration file:

```bash
cp config.example.json config.json
```

Edit `config.json` to define your crawl rules. You can add as many blocks as you want:

```json
{
  "rules": [
    {
      "name": "Frontend Beginner Tasks",
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "labels": ["good first issue", "help wanted"],
      "languages": ["TypeScript", "JavaScript", "HTML"],
      "minStars": 200
    },
    {
      "name": "High-Value Backend Bugs",
      "webhookUrl": "https://discord.com/api/webhooks/...",
      "labels": ["bug", "critical"],
      "languages": ["Python", "Go", "Rust"],
      "minStars": 1500
    }
  ]
}
```

---

## ⚙️ Running the Spider

Start the bot using `tsx`:

```bash
npx tsx bot.ts
```

**What happens next?**
1. The spider automatically creates a `spider.db` SQLite database in your directory.
2. It looks back 60 minutes on its first run to catch you up on recent issues.
3. It settles into a background cron cycle, checking for new issues every 2 minutes.
4. If you edit `config.json` while it is running, it will log a hot-reload notification and instantly apply your new filters.

---

## 🏗 Architecture & Security

* **Database:** Uses `better-sqlite3` in Write-Ahead Logging (WAL) mode for maximum performance.
* **API Polling vs Webhooks:** True webhooks require repository admin access. Because this spider crawls the entire GitHub ecosystem globally, it relies on the Search API.
* **Security:** `config.json`, `.env`, and local `.db` files are strictly ignored via `.gitignore` to prevent secret leakage.
