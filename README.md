# Startup Idea Validator

AI-powered startup idea validator that analyses competitors, surfaces market gaps, and generates user personas from real Reddit and web data.

## What it does

You describe your startup idea through a conversational chat. The app then:

1. **Finds real competitors** — searches Reddit, Twitter/X, blogs, ProductHunt, and the App Store to identify who already exists in your space
2. **Scores the market** — calculates an opportunity score based on how dissatisfied users are with existing tools
3. **Evaluates your niche** — assesses whether any competitor actually serves your specific target audience, or whether they're all generic
4. **Surfaces differentiators** — identifies the concrete gaps between what exists and what you're building
5. **Generates user personas** — builds realistic personas from real user patterns found in the data

## Tech stack

**Frontend**
- React 19 + TypeScript
- Vite 8
- Tailwind CSS

**Backend**
- Python + FastAPI
- OpenRouter API (Gemini 2.0 Flash) for LLM calls
- Serper API for Reddit, Twitter, and blog search
- iTunes Search API for App Store review counts (no key required)

## Project structure

```
startup_idea_validator/
├── backend/
│   ├── main.py          # FastAPI app, CORS config
│   ├── analyse.py       # Full competitor research pipeline
│   ├── serper.py        # Search API client (Reddit, Twitter, blogs)
│   ├── prompts.md       # LLM prompt library
│   └── testcases.md     # Calibration examples from past runs
├── data/
│   └── testcases/       # Saved session JSONs for review and calibration
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/ui/
│   │   │   ├── ChatInterface.tsx      # Idea input + conversation
│   │   │   ├── LoadingScreen.tsx      # Analysis progress screen
│   │   │   ├── CompetitorAnalysis.tsx # Results — competitors, niche, market
│   │   │   └── PersonaAnalysis.tsx    # User personas
│   │   ├── services/api.ts            # Axios client for /analyse endpoint
│   │   └── hooks/                     # Error boundary hooks
│   └── public/
└── .gitignore
```

## Getting started

### Prerequisites
- Node.js 18+
- Python 3.13+
- An [OpenRouter](https://openrouter.ai) API key
- A [Serper](https://serper.dev) API key

### 1. Clone the repo

```bash
git clone https://github.com/prathin470/startup_idea_validator.git
cd startup_idea_validator
```

### 2. Set up environment variables

Create a `.env` file in the root:

```
OPENROUTER_API_KEY=your_key_here
SERPER_API_KEY=your_key_here
```

### 3. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install fastapi uvicorn openai python-dotenv
```

### 4. Run the backend

```bash
# From the repo root
source backend/venv/bin/activate
uvicorn backend.main:app --reload
```

Backend runs on `http://localhost:8000`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## How the research pipeline works

The backend runs a two-phase competitor research pipeline before synthesising results:

- **Phase 1** — LLM generates targeted queries anchored on your target audience and core mechanism. Reddit, Twitter, and blog searches run in parallel.
- **Phase 2** — Named competitors found in Phase 1 seed a second round of dissatisfaction queries ("alternative to X", "I switched from X") to uncover churn language and new competitors users switched to.
- **Synthesis** — All data is fed to a final LLM call that produces the competitor list, personas, niche evaluation, and differentiators. Results are sorted by App Store review count.

Each run is saved as a timestamped JSON file under `data/testcases/` for review and calibration.
