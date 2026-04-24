import os
import sys
import pathlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

# Ensure backend/ is on sys.path so analyse.py and validate.py can be imported as modules
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from analyse import router as analyse_router    # noqa: E402

# Load .env from repo root (one level up from backend/main.py)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# OpenRouter is OpenAI-compatible — only the base_url and api_key differ.
# The key is never hardcoded; it must exist in .env or the process environment.
client = OpenAI(
    api_key=os.environ.get("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
)

# Load the system prompt once at startup from backend/prompts.md.
# Reading at import time means a server restart is required to pick up edits —
# intentional: prevents mid-session prompt drift during a live conversation.
_PROMPTS_PATH = pathlib.Path(__file__).parent / "prompts.md"
SYSTEM_PROMPT = _PROMPTS_PATH.read_text(encoding="utf-8")

app = FastAPI()

# Middleware must be registered before routers so it wraps all routes including
# included ones — CORS headers must be present even on error responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyse_router)


class ChatMessage(BaseModel):
    # Mirrors the OpenAI message schema — role must be "user" or "assistant"
    role: str
    content: str


class ConversationRequest(BaseModel):
    # Full conversation history sent by the frontend each turn.
    # Sending history client-side avoids needing server-side session storage.
    messages: list[ChatMessage]


class Response(BaseModel):
    message: str
    type: str


@app.post("/chat", response_model=Response)
def chat(req: ConversationRequest):
    # Raise early if the key is missing so the error is obvious in the terminal
    if not client.api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY is not set in .env")

    completion = client.chat.completions.create(
        model="google/gemini-2.0-flash-001",
        messages=[
            # System prompt always leads — rules and guidance from prompts.md
            {"role": "system", "content": SYSTEM_PROMPT},
            # Full conversation history follows so the model has all prior context
            *[{"role": m.role, "content": m.content} for m in req.messages],
        ],
    )

    return Response(message=completion.choices[0].message.content, type="text")
