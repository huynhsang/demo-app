# Support Inbox

A small internal issue tracker: React + TypeScript frontend, Express + TypeScript backend, SQLite storage.

This is **not** the actual task. The app itself is the codebase you're working in — the seeded issues you'll
see in the list are just sample data. Your actual work items are in [`TICKETS.md`](./TICKETS.md).

The app has three pages: the issue list (`/`), an issue detail page (`/issues/:id`) with inline-editable
status/priority/assignee, and a new-issue form (`/issues/new`).

## Requirements

- Node.js 22.5 or newer (uses the built-in `node:sqlite` module — no native build step, no `npm install` compile issues)
- npm

## Setup (should take about 3 minutes)

```bash
npm install
npm run dev
```

This installs both workspaces and starts the backend (`http://localhost:4000`) and the frontend
(`http://localhost:5173`, proxying `/api` to the backend) together. Open `http://localhost:5173`.

The SQLite database is a file created at `server/data.sqlite` on first run, seeded with sample issues.
Delete that file and restart the server to reset it.

## Git

This is a real git repo, on `main`. There's a second branch, `pr/assigned-to-me-filter`, which one
of the tickets asks you to review — you don't need to merge or push anything, see `TICKETS.md`.

## Project layout

```
server/   Express API, node:sqlite storage
client/   React (Vite) frontend, react-router-dom for the 3 pages
```

## Scripts

- `npm run dev` — run both server and client with hot reload
- `npm run dev -w server` / `npm run dev -w client` — run just one side
