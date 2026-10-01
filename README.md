# Weighted — Grade & GPA Tracker

A personal gradebook for high-school students. Log quizzes and tests, see every class grade and your year and cumulative GPA update instantly, try out what-if scores, and find the exact score you need on your next test to reach a goal. If the goal is out of reach, it tells you that too.

Grading rules (same as the original spreadsheet):

- **Class grade** = 80% test average + 20% quiz average. If a class only has one type so far, that average is the grade.
- **GPA points**: 90+ → 4, 80+ → 3, 70+ → 2, 60+ → 1, else 0.
- **Weighted GPA**: AP/IB adds 1.0, Honors adds 0.5.
- **Year GPA** averages this year's classes. **Cumulative GPA** averages previous classes plus this year's.

## Features

- **Dashboard**: year and cumulative GPA (weighted and unweighted), a card for every class with its test and quiz averages, how far it is from the target, and the score needed on the next test. Also includes a chart of grades against targets.
- **Class page**: add, edit, and delete quizzes and tests, see each grade's impact on the class, add what-if grades, and use a built-in next-test calculator.
- **Calculator**: the score needed on the next test or quiz for any goal, with support for extra-credit max scores, the score needed for each letter grade, and a slider that shows how a score would change the class grade and year GPA.
- **What-if mode**: a header toggle that adds simulated grades to every number in the app.
- **History**: previous classes, GPA by period, and a one-click action that moves the current year into history.
- **Import**: reads `.xlsx` workbooks (Excel or Google Sheets downloads) with a summary tab and one tab per class, or a `.csv` for a single class.
- **Sync**: data autosaves to Netlify Database under a private tracker code. The same code or link opens the tracker on another device.

## Tech

TanStack Start (React 19, file-based routing, server functions), Tailwind CSS 4, Chart.js, Netlify Database (Postgres) with Drizzle ORM, and fflate for in-browser `.xlsx` parsing. Deployed on Netlify.

## Running locally

```bash
pnpm install
netlify dev          # runs Vite plus the Netlify emulation, including the database
```

Database migrations live in `netlify/database/migrations/` and are applied automatically on deploy. After changing `db/schema.ts`, run `npx drizzle-kit generate --name <change>`.
