# 🕷️ GitHub Issue Spider

GitHub Issue Spider is a scalable, automated background bot and SaaS application that crawls the open-source ecosystem with precision and delivers high-value GitHub issues directly to your Discord webhooks instantly.

Built with **Next.js**, **Supabase**, and **GitHub Actions**, it allows multiple users to set up custom "Hunting Rules" to filter issues by language, labels, and repository star counts, without blowing past API rate limits.

## ✨ Features

- **Authentication:** Secure GitHub OAuth login via Supabase.
- **Custom Rules Engine:** Filter GitHub issues by labels (e.g. `good first issue`), programming languages, and minimum repository star count.
- **Discord Integration:** Sends rich-embed Discord webhooks directly to your server the moment a matching issue is found.
- **Enterprise Security:** Uses AES-256-GCM cryptography to securely encrypt each user's Personal Access Token (PAT) in the database.
- **Zero Cost Scaling:** The background worker runs continuously and for free using GitHub Actions.

---

## 🚀 Getting Started Locally

### 1. Database Setup (Supabase)
Create a new project on [Supabase](https://supabase.com). Go to the SQL Editor and run the contents of the `schema.sql` file to create the necessary tables and Row Level Security (RLS) policies.

Ensure you also enable **GitHub OAuth** in your Supabase Authentication settings.

### 2. Environment Variables
Copy `.env.example` to `.env.local` and fill in your secrets:

```bash
cp .env.example .env.local
```

You will need:
- Your Supabase Project URL
- Your Supabase Anon Key
- Your Supabase Service Role Key (for the background worker to bypass RLS)
- An `ENCRYPTION_KEY` (Generate a random 32-character hex string)

### 3. Run the Frontend
Start the Next.js development server to access the landing page and dashboard:

```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

### 4. Run the Background Worker
To run the bot locally, open a separate terminal and execute:

```bash
npx tsx worker/bot.ts
```

---

## ☁️ Deployment

### Frontend (Vercel)
Deploy the Next.js app to Vercel easily. Ensure you add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ENCRYPTION_KEY` to your Vercel Environment Variables.
*Note: Make sure you add your deployed Vercel URL to the Supabase Authentication Redirect URLs allow-list!*

### Background Worker (GitHub Actions)
The background worker is configured to run automatically every 10 minutes via GitHub Actions. 
To enable it, simply add the following Repository Secrets in your GitHub repository settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
