# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Insight App is a full-stack application with a React/TypeScript frontend and a Python FastAPI backend. The frontend communicates with the backend via HTTP (Axios) at the `/chat` endpoint.

## Commands

### Frontend (run from `/frontend`)

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript compile (tsc -b) then Vite bundle
npm run lint      # ESLint on all .ts/.tsx files
npm run preview   # Serve the production build locally
```

### Backend (run from repo root)

```bash
source backend/venv/bin/activate
uvicorn backend.venv.main:app --reload
```

The venv is pre-configured at `backend/venv` with Python 3.13.2.

## Architecture

### Frontend (`/frontend`)

- **Framework**: React 19 with TypeScript, bundled by Vite 8
- **React Compiler**: Enabled via `babel-plugin-react-compiler` in `vite.config.ts` — the compiler handles memoization automatically, so avoid manual `useMemo`/`useCallback` unless benchmarked
- **Entry points**: `index.html` → `src/main.tsx` → `src/App.tsx`
- **ESLint**: Flat config (`eslint.config.js`, ESLint 9.x) with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`
- **TypeScript**: Strict mode, ES2023 target, split into `tsconfig.app.json` (app code) and `tsconfig.node.json` (Vite/tooling)

### Backend (`/backend/venv/main.py`)

- **Framework**: FastAPI 0.136.0 with Uvicorn as ASGI server
- **Single endpoint**: `POST /chat` — accepts `{"message": string}`, returns `{"message": string, "type": "text"}`
- **Validation**: Pydantic v2 models for request/response schemas
- **python-dotenv** is installed but not yet wired up — use it when adding environment variables

### Data Flow

```
React component → Axios POST /chat → FastAPI handler → Pydantic response → React state update
```

## Code Comments

Write detailed, thorough comments explaining the *why* — hidden constraints, non-obvious invariants, and workarounds — not just what the code does.

## Strict Rules
- Do NOT change architecture or folder structure unless I approve
- Only modify files explicitly mentioned
- Always explain what you changed and why before showing code
- Always specify full file paths
- Keep changes and incremental
- Do NOT introduce new libraries unless asked
- ALSO VERY IMPORTANT ensure that as soon as you make a component change or a new component or any change i ask you to. Do I npm audit check i added a custom command called ..audit.md in commands = run that after you are done.
- After you impelment a change always remember to do git commit

When you respond, always use this format:
1. What changed
2. Why it changed
3. File paths affected
4. Code 