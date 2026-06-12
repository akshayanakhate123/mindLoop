# Mindloop

**Master guesstimate interviews through daily streaks.**

Mindloop is a focused interview-prep tool for consulting, product, and analytics roles. It serves one guesstimate question per day, evaluates your answer with AI, and tracks your progress through streaks — so you build the habit, not just the knowledge.

---

## What it does

- **Daily guesstimate challenges** across Finance, Marketing, Product, Sales, and Generalist domains
- **AI-powered evaluation** — accuracy scored against a reference answer range, structure scored independently
- **Clarification practice** — ask clarifying questions before answering, just like in a real interview
- **Streak system** — commit to 7, 14, or 30-day streaks; streaks expire if you miss a day
- **Progress tracking** — history timeline, insights charts, activity heatmap
- **Bookmarks** — save hard questions to revisit later

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Auth | Supabase (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| AI | Groq — `llama-3.3-70b-versatile` |
| Animations | Framer Motion |
| Icons | Lucide React |
| Styling | CSS Modules |

---

## Getting started locally

### 1. Clone and install

```bash
git clone https://github.com/akshayanakhate123/mindLoop.git
cd mindLoop
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
```

- **Supabase** — create a project at [supabase.com](https://supabase.com), enable Google OAuth under Authentication > Providers, add `http://localhost:3000/auth/callback` to the allowed redirect URLs
- **Groq** — get a free API key at [console.groq.com](https://console.groq.com)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project structure

```
src/
  app/
    home/          # Dashboard — streaks, activity, hero banner
    question/      # Challenge page — answer + clarify flow
    feedback/      # Results page — scores, AI breakdown
    challenges/    # Today's solved challenges
    insights/      # Progress charts
    history/       # Full session timeline
    bookmarks/     # Saved questions
    profile/       # Account + achievements
    api/
      evaluate/    # POST — score an answer with Groq
      clarify/     # POST — handle clarifying questions
  data/
    guesstimates/  # 500 questions across 5 domains
    references/    # Answer benchmarks per question
  lib/
    db.ts          # localStorage + Supabase sync layer
    supabase/      # Auth client setup
```

---

## Deployment

Deployed on Vercel. Set the same three environment variables in the Vercel dashboard under Project > Settings > Environment Variables. Add your Vercel deployment URL to Supabase's allowed redirect URLs.

---

## License

MIT
