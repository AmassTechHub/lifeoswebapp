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

| Module | Route | Status |
|--------|-------|--------|
| Dashboard | `/dashboard` | Phase 1 — UI built |
| Goals | `/goals` | Placeholder |
| Planner | `/planner` | Placeholder |
| Calendar | `/calendar` | Placeholder |
| Tasks | `/tasks` | Placeholder |
| Habits | `/habits` | Placeholder |
| Learning | `/learning` | Placeholder |
| Content Hub | `/content` | Placeholder |
| Clients | `/clients` | Placeholder |
| Finance | `/finance` | Placeholder |
| AI Coach | `/coach` | Placeholder |
| Settings | `/settings` | Placeholder |

---

## Design

- **Style:** Minimal, premium, professional — Apple Calendar × Notion × Linear × ChatGPT
- **Colors:** Deep black `#0F172A`, slate `#334155`, electric blue `#3B82F6`, dark bg `#020617`
- **Font:** Inter

---

## Development phases

1. **Phase 1** — Core Life OS (4–6 weeks): Dashboard, Goals, Planner, Tasks, Auth
2. **Phase 2** — Learning + Client System (2–3 weeks)
3. **Phase 3** — Content Hub (2–3 weeks)
4. **Phase 4** — AI Coach (3–4 weeks)
5. **Phase 5** — AmassTechHub Intelligence (future)

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
