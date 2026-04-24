import axios from 'axios';

/* Points at the FastAPI dev server — change via VITE_API_URL env var for prod */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
});

/* Full message history is sent each turn — backend is stateless, so the
   frontend is the source of truth for conversation state */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  const { data } = await client.post<{ message: string }>('/chat', { messages });
  return data.message;
}

export interface Competitor {
  name: string;
  description: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
  sentiment: string;
  similarity_score?: number;
  /* Direct / Adjacent / Substitute / Graveyard / Mechanism analog */
  category?: string;
  /* Evidence capture — derived from Reddit mention analysis */
  mention_count?: number;
  engagement_score?: number;
  sentiment_split?: { positive: number; neutral: number; negative: number };
  dominant_complaint?: string;
  dominant_praise?: string;
  /* "reddit" | "both" */
  platform_split?: string;
  /* "active" | "declining" | "dead" */
  status_signal?: string;
  competitor_sources?: string[];
}

export interface Persona {
  type: string;
  pain_points: string[];
  desires: string[];
}

/* Audience-specific niche fit evaluation returned by /analyse.
   Separate from market_score — answers "do existing tools actually serve
   the specific audience this idea targets, or are they all generic?" */
export interface NicheEvaluation {
  audience: string;       // precise target audience extracted from the conversation
  niche_score: number;    // 0–10 — how underserved this audience is by existing tools
  gap_summary: string;    // why competitors structurally miss this audience, by name
  suggestions: string[];  // actionable ways to deepen niche fit, audience-specific
}

export interface AnalyseResult {
  competitors: Competitor[];
  personas: Persona[];
  differentiators: string[];
  sources: string[];
  market_score: number;
  niche_evaluation?: NicheEvaluation;
}

/* Sends the original idea + full conversation to /analyse.
   The backend runs two LLM calls + a Serper Reddit search and returns
   structured competitor and persona data. */
export async function analyse(idea: string, conversation: ChatMessage[]): Promise<AnalyseResult> {
  const { data } = await client.post<AnalyseResult>('/analyse', { idea, conversation });
  return data;
}

