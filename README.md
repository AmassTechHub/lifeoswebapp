# Life OS

**The Operating System For Your Life**

Repository: [github.com/AmassTechHub/lifeoswebapp](https://github.com/AmassTechHub/lifeoswebapp)

An AI-powered Personal Operating System for ambitious students, creators, founders, and professionals.

> *Every day, Life OS should help you know exactly what matters most and help you execute it.*

**First user:** Theophilus Amankwah  
**Platform:** Web app (Next.js) — mobile comes later

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui patterns |
| Backend | Next.js Server Actions + API Routes |
| Database | PostgreSQL + Prisma |
| Auth | Better Auth |
| AI | OpenAI (Phase 4) |
| Storage | Supabase Storage (optional) |
| Hosting | Vercel |

---

## Quick start

```bash
cd LifeOS
npm install
cp .env.example .env
# Set DATABASE_URL and BETTER_AUTH_SECRET
npm run db:generate
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard`.

---

## Modules

Sidebar is grouped: **Today** → **Study & Create** → **Life** → **Assistant**.

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | `/dashboard` | Live — command center |
| Focus | `/focus` | Live — lock-in timer (fullscreen) |
| Goals | `/goals` | Live |
| Tasks | `/tasks` | Live |
| Habits | `/habits` | Live |
| Learning | `/learning` | Live — notes, summaries, uploads, flashcards |
| Content Hub | `/content` | Live — idea → published pipeline |
| Finance | `/finance` | Live |
| AI Coach | `/coach` | Live — chat (needs `OPENAI_API_KEY`) |
| Planner | `/planner` | Live — automated daily setup |
| Calendar | `/calendar` | Live |
| Clients | `/clients` | Live — deliverables & deadlines |
| Settings | `/settings` | Live |

---

## Design

- **Style:** Minimal, premium, professional — Apple Calendar × Notion × Linear × ChatGPT
- **Colors:** Deep black `#0F172A`, slate `#334155`, electric blue `#3B82F6`, dark bg `#020617`
- **Font:** Inter

---

## Daily automation

1. Add tasks, habits, clients, study courses, and content in Life OS
2. Open **Planner** → **Run daily setup** (or use the dashboard quick action)
3. Life OS generates today&apos;s calendar blocks, focus list, and daily score
4. Optional: upload a timetable image (uses OpenAI vision when `OPENAI_API_KEY` is set)

All features are built inside `LifeOS/` — no imports from other projects.

---

## Project structure

```
LifeOS/
├── src/
│   ├── app/
│   │   ├── (app)/          # Main app with sidebar layout
│   │   │   ├── dashboard/
│   │   │   ├── goals/
│   │   │   ├── tasks/
│   │   │   └── ...
│   │   └── api/auth/       # Better Auth routes
│   ├── components/
│   │   ├── dashboard/
│   │   ├── layout/
│   │   └── ui/
│   ├── config/
│   └── lib/
├── prisma/
│   └── schema.prisma
└── .env.example
```

---

## Note

This is the **web app** in `LifeOS/`. The older Expo mobile prototype lives in `LifeOS app/` and is separate from this project.
